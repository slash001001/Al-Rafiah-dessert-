#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const dist = resolve(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const entry of ['index.html', 'src', 'assets']) {
  const from = resolve(root, entry);
  const to = resolve(dist, entry);
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}
writeFileSync(resolve(dist, '.nojekyll'), '');
writeFileSync(resolve(dist, 'BUILD.txt'), `Alrafyah Game static build\nGenerated: ${new Date().toISOString()}\n`);
console.log('Build complete: dist/');
