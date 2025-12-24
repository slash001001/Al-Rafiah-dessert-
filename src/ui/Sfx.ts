const LS_KEY = 'rafiah_muted';
let muted = false;
let ctx: AudioContext | null = null;

export function isMuted() {
  if (typeof localStorage === 'undefined') return muted;
  const v = localStorage.getItem(LS_KEY);
  return v === '1';
}

export function toggleMute() {
  const next = !isMuted();
  muted = next;
  if (typeof localStorage !== 'undefined') localStorage.setItem(LS_KEY, next ? '1' : '0');
  return next;
}

export function beep(type: 'ui' | 'hit' | 'win' | 'fail' | 'helicopter') {
  if (isMuted()) return;
  try {
    if (!ctx) ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    const freq = type === 'ui' ? 520 : type === 'hit' ? 220 : type === 'win' ? 720 : type === 'helicopter' ? 340 : 180;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  } catch {
    // ignore
  }
}
