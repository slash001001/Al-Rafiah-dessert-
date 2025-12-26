import Phaser from 'phaser';
import { ArtKeys } from '../visual/ArtKeys';
import { ensureProceduralArt } from '../visual/Procedural';

export default class ArtGalleryScene extends Phaser.Scene {
  constructor() {
    super('ArtGalleryScene');
  }

  create() {
    ensureProceduralArt(this);
    const keys = [
      ArtKeys.BG_SKY,
      ArtKeys.DUNE_FAR,
      ArtKeys.DUNE_MID,
      ArtKeys.DUNE_NEAR,
      ArtKeys.GROUND_ROAD,
      ArtKeys.GROUND_DUNES,
      ArtKeys.VEH_GMC,
      ArtKeys.VEH_PRADO,
      ArtKeys.VEH_SHADOW,
      ArtKeys.POI_STATION,
      ArtKeys.POI_SHOP,
      ArtKeys.POI_RESTAURANT,
      ArtKeys.ICON_SALT,
      ArtKeys.ICON_WATER,
      ArtKeys.ICON_CHARCOAL,
      ArtKeys.ICON_LIGHTER,
      ArtKeys.ICON_HUMMUS,
      ArtKeys.HELICOPTER,
      ArtKeys.CAMEL,
      ArtKeys.DOG,
      ArtKeys.PUFF,
      ArtKeys.FINISH_FLAG
    ];

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x0b0f14, 0.9).setOrigin(0);
    this.add.text(width / 2, 30, 'معرض الرسوم (Debug)', {
      fontSize: '24px',
      color: '#f8fafc',
      fontFamily: 'system-ui'
    }).setOrigin(0.5);

    const cols = 4;
    const cellW = width / cols;
    const cellH = 180;

    keys.forEach((key, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = col * cellW + cellW / 2;
      const cy = 90 + row * cellH;
      const exists = this.textures.exists(key);
      if (exists) {
        const img = this.add.image(cx, cy, key);
        const scale = Math.min((cellW * 0.5) / img.width, (cellH * 0.4) / img.height);
        img.setScale(scale);
      } else {
        this.add.rectangle(cx, cy, cellW * 0.6, cellH * 0.4, 0x7f1d1d, 0.8);
        this.add.text(cx, cy, `MISSING\n${key}`, {
          fontSize: '14px',
          color: '#fecdd3',
          fontFamily: 'ui-monospace'
        }).setOrigin(0.5);
      }
      this.add.text(cx, cy + cellH * 0.3, key, {
        fontSize: '12px',
        color: '#cbd5e1',
        fontFamily: 'ui-monospace'
      }).setOrigin(0.5);
    });

    const back = this.add.text(width / 2, height - 30, 'رجوع', {
      fontSize: '18px',
      color: '#0f172a',
      backgroundColor: '#fcd34d',
      padding: { x: 12, y: 8 },
      fontFamily: 'system-ui'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('MenuScene'));
  }
}
