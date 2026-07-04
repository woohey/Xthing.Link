/**
 * webhook-receiver.mjs — 接收 PocketBase webhook，触发 npm run build
 *
 * Usage:
 *   WEBHOOK_PORT=4322 WEBHOOK_SECRET=shared_secret node scripts/webhook-receiver.mjs
 *
 * PB 后台 webhook 配置:
 *   - Collection: posts
 *   - Event: create / update / delete
 *   - URL: http://127.0.0.1:4322/
 *   - Method: POST
 *   - Header: X-Webhook-Secret = shared_secret
 */

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PORT = parseInt(process.env.WEBHOOK_PORT || '4322', 10);
const SECRET = process.env.WEBHOOK_SECRET || '';

let building = false;
let lastBuild = 0;

function log(msg) {
  console.log(`[webhook ${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function runBuild() {
  const now = Date.now();
  // Debounce: ignore bursts within 3 seconds
  if (now - lastBuild < 3000) {
    log('debounced (build too recent)');
    return;
  }
  lastBuild = now;

  log('starting build...');
  const child = spawn('npm', ['run', 'build'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (d) => { stdout += d; });
  child.stderr.on('data', (d) => { stderr += d; });

  child.on('close', (code) => {
    if (code === 0) {
      log(`build success (${stdout.split('\n').filter(Boolean).length} lines)`);
    } else {
      log(`build FAILED (exit ${code}): ${stderr.slice(-300)}`);
    }
    building = false;
  });

  child.on('error', (err) => {
    log(`build spawn error: ${err.message}`);
    building = false;
  });
}

const server = createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405).end('Method Not Allowed');
    return;
  }

  // Optional secret check
  if (SECRET) {
    const provided = req.headers['x-webhook-secret'] || '';
    if (provided !== SECRET) {
      log('rejected: secret mismatch');
      res.writeHead(403).end('Forbidden');
      return;
    }
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    try {
      const payload = JSON.parse(body);
      const collection = payload.collection || payload.collectionName || '';
      const action = payload.action || payload.event || '';

      log(`received: ${collection} / ${action}`);

      // Only respond to posts collection changes
      if (collection !== 'posts') {
        log(`skipped (collection=${collection})`);
        res.writeHead(200).end(JSON.stringify({ status: 'skipped', reason: 'not posts collection' }));
        return;
      }

      if (building) {
        res.writeHead(200).end(JSON.stringify({ status: 'queued', message: 'build already in progress' }));
        return;
      }

      building = true;
      res.writeHead(200).end(JSON.stringify({ status: 'ok', message: 'build triggered' }));

      // Defer build to next tick so response is sent first
      setImmediate(runBuild);
    } catch (err) {
      log(`parse error: ${err.message}`);
      res.writeHead(400).end(JSON.stringify({ status: 'error', message: err.message }));
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  log(`listening on 127.0.0.1:${PORT}${SECRET ? ' (auth enabled)' : ''}`);
});
