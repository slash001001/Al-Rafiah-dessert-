const ctxState = {
  ctx: null,
  unlocked: false,
  enabled: true,
  buses: {
    master: 0.7,
    engine: 0.8,
    sfx: 0.8,
    ui: 0.8,
  },
  limiter: null,
  engine: null,
  gearIndex: 0,
  rpm: 900,
};

const GEARS = [0, 2.8, 1.9, 1.3, 1.0, 0.84];
const SHIFT_RPM = [2800, 3500, 4000, 4500, 5200];

const createContext = () => {
  if (ctxState.ctx) return ctxState.ctx;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  const ctx = new AudioContext();
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.knee.value = 18;
  limiter.ratio.value = 18;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.18;
  limiter.connect(ctx.destination);
  ctxState.ctx = ctx;
  ctxState.limiter = limiter;
  return ctx;
};

const connectBus = gain => {
  gain.connect(ctxState.limiter);
  return gain;
};

const createEngineNodes = ctx => {
  const master = ctx.createGain();
  const harmonic = ctx.createOscillator();
  const sub = ctx.createOscillator();
  const noiseSource = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  const exhaustGain = ctx.createGain();

  master.gain.value = ctxState.buses.engine * ctxState.buses.master;
  harmonic.type = 'sawtooth';
  harmonic.frequency.value = 90;
  harmonic.connect(master);
  harmonic.start();

  sub.type = 'triangle';
  sub.frequency.value = 45;
  sub.connect(master);
  sub.start();

  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * 0.4;
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;
  noiseGain.gain.value = 0.15;
  noiseSource.connect(noiseGain).connect(master);
  noiseSource.start();

  exhaustGain.gain.value = 0;
  exhaustGain.connect(master);

  connectBus(master);

  ctxState.engine = {
    master,
    harmonic,
    sub,
    noiseGain,
    exhaustGain,
  };
};

const createSfxGain = () => {
  const gain = ctxState.ctx.createGain();
  gain.gain.value = ctxState.buses.sfx * ctxState.buses.master;
  connectBus(gain);
  return gain;
};

const sfxBus = () => ctxState.sfxGain || (ctxState.sfxGain = createSfxGain());

const createNoiseBuffer = (dur = 0.4) => {
  const ctx = ctxState.ctx;
  const buffer = ctx.createBuffer(1, dur * ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
};

export const ensureAudio = () => {
  if (ctxState.unlocked) return ctxState.ctx;
  const ctx = createContext();
  if (!ctx) return null;
  createEngineNodes(ctx);
  ctxState.unlocked = true;
  return ctx;
};

export const setAudioEnabled = enabled => {
  ctxState.enabled = enabled;
  if (!enabled && ctxState.engine) ctxState.engine.master.gain.value = 0;
};

export const setBusVolume = (bus, value) => {
  ctxState.buses[bus] = value;
  if (bus === 'master' && ctxState.engine) ctxState.engine.master.gain.value = value * ctxState.buses.engine;
  if (bus === 'engine' && ctxState.engine) ctxState.engine.master.gain.value = value * ctxState.buses.master;
  if (bus === 'sfx' && ctxState.sfxGain) ctxState.sfxGain.gain.value = value * ctxState.buses.master;
};

export const getAudioSettings = () => ({
  enabled: ctxState.enabled,
  master: ctxState.buses.master,
  engine: ctxState.buses.engine,
  sfx: ctxState.buses.sfx,
});

const shiftGear = rpm => {
  if (rpm > SHIFT_RPM[Math.min(ctxState.gearIndex, SHIFT_RPM.length - 1)]) ctxState.gearIndex = Math.min(ctxState.gearIndex + 1, GEARS.length - 1);
  if (rpm < 1500 && ctxState.gearIndex > 1) ctxState.gearIndex -= 1;
};

export const tickEngine = (kmh, throttle = 0.6, boost = 0) => {
  if (!ctxState.enabled || !ctxState.engine) return;
  const gearRatio = GEARS[ctxState.gearIndex] || 2.8;
  const wheelRps = kmh / 3.6 / (0.34 * Math.PI);
  const rpm = Math.max(920, wheelRps * 60 * gearRatio);
  shiftGear(rpm);
  ctxState.rpm = rpm;
  const normalized = Math.min(1, rpm / 6000);
  const ctx = ctxState.ctx;
  ctxState.engine.harmonic.frequency.linearRampToValueAtTime(rpm / 60, ctx.currentTime + 0.05);
  ctxState.engine.sub.frequency.linearRampToValueAtTime(rpm / 120, ctx.currentTime + 0.05);
  ctxState.engine.noiseGain.gain.linearRampToValueAtTime(0.12 + throttle * 0.08 + boost * 0.1, ctx.currentTime + 0.05);
  ctxState.engine.master.gain.linearRampToValueAtTime((ctxState.buses.master || 0.7) * ctxState.buses.engine * (0.5 + normalized * 0.5), ctx.currentTime + 0.05);
};

export const suspendEngine = () => {
  if (ctxState.engine) ctxState.engine.master.gain.value = 0;
};

const EFFECTS = {
  jump: { type: 'osc', shape: 'triangle', freq: 740, dur: 0.18, gain: 0.35 },
  hit: { type: 'osc', shape: 'square', freq: 540, dur: 0.32, gain: 0.42 },
  miss: { type: 'osc', shape: 'sine', freq: 220, dur: 0.4, gain: 0.3 },
  boost: { type: 'osc', shape: 'sawtooth', freq: 880, dur: 0.45, gain: 0.38 },
  winch: { type: 'osc', shape: 'square', freq: 420, dur: 0.4, gain: 0.32 },
  qteStart: { type: 'osc', shape: 'square', freq: 540, dur: 0.3, gain: 0.28 },
  qteSuccess: { type: 'osc', shape: 'sawtooth', freq: 720, dur: 0.35, gain: 0.32 },
  qteFail: { type: 'osc', shape: 'triangle', freq: 240, dur: 0.35, gain: 0.26 },
  boss: { type: 'osc', shape: 'square', freq: 180, dur: 0.6, gain: 0.42 },
  ooobaaa: { type: 'osc', shape: 'square', freq: 660, dur: 0.45, gain: 0.36 },
  wind: { type: 'noise', dur: 0.6, gain: 0.3 },
  skid: { type: 'noise', dur: 0.5, gain: 0.28 },
};

export const playEffect = (name, extra = {}) => {
  if (!ctxState.enabled) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const def = EFFECTS[name];
  if (!def) return;
  const bus = sfxBus();
  if (def.type === 'noise') {
    const src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(extra.dur ?? def.dur);
    const gain = ctx.createGain();
    gain.gain.value = (extra.gain ?? def.gain) * ctxState.buses.sfx * ctxState.buses.master;
    src.connect(gain).connect(bus);
    src.start();
    src.stop(ctx.currentTime + (extra.dur ?? def.dur));
    return;
  }
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = def.shape;
  osc.frequency.value = (extra.freq ?? def.freq) + (extra.detune ?? 0);
  gain.gain.value = (extra.gain ?? def.gain) * ctxState.buses.sfx * ctxState.buses.master;
  osc.connect(gain).connect(bus);
  osc.start();
  osc.stop(ctx.currentTime + (extra.dur ?? def.dur));
};

export const getRPM = () => ctxState.rpm;
