/**
 * sync-from-pb.mjs — PocketBase → Astro content collection .md files
 *
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8090 node scripts/sync-from-pb.mjs
 *
 * Behaviour:
 *   1. Fetch published posts + all projects from PB API
 *   2. Wipe and regenerate src/content/blog/*.md and src/content/projects/*.md
 *   3. Exit 0 on success, non-zero on failure (so astro build aborts)
 */

import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PB_URL = (process.env.POCKETBASE_URL || 'http://127.0.0.1:8090').replace(/\/+$/, '');
const PB_API = `${PB_URL}/api`;

const BLOG_DIR = join(ROOT, 'src', 'content', 'blog');
const PROJECTS_DIR = join(ROOT, 'src', 'content', 'projects');
const PROJECT_GIT_PATHS = {
  'pet-necklace': [
    'src/pages/demos/pet-necklace',
    'src/components/PetNecklaceDashboard.tsx',
    'src/components/PetNecklaceMap.tsx',
    'src/lib/pet-necklace-api.ts',
    'public/mock/pet-necklace',
    'docs/plans/pet-necklace-api-contract.md',
    'docs/plans/pet-necklace-对接开发材料.md',
  ],
};
const PROJECT_DATE_OVERRIDES = {
  '8bees': {
    startedAt: '2015-01-01',
    updatedAt: '2016-12-31',
  },
  aquasmart: {
    startedAt: '2018-01-01',
    updatedAt: '2020-12-31',
  },
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function jsonBlock(obj, indent = 2) {
  return JSON.stringify(obj, null, indent);
}

/** rough CJK-aware word count for reading time */
function estimateWords(text) {
  if (!text) return 0;
  const cjk = (text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu) || []).length;
  const latin = text
    .replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu, '')
    .split(/\s+/)
    .filter(Boolean).length;
  return cjk + latin;
}

function readingTime(text) {
  const words = estimateWords(text);
  return Math.max(1, Math.round(words / 300)); // 300 wpm, minimum 1 min
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10); // YYYY-MM-DD
}

