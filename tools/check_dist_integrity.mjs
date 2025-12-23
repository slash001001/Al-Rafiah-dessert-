import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function scanFile(path) {
  if (path.includes('phaser')) return;
  const txt = readFileSync(path, 'utf8');
  if (txt.includes("from 'phaser'") || txt.includes('from "phaser"')) {
    fail(`Found raw phaser import in ${path}`);
  }
  if (txt.includes('createEmitter')) {
    fail(`Found deprecated createEmitter usage in ${path}`);
  }
  if (txt.includes('serviceWorker') || txt.includes('navigator.serviceWorker')) {
    fail(`Found service worker reference in ${path}`);
  }
}

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.html')) scanFile(full);
  }
}

walk(dist);
console.log('dist integrity OK');
