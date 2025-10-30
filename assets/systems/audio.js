export class AudioManager {
  constructor(scene, options) {
    this.scene = scene;
    this.options = options;
    this.musicEnabled = options.audio?.music ?? true;
    this.sfxEnabled = options.audio?.sfx ?? true;
    this.masterVolume = options.audio?.volume ?? 1;
    this.engineIdle = null;
    this.engineRev = null;
    this.skid = null;
    this.nitro = null;
    this.sandstorm = null;
    this.currentEngineTarget = 0;
  }

  init() {
    if (!this.scene.sound) return;
    const sound = this.scene.sound;
    this.engineIdle = sound.add('engine_idle', {
      loop: true,
      volume: 0.25 * this.masterVolume
    });
    this.engineRev = sound.add('engine_rev', {
      loop: true,
      volume: 0,
      rate: 1
    });
    this.skid = sound.add('skid', { loop: true, volume: 0 });
    this.nitro = sound.add('nitro', { loop: false, volume: 0.9 * this.masterVolume });
    this.sandstorm = sound.add('sandstorm', { loop: true, volume: 0 });

    this.cheer = sound.add('cheer', { loop: false, volume: 0.9 * this.masterVolume });
    this.coin = sound.add('coin', { loop: false, volume: 0.7 * this.masterVolume });
    this.checkpoint = sound.add('checkpoint', { loop: false, volume: 0.7 * this.masterVolume });
    this.kettle = sound.add('kettle_spill', { loop: false, volume: 0.7 * this.masterVolume });
    this.sizzling = sound.add('sizzling', { loop: false, volume: 0.6 * this.masterVolume });
    this.dogBark = sound.add('dog_bark', { loop: false, volume: 0.8 * this.masterVolume });
    this.sheela = sound.add('sheela_loop', {
      loop: true,
      volume: 0.3 * this.masterVolume
    });

    if (this.musicEnabled) {
      this.sheela.play();
    }
    if (this.sfxEnabled) {
      this.engineIdle.play();
      this.engineRev.play();
    }
  }

  updateEngine({ speed, throttle, nitroActive, skidIntensity }) {
    if (!this.sfxEnabled) return;
    if (!this.engineIdle || !this.engineRev) return;

    const idleTarget = Math.max(0.1, Math.min(0.6, 0.25 + throttle * 0.4));
    this.engineIdle.setVolume(idleTarget * this.masterVolume);
    this.engineRev.setVolume(Math.min(1, throttle * 1.1) * this.masterVolume);
    this.engineRev.setRate(0.8 + Math.min(1.6, speed / 12));

    if (nitroActive && !this.nitro?.isPlaying) {
      this.nitro?.play();
    }

    if (this.skid) {
      const volume = Phaser.Math.Clamp(skidIntensity * 0.8, 0, 0.9);
      this.skid.setVolume(volume * this.masterVolume);
      if (volume > 0.05 && !this.skid.isPlaying) {
        this.skid.play();
      }
      if (volume <= 0.05 && this.skid.isPlaying) {
        this.skid.stop();
      }
    }
  }

  playSfx(key) {
    if (!this.sfxEnabled) return;
    const sound = this[key];
    sound?.play?.();
  }

  playCoin() {
    this.playSfx('coin');
  }

  playCheckpoint() {
    this.playSfx('checkpoint');
  }

  playFood(brand) {
    if (brand === 'shalimar') {
      this.playSfx('sizzling');
    } else if (brand === 'albaik') {
      this.playSfx('cheer');
    } else {
      this.playSfx('coin');
    }
  }

  playDogBark() {
    this.playSfx('dogBark');
  }

  sandstormState(active) {
    if (!this.sfxEnabled || !this.sandstorm) return;
    if (active) {
      this.sandstorm.play({ volume: 0.4 * this.masterVolume });
    } else {
      this.sandstorm.stop();
    }
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (!this.sheela) return;
    if (enabled && !this.sheela.isPlaying) {
      this.sheela.play();
    } else if (!enabled && this.sheela.isPlaying) {
      this.sheela.stop();
    }
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = enabled;
    if (!enabled) {
      [this.engineIdle, this.engineRev, this.skid, this.nitro, this.sandstorm].forEach(s => s?.stop?.());
    } else {
      this.engineIdle?.play();
      this.engineRev?.play();
    }
  }

  destroy() {
    [
      this.engineIdle,
      this.engineRev,
      this.skid,
      this.nitro,
      this.sandstorm,
      this.cheer,
      this.coin,
      this.checkpoint,
      this.kettle,
      this.sizzling,
      this.dogBark,
      this.sheela
    ].forEach(sound => sound?.destroy?.());
  }
}
