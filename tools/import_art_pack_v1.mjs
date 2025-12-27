import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const srcDir = path.join(process.cwd(), 'art_src', 'pack_v1_raw');
const outDir = path.join(process.cwd(), 'public', 'art', 'pack_v1');
const statusPath = path.join(process.cwd(), 'docs', 'ART_PACK_V1_STATUS.md');

const files = {
  'bg_sky_1920x1080.png': [1920, 1080],
  'dune_far_2048x512.png': [2048, 512],
  'dune_mid_2048x512.png': [2048, 512],
  'dune_near_2048x512.png': [2048, 512],
  'ground_road_512x512.png': [512, 512],
  'ground_dunes_512x512.png': [512, 512],
  'veh_gmc_256x128.png': [256, 128],
  'veh_prado_256x128.png': [256, 128],
  'veh_shadow_256x128.png': [256, 128],
  'poi_station_128x128.png': [128, 128],
  'poi_shop_128x128.png': [128, 128],
  'poi_restaurant_128x128.png': [128, 128],
  'icon_salt_64x64.png': [64, 64],
  'icon_water_64x64.png': [64, 64],
  'icon_charcoal_64x64.png': [64, 64],
  'icon_lighter_64x64.png': [64, 64],
  'icon_hummus_64x64.png': [64, 64],
  'event_helicopter_256x128.png': [256, 128],
  'event_camel_256x128.png': [256, 128],
  'event_dog_96x64.png': [96, 64],
  'finish_flag_128x128.png': [128, 128]
};

fs.mkdirSync(srcDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const haveSips = (() => {
  try {
    execFileSync('sips', ['-h'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

const imported = [];
const missing = [];

for (const [filename, [w, h]] of Object.entries(files)) {
  const src = path.join(srcDir, filename);
  const dest = path.join(outDir, filename);
  if (fs.existsSync(src)) {
    try {
      if (haveSips) {
        execFileSync('sips', ['-z', String(h), String(w), '-s', 'format', 'png', src, '--out', dest], { stdio: 'ignore' });
      } else {
        fs.copyFileSync(src, dest);
        console.warn(`sips missing; copied as-is: ${filename}`);
      }
      imported.push(filename);
    } catch (err) {
      console.warn(`import failed for ${filename}: ${err.message}`);
    }
  } else {
    missing.push(filename);
  }
}

const status = [];
status.push('# Art Pack v1 Status');
status.push('');
status.push(`Imported: ${imported.length}`);
imported.forEach((f) => status.push(`- ✅ ${f}`));
status.push('');
status.push(`Missing: ${missing.length}`);
missing.forEach((f) => status.push(`- ❌ ${f}`));
fs.writeFileSync(statusPath, status.join('\n'));

console.log(`art import complete. imported ${imported.length}, missing ${missing.length}`);
