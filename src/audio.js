const audio = {
  ctx: null,
  engineOsc: null,
  engineGain: null,
  limiter: null,
  enabled: true,
  unlocked: false,
  volume: 0.7,
};

const EFFECTS = {
  jump: { type: 'triangle', freq: 640, dur: 0.22, gain: 0.35 },
  hit: { type: 'square', freq: 520, dur: 0.35, gain: 0.4 },
  miss: { type: 'sine', freq: 220, dur: 0.4, gain: 0.28 },
  boost: { type: 'sawtooth', freq: 860, dur: 0.5, gain: 0.4 },
  winch: { type: 'square', freq: 420, dur: 0.4, gain: 0.32 },
  qteStart: { type: 'square', freq: 540, dur: 0.3, gain: 0.28 },
  qteSuccess: { type: 'sawtooth', freq: 720, dur: 0.4, gain: 0.32 },
  qteFail: { type: 'triangle', freq: 240, dur: 0.35, gain: 0.26 },
  boss: { type: 'square', freq: 180, dur: 0.6, gain: 0.42 },
  ooobaaa: { type: 'square', freq: 660, dur: 0.45, gain: 0.36 },
  wind: { type: 'noise', dur: 0.6, gain: 0.32 },
};

const createContext = () => {
  if (audio.ctx) return audio.ctx;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  audio.ctx = new AudioCtx();
  audio.limiter = audio.ctx.createDynamicsCompressor();
  audio.limiter.threshold.value = -18;
  audio.limiter.knee.value = 15;
  audio.limiter.ratio.value = 12;
  audio.limiter.attack.value = 0.003;
  audio.limiter.release.value = 0.1;
  audio.limiter.connect(audio.ctx.destination);
  return audio.ctx;
};

const initEngine = ctx => {
  if (audio.engineOsc) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.type = 'sawtooth';
  osc.frequency.value = 0;
  osc.connect(gain);
  gain.connect(audio.limiter);
  osc.start();
  audio.engineOsc = osc;
  audio.engineGain = gain;
};

export const unlockAudio = () => {
  if (audio.unlocked) return audio.ctx;
  const ctx = createContext();
  if (!ctx) return null;
  initEngine(ctx);
  audio.unlocked = true;
  return ctx;
};

export const setMasterVolume = volume => {
  audio.volume = volume;
};

export const setAudioEnabled = enabled => {
  audio.enabled = enabled;
  if (!enabled && audio.engineGain) audio.engineGain.gain.value = 0;
};

const createNoiseBuffer = ctx => {
  const buffer = ctx.createBuffer(1, 0.5 * ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
};

export const playEffect = (name, extra = {}) => {
  if (!audio.enabled) return;
  const ctx = unlockAudio();
  if (!ctx) return;
  const def = EFFECTS[name];
  if (!def) return;
  const gainNode = ctx.createGain();
  gainNode.gain.value = (def.gain ?? 0.3) * audio.volume;
  gainNode.connect(audio.limiter);
  if (def.type === 'noise') {
    const src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx);
    src.connect(gainNode);
    src.start();
    src.stop(ctx.currentTime + (extra.dur ?? def.dur));
    return;
  }
  const osc = ctx.createOscillator();
  osc.type = def.type;
  const freq = (extra.freq ?? def.freq) + (extra.detune ?? 0);
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  osc.connect(gainNode);
  osc.start();
  osc.stop(ctx.currentTime + (extra.dur ?? def.dur));
};

export const tickEngine = kmh => {
  if (!audio.enabled || !audio.engineOsc || !audio.engineGain) return;
  const freq = 70 + kmh * 4.2;
  const gainTarget = Math.min(0.35, 0.05 + kmh / 260) * audio.volume;
  const ctx = audio.ctx;
  audio.engineOsc.frequency.linearRampToValueAtTime(freq, ctx.currentTime + 0.05);
  audio.engineGain.gain.linearRampToValueAtTime(gainTarget, ctx.currentTime + 0.05);
};

export const suspendEngine = () => {
  if (audio.engineGain) audio.engineGain.gain.value = 0;
};

export const getAudioSettings = () => ({ enabled: audio.enabled, volume: audio.volume, unlocked: audio.unlocked });

export const haptics = pattern => {
  if (!navigator.vibrate || !audio.enabled) return;
  navigator.vibrate(pattern);
};
