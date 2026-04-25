import { clamp } from './math.js';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.windSource = null;
    this.windGain = null;
    this.fireSource = null;
    this.fireGain = null;
    this.heliOsc = null;
    this.heliGain = null;
    this.enabled = false;
    this.lastEngine = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.42;
    this.master.connect(this.ctx.destination);
    this.createLoops();
    this.enabled = true;
  }

  createLoops() {
    if (!this.ctx || !this.master) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    this.engineOsc.connect(engineFilter).connect(this.engineGain).connect(this.master);
    this.engineOsc.start();

    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = this.makeNoiseBuffer(2.2);
    this.windSource.loop = true;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.035;
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 760;
    windFilter.Q.value = 0.45;
    this.windSource.connect(windFilter).connect(this.windGain).connect(this.master);
    this.windSource.start();

    this.fireSource = this.ctx.createBufferSource();
    this.fireSource.buffer = this.makeCrackleBuffer(1.4);
    this.fireSource.loop = true;
    this.fireGain = this.ctx.createGain();
    this.fireGain.gain.value = 0;
    const fireFilter = this.ctx.createBiquadFilter();
    fireFilter.type = 'highpass';
    fireFilter.frequency.value = 850;
    this.fireSource.connect(fireFilter).connect(this.fireGain).connect(this.master);
    this.fireSource.start();

    this.heliOsc = this.ctx.createOscillator();
    this.heliOsc.type = 'square';
    this.heliGain = this.ctx.createGain();
    this.heliGain.gain.value = 0;
    const heliFilter = this.ctx.createBiquadFilter();
    heliFilter.type = 'lowpass';
    heliFilter.frequency.value = 110;
    this.heliOsc.frequency.value = 33;
    this.heliOsc.connect(heliFilter).connect(this.heliGain).connect(this.master);
    this.heliOsc.start();
  }

  makeNoiseBuffer(seconds) {
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.92 + white * 0.08;
      data[i] = last;
    }
    return buffer;
  }

  makeCrackleBuffer(seconds) {
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) {
      const pop = Math.random() < 0.015 ? (Math.random() * 2 - 1) * 0.85 : 0;
      data[i] = pop + (Math.random() * 2 - 1) * 0.035;
    }
    return buffer;
  }

  setEngine(throttle, speed, grounded) {
    if (!this.ctx || !this.engineGain || !this.engineOsc) return;
    const t = clamp(Math.abs(throttle), 0, 1);
    const speedMix = clamp(Math.abs(speed) / 700, 0, 1);
    const freq = 55 + t * 80 + speedMix * 95 + (grounded ? 0 : 25);
    const gain = t > 0.03 || speedMix > 0.1 ? 0.035 + t * 0.06 + speedMix * 0.025 : 0.006;
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.04);
    this.engineGain.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.08);
    this.lastEngine = gain;
  }

  setWind(intensity) {
    if (!this.ctx || !this.windGain) return;
    const gain = 0.035 + clamp(intensity, 0, 1) * 0.18;
    this.windGain.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.12);
  }

  setFire(active) {
    if (!this.ctx || !this.fireGain) return;
    this.fireGain.gain.setTargetAtTime(active ? 0.12 : 0, this.ctx.currentTime, 0.18);
  }

  setHelicopter(active, distance = 1) {
    if (!this.ctx || !this.heliGain || !this.heliOsc) return;
    const d = clamp(distance, 0, 1);
    const gain = active ? (0.04 + 0.08 * (1 - d)) : 0;
    this.heliOsc.frequency.setTargetAtTime(28 + Math.sin(performance.now() * 0.01) * 6, this.ctx.currentTime, 0.1);
    this.heliGain.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.1);
  }

  beep({ frequency = 660, duration = 0.08, type = 'sine', gain = 0.08 } = {}) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(gain, this.ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    osc.connect(g).connect(this.master);
    osc.start();
    osc.stop(this.ctx.currentTime + duration + 0.02);
  }

  pickup() { this.beep({ frequency: 880, duration: 0.09, type: 'triangle', gain: 0.09 }); }
  trap() { this.beep({ frequency: 160, duration: 0.22, type: 'sawtooth', gain: 0.08 }); }
  winch() { this.beep({ frequency: 360, duration: 0.18, type: 'square', gain: 0.07 }); }
  crash() { this.beep({ frequency: 92, duration: 0.35, type: 'sawtooth', gain: 0.1 }); }
  win() {
    this.beep({ frequency: 523, duration: 0.12, type: 'triangle', gain: 0.08 });
    setTimeout(() => this.beep({ frequency: 659, duration: 0.12, type: 'triangle', gain: 0.08 }), 130);
    setTimeout(() => this.beep({ frequency: 784, duration: 0.2, type: 'triangle', gain: 0.08 }), 260);
  }
}
