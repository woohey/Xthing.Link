/**
 * publish-from-obsidian.mjs — 从 Obsidian 发布文章到 PocketBase
 *
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8090 \
 *   PB_ADMIN_EMAIL=admin@xthing.link \
 *   PB_ADMIN_PASS=password \
 *   node scripts/publish-from-obsidian.mjs /path/to/post.md
 *
 * 在 Obsidian QuickAdd 中配置:
 *   - 选 "Macro" → "Script" 类型
 *   - 脚本路径指向本文件
 *   - 设置环境变量 POCKETBASE_URL, PB_ADMIN_EMAIL, PB_ADMIN_PASS
 *
 * 行为:
 *   - 解析文件的 frontmatter + Markdown 正文
 *   - 如果 PB 中已存在同 slug 的文章 → PATCH 更新
 *   - 如果不存在 → POST 新建
 *   - 发布后 PB webhook 自动触发网站 build
 */

import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const PB_URL = (process.env.POCKETBASE_URL || 'http://127.0.0.1:8090').replace(/\/+$/, '');
const PB_API = `${PB_URL}/api`;
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASS = process.env.PB_ADMIN_PASS;

// ---------------------------------------------------------------------------
// Frontmatter parser (same as migrate-to-pb.mjs)
// ---------------------------------------------------------------------------

function parseFrontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw.trim() };

  const yamlBlock = match[1];
  const body = match[2].trim();
  const data = {};
  let currentKey = null;
  let inArray = false;
  let arrayValues = [];

  for (const line of yamlBlock.split('\n')) {
    const arrMatch = line.match(/^\s+-\s+(.+)$/);
    if (arrMatch && currentKey) {
      inArray = true;
      let val = arrMatch[1].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      arrayValues.push(val);
      continue;
    }

    if (inArray && currentKey) {
      data[currentKey] = arrayValues;
      arrayValues = [];
      inArray = false;
    }

    const kv = line.match(/^(\w[\w-]*)\s*:\s*(.+)?$/);
    if (kv) {
      currentKey = kv[1];
      const rawVal = (kv[2] || '').trim();
      if (rawVal === '' || rawVal === undefined) { arrayValues = []; continue; }
      if (rawVal === 'true') { data[currentKey] = true; currentKey = null; continue; }
      if (rawVal === 'false') { data[currentKey] = false; currentKey = null; continue; }
      if (/^-?\d+(\.\d+)?$/.test(rawVal)) { data[currentKey] = Number(rawVal); currentKey = null; continue; }
      if (/^\d{4}-\d{2}-\d{2}/.test(rawVal)) { data[currentKey] = rawVal; currentKey = null; continue; }
      let val = rawVal;
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      data[currentKey] = val;
      currentKey = null;
      continue;
    }

    if (line.trim() === '' && inArray && currentKey) {
      data[currentKey] = arrayValues;
      arrayValues = [];
      inArray = false;
      currentKey = null;
    }
  }

  if (inArray && currentKey) data[currentKey] = arrayValues;
  return { data, body };
}

// ---------------------------------------------------------------------------
// PB helpers
// ---------------------------------------------------------------------------

async function getAdminToken() {
  if (!ADMIN_EMAIL || !ADMIN_PASS) {
    throw new Error('Set PB_ADMIN_EMAIL and PB_ADMIN_PASS env vars');
  }
  const res = await fetch(`${PB_API}/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  const data = await res.json();
  return data.token;
}

async function findPostBySlug(token, slug) {
  const qs = `filter=(slug='${encodeURIComponent(slug)}')`;
  const res = await fetch(`${PB_API}/collections/posts/records?perPage=1&${qs}`, {
    headers: { 'Authorization': token },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.items?.[0] || null;
}

async function createPost(token, record) {
  const res = await fetch(`${PB_API}/collections/posts/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify(record),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`POST failed (${res.status}): ${err.slice(0, 300)}`);
  }
  return res.json();
}

async function updatePost(token, id, record) {
  const res = await fetch(`${PB_API}/collections/posts/records/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify(record),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PATCH failed (${res.status}): ${err.slice(0, 300)}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/publish-from-obsidian.mjs <path-to-post.md>');
    process.exit(1);
  }

  console.log(`[publish] Reading ${filePath}...`);
  const raw = await readFile(filePath, 'utf-8');
  const { data: fm, body } = parseFrontmatter(raw);

  const slug = fm.slug || basename(filePath, '.md');
  const title = fm.title || slug;
  const status = fm.status || (fm.draft === true ? 'draft' : 'published');

  console.log(`[publish]   title: "${title}"`);
  console.log(`[publish]   slug:  "${slug}"`);
  console.log(`[publish]   status: ${status}`);

  const record = {
    title,
    slug,
    content: body,
    description: fm.description || fm.summary || '',
    pubDate: fm.pubDate ? new Date(fm.pubDate).toISOString() : new Date().toISOString(),
    updatedDate: new Date().toISOString(),
    tags: fm.tags || [],
    series: fm.series || '',
    featured: fm.featured === true,
    status,
    source: fm.source || 'obsidian',
  };

  console.log('[publish] Authenticating with PocketBase...');
  const token = await getAdminToken();

  console.log(`[publish] Looking up existing post by slug "${slug}"...`);
  const existing = await findPostBySlug(token, slug);

  if (existing) {
    console.log(`[publish] Updating existing post (id=${existing.id})...`);
    await updatePost(token, existing.id, record);
    console.log('[publish] ✓ Updated!');
  } else {
    console.log('[publish] Creating new post...');
    const result = await createPost(token, record);
    console.log(`[publish] ✓ Created! (id=${result.id})`);
  }

  console.log('[publish] Done. PB webhook will trigger site build shortly.');
}

main().catch(err => {
  console.error('[publish] ERROR:', err.message);
  process.exit(1);
});
