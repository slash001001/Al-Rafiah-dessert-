#!/usr/bin/env node
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { createServer } from 'node:http';

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const root = resolve(getArg('--root', '.'));
const port = Number(getArg('--port', process.env.PORT || '5173'));
const host = '0.0.0.0';
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

function safePath(urlPath) {
  const cleanUrl = decodeURIComponent(urlPath.split('?')[0]).replace(/\\/g, '/');
  const normalized = cleanUrl === '/' ? '/index.html' : cleanUrl;
  const filePath = resolve(join(root, normalized));
  if (!filePath.startsWith(root)) return null;
  return filePath;
}

const server = createServer((req, res) => {
  const filePath = safePath(req.url || '/');
  if (!filePath) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  let target = filePath;
  if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');
  if (!existsSync(target)) {
    const fallback = join(root, 'index.html');
    if (existsSync(fallback)) target = fallback;
    else { res.writeHead(404); res.end('Not found'); return; }
  }
  const type = mime[extname(target).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': type.includes('html') ? 'no-store' : 'public, max-age=31536000, immutable'
  });
  createReadStream(target).pipe(res);
});

server.listen(port, host, () => {
  console.log(`Alrafyah game server running at http://localhost:${port}`);
  console.log(`Serving: ${root}`);
});
