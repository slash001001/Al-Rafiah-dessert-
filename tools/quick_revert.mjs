import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const flagsPath = path.resolve(__dirname, '..', 'config', 'rafiyah.flags.json');

try {
  const raw = fs.readFileSync(flagsPath, 'utf8');
  const flags = JSON.parse(raw);
  Object.keys(flags).forEach(key => {
    if (typeof flags[key] === 'boolean') {
      flags[key] = false;
    }
  });
  fs.writeFileSync(flagsPath, JSON.stringify(flags, null, 2));
  console.log('All stabilization flags disabled. Revert complete.');
} catch (err) {
  console.error('Failed to toggle flags', err);
  process.exitCode = 1;
}
