import Phaser from 'phaser';
import { assetUrl } from '../utils/assetUrl';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    this.load.image('bg_desert_clean', assetUrl('art/cc0/bg_desert_clean.png'));
    this.load.image('bg_dunes_1080', assetUrl('art/cc0/bg_dunes_1080.png'));
    this.load.image('veh_gmc_cc0', assetUrl('art/cc0/veh_gmc.png'));
    this.load.image('veh_prado_cc0', assetUrl('art/cc0/veh_prado.png'));
  }

  create() {
    this.scene.start('MenuScene');
  }
}
