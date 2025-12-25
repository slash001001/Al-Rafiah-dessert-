import fs from 'fs';
import path from 'path';

const packDir = path.join(process.cwd(), 'public', 'art', 'pack_v1');
const manifestPath = path.join(packDir, 'manifest.json');
const mapping = {
  'bg_sky_1920x1080.png': 'bg_sky',
  'dune_far_2048x512.png': 'dune_far',
  'dune_mid_2048x512.png': 'dune_mid',
  'dune_near_2048x512.png': 'dune_near',
  'ground_road_512x512.png': 'ground_road',
  'ground_dunes_512x512.png': 'ground_dunes',
  'veh_gmc_256x128.png': 'veh_gmc',
  'veh_prado_256x128.png': 'veh_prado',
  'veh_shadow_256x128.png': 'veh_shadow',
  'poi_station_128x128.png': 'poi_station',
  'poi_shop_128x128.png': 'poi_shop',
  'poi_restaurant_128x128.png': 'poi_restaurant',
  'icon_salt_64x64.png': 'icon_salt',
  'icon_water_64x64.png': 'icon_water',
  'icon_charcoal_64x64.png': 'icon_charcoal',
  'icon_lighter_64x64.png': 'icon_lighter',
  'icon_hummus_64x64.png': 'icon_hummus',
  'event_helicopter_256x128.png': 'event_helicopter',
  'event_camel_256x128.png': 'event_camel',
  'event_dog_96x64.png': 'event_dog',
  'finish_flag_128x128.png': 'finish_flag'
};

fs.mkdirSync(packDir, { recursive: true });

const assets = {};
for (const [filename, key] of Object.entries(mapping)) {
  const full = path.join(packDir, filename);
  if (fs.existsSync(full)) {
    assets[key] = path.posix.join('art/pack_v1', filename);
  }
}

const manifest = { version: 1, assets };
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`art pack manifest: ${Object.keys(assets).length} assets`);
