import Phaser from 'phaser';
import { ArtKeys } from './ArtKeys';

const files: Record<string, string> = {
  [ArtKeys.SKY_GRAD]: 'bg_sky.png',
  [ArtKeys.DUNE_L1]: 'dune_l1.png',
  [ArtKeys.DUNE_L2]: 'dune_l2.png',
  [ArtKeys.DUNE_L3]: 'dune_l3.png',
  [ArtKeys.ROAD_TILE]: 'road_tile.png',
  [ArtKeys.POI_STATION]: 'poi_station.png',
  [ArtKeys.POI_SHOP]: 'poi_shop.png',
  [ArtKeys.POI_RESTAURANT]: 'poi_restaurant.png',
  [ArtKeys.ICON_SALT]: 'icon_salt.png',
  [ArtKeys.ICON_WATER]: 'icon_water.png',
  [ArtKeys.ICON_CHARCOAL]: 'icon_charcoal.png',
  [ArtKeys.ICON_LIGHTER]: 'icon_lighter.png',
  [ArtKeys.ICON_HUMMUS]: 'icon_hummus.png',
  [ArtKeys.VEH_GMC]: 'veh_gmc.png',
  [ArtKeys.VEH_PRADO]: 'veh_prado.png',
  [ArtKeys.VEH_SHADOW]: 'veh_shadow.png',
  [ArtKeys.HELICOPTER]: 'heli.png',
  [ArtKeys.CAMEL]: 'camel.png',
  [ArtKeys.DOG]: 'dog.png',
  [ArtKeys.PUFF]: 'puff.png',
  [ArtKeys.FINISH_FLAG]: 'finish_flag.png'
};

export function preloadExternalAssets(scene: Phaser.Scene) {
  Object.entries(files).forEach(([key, file]) => {
    scene.load.image(key, `assets/${file}`);
  });
  // ignore load errors; procedural fallback will exist
  scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, () => {});
}