function gitLogDate(paths, args) {
  if (!paths?.length) return '';

  try {
    return execFileSync('git', [...args, '--', ...paths], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim().split('\n').filter(Boolean)[0] || '';
  } catch {
    return '';
  }
}

function projectGitDates(slug) {
  if (PROJECT_DATE_OVERRIDES[slug]) return PROJECT_DATE_OVERRIDES[slug];

  const paths = PROJECT_GIT_PATHS[slug];
  if (!paths) return {};

  return {
    startedAt: gitLogDate(paths, ['log', '--reverse', '--format=%aI']),
    updatedAt: gitLogDate(paths, ['log', '-1', '--format=%aI']),
  };
}

function escapeYamlValue(value) {
  if (typeof value === 'string') {
    if (/[#{&*!|>'"%@`]/.test(value) || /:\s/.test(value)) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  return value;
}

// PB collections may use either `json` type (returns array) or `text` type
// (returns the raw string we wrote). When syncing from a server PB whose
// tags/stack fields are text, callers store JSON-serialized arrays; this
// helper parses them back into arrays for the YAML frontmatter.
function normalizeListField(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }
}

function rawProjectBody(proj) {
  return typeof proj.description === 'string' ? proj.description : '';
}

function stripHtml(value) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanProjectBody(proj) {
  return rawProjectBody(proj)
    .replace(/^---[\s\S]*?---\n?/, '')
    .replace(/<[^>]*data-summary-only=["']?true["']?[^>]*>[\s\S]*?<\/[^>]+>/gi, '')
    .replace(/<p>(?:\s|&nbsp;|\u00a0|<br\s*\/?>)*<\/p>/gi, '')
    .trim();
}

function projectSummary(proj) {
  const summaryOnly = rawProjectBody(proj).match(/<[^>]*data-summary-only=["']?true["']?[^>]*>([\s\S]*?)<\/[^>]+>/i);
  const source = summaryOnly?.[1] ?? cleanProjectBody(proj).split(/\n\s*\n/)[0];

  return stripHtml(source)
    .split(/\n\s*\n/)[0]
    .slice(0, 200);
}

// ---------------------------------------------------------------------------
// PocketBase fetch helpers
// ---------------------------------------------------------------------------

async function pbFetch(path) {
  const url = `${PB_API}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`PB API ${res.status} on ${url}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function fetchAll(collection, filter = '') {
  const pageSize = 500;
  const qs = [`perPage=${pageSize}`];
  if (filter) qs.push(`filter=(${encodeURIComponent(filter)})`);

  const data = await pbFetch(`/collections/${collection}/records?${qs.join('&')}`);
  // If there are more pages, fetch them too (unlikely, but safe)
  if (data.totalPages > 1) {
    const all = [...data.items];
    for (let p = 2; p <= data.totalPages; p++) {
      const page = await pbFetch(`/collections/${collection}/records?${qs.join('&')}&page=${p}`);
      all.push(...page.items);
    }
    return all;
  }
  return data.items;
}

// ---------------------------------------------------------------------------
// Markdown generation
// ---------------------------------------------------------------------------

function buildPostFrontmatter(post) {
  const tags = normalizeListField(post.tags);
  const content = post.content || '';

  const fm = {
    title: post.title || 'Untitled',
    description: post.description || '',
    pubDate: formatDate(post.pubDate),
    updatedDate: formatDate(post.updatedDate) || formatDate(post.pubDate),
    draft: false,
    tags,
    series: post.series || undefined,
    featured: post.featured === true || undefined,
    summary: post.description || undefined,
    source: post.source || 'obsidian',
    status: post.status || 'published',
    readingTime: readingTime(content),
    cover: post.cover || undefined,
  };

  // Remove undefined values for cleaner YAML
  Object.keys(fm).forEach(k => { if (fm[k] === undefined) delete fm[k]; });

  return fm;
}

function buildProjectFrontmatter(proj) {
  const stack = normalizeListField(proj.stack);
  const slug = proj.slug || proj.id;
  const gitDates = projectGitDates(slug);

  const fm = {
    title: proj.name || proj.title || 'Untitled',
    description: projectSummary(proj),
    status: proj.status || 'idea',
    deployType: proj.deployType || 'planned',
    order: proj.order ?? 1000,
    tags: normalizeListField(proj.tags),
    stack,
    featured: proj.featured === true || undefined,
    repoUrl: proj.repoUrl || undefined,
    demoUrl: proj.demoUrl || undefined,
    startedAt: formatDate(gitDates.startedAt) || formatDate(proj.created),
    updatedAt: formatDate(gitDates.updatedAt) || formatDate(proj.updated),
  };

  Object.keys(fm).forEach(k => { if (fm[k] === undefined || fm[k] === '') delete fm[k]; });

  return fm;
}

function frontmatterToString(fm) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fm)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      if (value.length === 0) {
        lines.push('  []');
      } else {
        value.forEach(item => lines.push(`  - ${escapeYamlValue(String(item))}`));
      }
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'string') {
      if (value.includes('\n')) {
        lines.push(`${key}: |-`);
        value.split('\n').forEach(line => lines.push(`  ${line}`));
      } else {
        lines.push(`${key}: ${escapeYamlValue(value)}`);
      }
    }
  }
  lines.push('---', '');
  return lines.join('\n');
}

function buildPostMarkdown(post) {
  const fm = buildPostFrontmatter(post);
  const yaml = frontmatterToString(fm);
  const content = post.content || '';
  return yaml + content.trim() + '\n';
}

function buildProjectMarkdown(proj) {
  const fm = buildProjectFrontmatter(proj);
  const yaml = frontmatterToString(fm);
  const cleanBody = cleanProjectBody(proj);
  return yaml + (cleanBody || proj.name || '') + '\n';
}

// ---------------------------------------------------------------------------
// file system
// ---------------------------------------------------------------------------

async function cleanDir(dir) {
  try {
    const files = await readdir(dir);
    await Promise.all(
      files
        .filter(f => f.endsWith('.md'))
        .map(f => unlink(join(dir, f)))
    );
  } catch {
    // directory doesn't exist or is empty — fine
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  console.log('[sync] Fetching posts from PocketBase...');
  const posts = await fetchAll('posts', 'status="published"');
  console.log(`[sync]   → ${posts.length} published posts`);

  console.log('[sync] Fetching projects from PocketBase...');
  const projects = await fetchAll('projects');
  console.log(`[sync]   → ${projects.length} projects`);

  // Clean and regenerate
  console.log('[sync] Ensuring content directories exist...');
  await mkdir(BLOG_DIR, { recursive: true });
  await mkdir(PROJECTS_DIR, { recursive: true });

  console.log('[sync] Cleaning content directories...');
  await cleanDir(BLOG_DIR);
  await cleanDir(PROJECTS_DIR);

  let writtenPosts = 0;
  let writtenProjects = 0;

  for (const post of posts) {
    const slug = post.slug || post.id;
    if (!slug) {
      console.warn('[sync] WARNING: post has no slug, skipping');
      continue;
    }
    const md = buildPostMarkdown(post);
    const filePath = join(BLOG_DIR, `${slug}.md`);
    await writeFile(filePath, md, 'utf-8');
    writtenPosts++;
  }

  for (const proj of projects) {
    const slug = proj.slug || proj.id;
    if (!slug) {
      console.warn('[sync] WARNING: project has no slug, skipping');
      continue;
    }
    const md = buildProjectMarkdown(proj);
    const filePath = join(PROJECTS_DIR, `${slug}.md`);
    await writeFile(filePath, md, 'utf-8');
    writtenProjects++;
  }

  console.log(`[sync] Done: ${writtenPosts} posts, ${writtenProjects} projects written`);
}

main().catch(err => {
  console.error('[sync] FATAL:', err.message);
  process.exit(1);
});
