export const DPR = () => window.devicePixelRatio || 1;

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const lerp = (a, b, t) => a + (b - a) * t;

export const invLerp = (a, b, v) => (v - a) / (b - a || 1);

export const rnd = Math.random;

export const randomRange = (min, max) => rnd() * (max - min) + min;

export const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

export const kmh = vx => Math.abs(vx) * 0.36;

export const timestamp = () => performance.now();

export const dtClamp = (dtMs, min = 8, max = 48) => clamp(dtMs, min, max);

export const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export const seededRng = seed => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const fitCanvas = (canvas, ctx) => {
  const rect = canvas.getBoundingClientRect();
  const scale = DPR();
  canvas.width = Math.round(rect.width * scale);
  canvas.height = Math.round(rect.height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  return { width: rect.width, height: rect.height, scale };
};

export const formatTime = seconds => seconds.toFixed(1);

export const lerpVec = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

export const toScreen = (worldX, cameraX) => worldX - cameraX;
