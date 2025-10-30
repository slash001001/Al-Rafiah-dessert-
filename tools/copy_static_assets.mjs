import { cp, stat, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');

const assetsToCopy = [
  'main.js',
  'scenes',
  'systems',
  'physics',
  'game',
  'levels',
  'assets',
  'config',
  'config.json',
  'i18n',
  'styles.css',
  'manifest.webmanifest',
  'sw.js',
  'icons',
];

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureParentDir(path) {
  const parent = dirname(path);
  await mkdir(parent, { recursive: true });
}

async function copyItem(item) {
  const source = resolve(ROOT, item);
  if (!(await pathExists(source))) {
    return;
  }

  const destination = resolve(DIST, item);
  await ensureParentDir(destination);
  await cp(source, destination, { recursive: true });
}

async function main() {
  for (const item of assetsToCopy) {
    await copyItem(item);
  }
}

main().catch(error => {
  console.error('❌ Failed to copy static assets into dist:', error);
  process.exitCode = 1;
});
