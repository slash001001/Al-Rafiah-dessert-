import fs from 'fs';
import path from 'path';

const distDir = path.join(process.cwd(), 'dist');
const banList = [
  "from 'phaser'",
  'from "phaser"',
  'createEmitter',
  'ParticleEmitter',
  'serviceWorker',
  'workbox',
  'unpkg',
  'jsdelivr',
  'cdn.jsdelivr',
  'cdn.phaser',
  '/src/'
];

let bad = false;
function scan(file) {
  const stat = fs.statSync(file);
  if (stat.isDirectory()) {
    fs.readdirSync(file).forEach((f) => scan(path.join(file, f)));
  } else {
    const fname = path.basename(file);
    if (/vendor/i.test(fname)) return; // skip vendor chunk (phaser internals)
    const text = fs.readFileSync(file, 'utf8');
    banList.forEach((p) => {
      if (text.includes(p)) {
        console.error(`FAIL: found banned string "${p}" in ${file}`);
        bad = true;
      }
    });
  }
}

if (!fs.existsSync(distDir)) {
  console.error('dist not found');
  process.exit(1);
}
scan(distDir);
if (bad) process.exit(1);
console.log('dist integrity: OK');
