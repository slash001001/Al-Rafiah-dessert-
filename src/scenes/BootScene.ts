import Phaser from 'phaser';
import { ensureProceduralArt } from '../visual/Procedural';
import { assetUrl } from '../utils/assetUrl';

export default class BootScene extends Phaser.Scene {
  private loadingText!: Phaser.GameObjects.Text;

  constructor() {
    super('BootScene');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0b0f14');
    this.loadingText = this.add.text(width / 2, height / 2, 'Loading Rafiah…', {
      fontSize: '18px',
      color: '#e5e7eb',
      fontFamily: 'system-ui, sans-serif'
    }).setOrigin(0.5);

    this.loadArtPack();
  }

  private async loadArtPack() {
    let manifest: { assets?: Record<string, string> } = {};
    try {
      const res = await fetch(assetUrl(`art/pack_v1/manifest.json?cb=${Date.now()}`));
      if (res.ok) {
        manifest = await res.json();
      }
    } catch (err) {
      console.warn('art manifest fetch failed', err);
    }

    const entries = Object.entries(manifest.assets || {});
    const missing = new Set<string>();
    if (entries.length) {
      this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: any) => missing.add(file.key));
      entries.forEach(([key, path]) => {
        this.load.image(key, assetUrl(path));
      });
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        this.finishLoad(entries.length, missing.size);
      });
      this.load.start();
    } else {
      this.finishLoad(0, 0);
    }
  }

  private finishLoad(count: number, missing: number) {
    const mode = count === 0 ? 'procedural' : missing === 0 ? 'pack' : 'mixed_or_fallback';
    this.registry.set('artMode', mode);
    ensureProceduralArt(this);
    this.scene.start('MenuScene');
  }
}
