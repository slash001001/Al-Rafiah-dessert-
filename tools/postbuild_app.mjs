import fs from 'fs';
import path from 'path';

const distDir = path.join(process.cwd(), 'dist', 'assets');
const files = fs.readdirSync(distDir).filter((f) => f.startsWith('index-dev-') && f.endsWith('.js'));
if (files.length === 0) {
  console.error('no main bundle found');
  process.exit(1);
}
const latest = files.sort((a, b) => fs.statSync(path.join(distDir, b)).mtimeMs - fs.statSync(path.join(distDir, a)).mtimeMs)[0];
const src = path.join(distDir, latest);
const dest = path.join(distDir, 'app.js');
fs.copyFileSync(src, dest);
console.log(`copied ${latest} -> app.js`);
