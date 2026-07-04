/**
 * migrate-to-pb.mjs — One-time: import v1 .md content into PocketBase
 *
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8090 \
 *   PB_ADMIN_EMAIL=admin@xthing.link \
 *   PB_ADMIN_PASS=TempPass123! \
 *   node scripts/migrate-to-pb.mjs
 *
 * After migration, the sync-from-pb.mjs script becomes the authoritative source
 * for content, and the original .md files can be gitignored.
 */

import { readFile, readdir } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const PB_API = `${PB_URL}/api`;

const BLOG_DIR = join(ROOT, 'src', 'content', 'blog');
const PROJECTS_DIR = join(ROOT, 'src', 'content', 'projects');

// ---------------------------------------------------------------------------
// PB auth
// ---------------------------------------------------------------------------

async function getAdminToken() {
  const email = process.env.PB_ADMIN_EMAIL;
  const pass = process.env.PB_ADMIN_PASS;
  if (!email || !pass) {
    throw new Error('Set PB_ADMIN_EMAIL and PB_ADMIN_PASS env vars');
  }
  const res = await fetch(`${PB_API}/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password: pass }),
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  const data = await res.json();
  return data.token;
}

// ---------------------------------------------------------------------------
// Frontmatter parser (simple, handles the project's YAML subset)
// ---------------------------------------------------------------------------

function parseFrontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const yamlBlock = match[1];
  const body = match[2].trim();
  const data = {};
  let currentKey = null;
  let inArray = false;
  let arrayValues = [];

  for (const line of yamlBlock.split('\n')) {
    // Array item
    const arrMatch = line.match(/^\s+-\s+(.+)$/);
    if (arrMatch && currentKey) {
      inArray = true;
      let val = arrMatch[1].trim();
      // Remove quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      arrayValues.push(val);
      continue;
    }

    // Flush pending array
    if (inArray && currentKey) {
      data[currentKey] = arrayValues;
      arrayValues = [];
      inArray = false;
    }

    // Key: value
    const kv = line.match(/^(\w[\w-]*)\s*:\s*(.+)?$/);
    if (kv) {
      currentKey = kv[1];
      const rawVal = (kv[2] || '').trim();

      if (rawVal === '' || rawVal === undefined) {
        // might start an array
        arrayValues = [];
        currentKey = currentKey;
        continue;
      }

      // Boolean
      if (rawVal === 'true') { data[currentKey] = true; currentKey = null; continue; }
      if (rawVal === 'false') { data[currentKey] = false; currentKey = null; continue; }

      // Number
      if (/^-?\d+(\.\d+)?$/.test(rawVal)) {
        data[currentKey] = Number(rawVal);
        currentKey = null;
        continue;
      }

      // Date
      if (/^\d{4}-\d{2}-\d{2}/.test(rawVal)) {
        data[currentKey] = rawVal;
        currentKey = null;
        continue;
      }

      // URL or plain string
      let val = rawVal;
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      data[currentKey] = val;
      currentKey = null;
      continue;
    }

    // Empty line — flush any pending array
    if (line.trim() === '' && inArray && currentKey) {
      data[currentKey] = arrayValues;
      arrayValues = [];
      inArray = false;
      currentKey = null;
    }
  }

  // Flush last array
  if (inArray && currentKey) {
    data[currentKey] = arrayValues;
  }

  return { data, body };
}

// ---------------------------------------------------------------------------
// Transform frontmatter → PB record
// ---------------------------------------------------------------------------

function blogToPB(fm, filename) {
  const slug = fm.slug || basename(filename, '.md');
  return {
    title: fm.title || slug,
    slug,
    content: fm.body || '',
    description: fm.description || fm.summary || '',
    pubDate: fm.pubDate ? new Date(fm.pubDate).toISOString() : new Date().toISOString(),
    updatedDate: fm.updatedDate ? new Date(fm.updatedDate).toISOString() : undefined,
    tags: fm.tags || [],
    series: fm.series || '',
    featured: fm.featured === true,
    status: fm.draft === true ? 'draft' : (fm.status || 'published'),
    source: fm.source || 'obsidian',
  };
}

function projectToPB(fm) {
  return {
    name: fm.title || 'Untitled',
    slug: fm.demoSlug || '',
    description: fm.body || fm.description || '',
    status: fm.status || 'idea',
    deployType: fm.demoSlug ? 'embedded' : (fm.repoUrl ? 'github-only' : 'planned'),
    repoUrl: fm.repoUrl || '',
    demoUrl: fm.demoUrl || '',
    stack: fm.stack || [],
    order: fm.order ?? 1000,
    featured: fm.featured === true,
    tags: fm.tags || [],
  };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  console.log('[migrate] Authenticating...');
  const token = await getAdminToken();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': token,
  };

  // --- Migrate blog posts ---
  const blogFiles = (await readdir(BLOG_DIR)).filter(f => f.endsWith('.md'));
  console.log(`[migrate] Found ${blogFiles.length} blog posts`);

  let importedPosts = 0;
  for (const file of blogFiles) {
    const raw = await readFile(join(BLOG_DIR, file), 'utf-8');
    const { data: fm, body } = parseFrontmatter(raw);
    fm.body = body;
    const record = blogToPB(fm, file);

    const res = await fetch(`${PB_API}/collections/posts/records`, {
      method: 'POST', headers, body: JSON.stringify(record),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[migrate]   FAIL ${file}: ${res.status} ${err.slice(0, 150)}`);
      continue;
    }
    importedPosts++;
    console.log(`[migrate]   OK  ${file}`);
  }

  // --- Migrate projects ---
  const projFiles = (await readdir(PROJECTS_DIR)).filter(f => f.endsWith('.md'));
  console.log(`[migrate] Found ${projFiles.length} projects`);

  let importedProjects = 0;
  for (const file of projFiles) {
    const raw = await readFile(join(PROJECTS_DIR, file), 'utf-8');
    const { data: fm, body } = parseFrontmatter(raw);
    fm.body = body;
    const record = projectToPB(fm);

    // Ensure unique slug
    const slug = record.slug || basename(file, '.md');
    record.slug = slug;

    const res = await fetch(`${PB_API}/collections/projects/records`, {
      method: 'POST', headers, body: JSON.stringify(record),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[migrate]   FAIL ${file}: ${res.status} ${err.slice(0, 150)}`);
      continue;
    }
    importedProjects++;
    console.log(`[migrate]   OK  ${file} → slug="${slug}"`);
  }

  console.log(`\n[migrate] Done: ${importedPosts} posts, ${importedProjects} projects imported`);
}

main().catch(err => {
  console.error('[migrate] FATAL:', err.message);
  process.exit(1);
});
