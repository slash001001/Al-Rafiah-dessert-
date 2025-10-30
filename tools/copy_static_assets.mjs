import { cp, stat, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');

// Folders that contain JS modules imported by the built main chunk (in dist/assets)
const moduleDirs = ['scenes', 'systems', 'physics', 'game'];

// Other static assets that should live at site root
const staticItems = [
  'main.js',
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

async function copyItem(item, destBase = DIST) {
  const source = resolve(ROOT, item);
  if (!(await pathExists(source))) {
    return;
  }

  const destination = resolve(destBase, item);
  await ensureParentDir(destination);
  await cp(source, destination, { recursive: true });
}

async function main() {
  // Copy module directories under dist/assets so relative imports resolve
  const assetsBase = resolve(DIST, 'assets');
  await mkdir(assetsBase, { recursive: true });
  for (const dir of moduleDirs) {
    await copyItem(dir, assetsBase);
  }

  // Copy static items at site root
  for (const item of staticItems) {
    await copyItem(item, DIST);
  }
}

main().catch(error => {
  console.error('❌ Failed to copy static assets into dist:', error);
  process.exitCode = 1;
});
