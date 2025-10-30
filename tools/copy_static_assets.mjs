import { cp, stat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

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

  // Build a Safari 13 friendly bundle of main.js + scenes into dist/main.es2018.js
  const mainSourcePath = resolve(ROOT, 'main.js');
  let mainSource = await readFile(mainSourcePath, 'utf8');
  // Strip version query params to help esbuild resolve local modules
  mainSource = mainSource
    .replace(/\.js\?v=[0-9]+/g, '.js');

  const outFile = resolve(DIST, 'main.es2018.js');
  await esbuild.build({
    stdin: {
      contents: mainSource,
      sourcefile: 'main.js',
      resolveDir: ROOT
    },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2018', 'safari13'],
    outfile: outFile,
    sourcemap: false,
    logLevel: 'silent'
  });

  // Teach index.html to import the transpiled entry (cache-busted)
  const indexPath = resolve(DIST, 'index.html');
  let html = await readFile(indexPath, 'utf8');
  html = html.replace(/import\(['\"]\.\/assets\/main-[^'\"]+['\"]\)/, "import('./main.es2018.js?v=20241203')");
  await writeFile(indexPath, html, 'utf8');
}

main().catch(error => {
  console.error('❌ Failed to copy static assets into dist:', error);
  process.exitCode = 1;
});
