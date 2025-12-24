import Phaser from 'phaser';
import { toggleMute, isMuted, beep } from './Sfx';

export class PauseMenu {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private visible = false;

  constructor(scene: Phaser.Scene, onResume: () => void, onRestart: () => void, onMenu: () => void) {
    this.scene = scene;
    const { width, height } = scene.scale;
    const panel = scene.add.rectangle(0, 0, 320, 220, 0x0f172a, 0.9).setOrigin(0.5).setStrokeStyle(2, 0xfcd34d);
    const title = scene.add.text(0, -80, 'وقفة', {
      fontSize: '22px',
      color: '#f8fafc',
      fontFamily: 'system-ui'
    }).setOrigin(0.5);

    const btn = (y: number, label: string, cb: () => void) => {
      const t = scene.add.text(0, y, label, {
        fontSize: '18px',
        color: '#0f172a',
        backgroundColor: '#fcd34d',
        padding: { x: 12, y: 8 },
        fontFamily: 'system-ui'
      }).setOrigin(0.5);
      t.setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => {
        beep('ui');
        cb();
      });
      return t;
    };

    const resume = btn(-30, 'كمل', onResume);
    const restart = btn(20, 'إعادة الجولة', onRestart);
    const menu = btn(70, 'رجوع للقائمة', onMenu);

    const mute = scene.add.text(0, 120, this.muteLabel(), {
      fontSize: '14px',
      color: '#e5e7eb',
      backgroundColor: '#1f2937',
      padding: { x: 10, y: 6 },
      fontFamily: 'system-ui'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    mute.on('pointerdown', () => {
      toggleMute();
      mute.setText(this.muteLabel());
      beep('ui');
    });

    this.container = scene.add.container(width / 2, height / 2, [panel, title, resume, restart, menu, mute]);
    this.container.setScrollFactor(0).setDepth(200).setVisible(false);
  }

  private muteLabel() {
    return isMuted() ? '🔇 كتم الصوت' : '🔊 الصوت شغال';
  }

  show() {
    this.visible = true;
    this.container.setVisible(true);
  }

  hide() {
    this.visible = false;
    this.container.setVisible(false);
  }

  isVisible() {
    return this.visible;
  }
}
