export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const lerp = (a, b, t) => a + (b - a) * t;

export const easeOutQuad = t => 1 - Math.pow(1 - clamp(t, 0, 1), 2);

export const rnd = Math.random;

export const randomRange = (min, max) => rnd() * (max - min) + min;

export const timestamp = () => performance.now();

export const dtClamp = (dtMs, min = 8, max = 48) => clamp(dtMs, min, max);

export const DPR = () => window.devicePixelRatio || 1;

export const fitCanvas = (canvas, ctx) => {
  const rect = canvas.getBoundingClientRect();
  const scale = DPR();
  canvas.width = Math.round(rect.width * scale);
  canvas.height = Math.round(rect.height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  return { width: rect.width, height: rect.height, scale };
};

export const kmhFromVelocity = vx => Math.abs(vx) * 0.36;

export const seededRandom = seed => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const rectsOverlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export const lerpVec = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

export const smoothDamp = (current, target, lambda = 0.1) => current + (target - current) * lambda;
