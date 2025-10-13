const audioState = {
  ctx: null,
  engineOsc: null,
  engineGain: null,
  unlocked: false,
  enabled: true,
  volume: 0.7,
  targetHz: 0,
};

const SFX = {
  jump: { type: 'triangle', freq: 620, dur: 0.2 },
  hit: { type: 'square', freq: 540, dur: 0.35, gain: 0.35 },
  miss: { type: 'sine', freq: 210, dur: 0.35, gain: 0.25 },
  boost: { type: 'sawtooth', freq: 820, dur: 0.45, gain: 0.35 },
  winch: { type: 'square', freq: 420, dur: 0.35, gain: 0.32 },
  qteStart: { type: 'square', freq: 520, dur: 0.3 },
  qteSuccess: { type: 'sawtooth', freq: 720, dur: 0.4, gain: 0.32 },
  qteFail: { type: 'sine', freq: 240, dur: 0.35, gain: 0.25 },
  boss: { type: 'square', freq: 180, dur: 0.5, gain: 0.4 },
  ooobaaa: { type: 'square', freq: 660, dur: 0.45, gain: 0.38 },
};

const createCtx = () => {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  const ctx = new AudioCtx();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 0;
  osc.connect(gain);
  osc.start();
  audioState.ctx = ctx;
  audioState.engineGain = gain;
  audioState.engineOsc = osc;
  audioState.unlocked = true;
  return ctx;
};

export const unlockAudio = () => {
  if (audioState.unlocked) {
    return audioState.ctx;
  }
  return createCtx();
};

export const setAudioEnabled = enabled => {
  audioState.enabled = enabled;
  if (!enabled && audioState.engineGain) {
    audioState.engineGain.gain.value = 0;
  }
};

export const setMasterVolume = volume => {
  audioState.volume = volume;
};

export const playSfx = (name, detune = 0) => {
  if (!audioState.enabled) return;
  const ctx = audioState.ctx || createCtx();
  if (!ctx) return;
  const def = SFX[name];
  if (!def) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = def.type;
  const freq = (def.freq || 440) + detune;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  const g = (def.gain ?? 0.28) * audioState.volume;
  gain.gain.setValueAtTime(g, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + def.dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + def.dur);
};

export const tickEngine = speedKmh => {
  if (!audioState.enabled || !audioState.engineOsc || !audioState.engineGain) return;
  const hz = 70 + speedKmh * 4;
  audioState.targetHz = hz;
  const gainTarget = Math.min(0.4, 0.05 + (speedKmh / 260) * 0.4) * audioState.volume;
  const ctx = audioState.ctx;
  const now = ctx ? ctx.currentTime : 0;
  audioState.engineOsc.frequency.linearRampToValueAtTime(hz, now + 0.06);
  audioState.engineGain.gain.linearRampToValueAtTime(gainTarget, now + 0.06);
};

export const suspendEngine = () => {
  if (audioState.engineGain) {
    audioState.engineGain.gain.value = 0;
  }
};

export const getAudioState = () => ({
  unlocked: audioState.unlocked,
  enabled: audioState.enabled,
  volume: audioState.volume,
});
