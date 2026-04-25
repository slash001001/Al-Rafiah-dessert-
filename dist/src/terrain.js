import { clamp, lerp, mulberry32, randRange, smoothstep } from './math.js';

export class Terrain {
  constructor(seed = 20260424) {
    this.seed = seed;
    this.length = 7800;
    this.step = 70;
    this.points = [];
    this.traps = [];
    this.collectibles = [];
    this.finishX = this.length - 300;
    this.startY = 0;
    this.generate();
  }

  generate() {
    const rng = mulberry32(this.seed);
    const raw = [];
    const count = Math.ceil(this.length / this.step) + 1;
    for (let i = 0; i < count; i += 1) {
      const x = i * this.step;
      const t = x / this.length;
      const climb = lerp(710, 285, Math.pow(t, 0.92));
      const dune = Math.sin(t * Math.PI * 9.6) * lerp(26, 72, t)
        + Math.sin(t * Math.PI * 19.7 + 1.4) * lerp(8, 34, t)
        + Math.sin(t * Math.PI * 4.2 + 0.6) * 48;
      const noise = randRange(rng, -22, 22) * smoothstep(0.05, 0.25, t);
      let y = climb + dune + noise;
      if (x < 500) y = lerp(705, y, smoothstep(120, 500, x));
      if (x > this.finishX - 260) {
        const ft = smoothstep(this.finishX - 260, this.finishX + 160, x);
        y = lerp(y, 250 + Math.sin(ft * Math.PI) * 7, ft);
      }
      raw.push({ x, y });
    }
    // Smooth the profile enough to feel like drivable dunes while preserving crests.
    this.points = raw.map((p, i) => {
      const prev = raw[Math.max(0, i - 1)];
      const next = raw[Math.min(raw.length - 1, i + 1)];
      return { x: p.x, y: (prev.y + p.y * 2 + next.y) / 4 };
    });
    for (let pass = 0; pass < 2; pass += 1) {
      this.points = this.points.map((p, i, arr) => {
        const prev = arr[Math.max(0, i - 1)];
        const next = arr[Math.min(arr.length - 1, i + 1)];
        return { x: p.x, y: (prev.y + p.y * 3 + next.y) / 5 };
      });
    }
    this.startY = this.getY(110);
    this.createTraps(rng);
    this.createCollectibles(rng);
  }

  createTraps(rng) {
    const trapXs = [980, 1680, 2520, 3380, 4210, 5140, 6100, 6900];
    this.traps = trapXs.map((x, i) => ({
      id: i,
      x: x + randRange(rng, -70, 90),
      w: randRange(rng, 140, 235),
      severity: randRange(rng, 0.7, 1.25),
      discovered: false,
      recovered: false,
      flash: 0
    }));
  }

  createCollectibles(rng) {
    const kinds = ['salt', 'knife', 'tongs', 'onion', 'mayo'];
    this.collectibles = [];
    kinds.forEach((kind, i) => {
      const baseX = 900 + i * 1180 + randRange(rng, -120, 220);
      const x = clamp(baseX, 550, this.finishX - 480);
      this.collectibles.push({
        id: `${kind}_${i}`,
        kind,
        x,
        y: this.getY(x) - randRange(rng, 75, 110),
        taken: false,
        bob: randRange(rng, 0, Math.PI * 2)
      });
    });
    // Bonus coin rings as small optional scoring pickups.
    for (let i = 0; i < 22; i += 1) {
      const x = 600 + i * 310 + randRange(rng, -65, 65);
      if (x > this.finishX - 240) continue;
      this.collectibles.push({
        id: `coin_${i}`,
        kind: 'coin',
        x,
        y: this.getY(x) - randRange(rng, 50, 145),
        taken: false,
        bob: randRange(rng, 0, Math.PI * 2)
      });
    }
  }

  getY(x) {
    if (x <= 0) return this.points[0].y;
    if (x >= this.length) return this.points[this.points.length - 1].y;
    const idx = clamp(Math.floor(x / this.step), 0, this.points.length - 2);
    const a = this.points[idx];
    const b = this.points[idx + 1];
    const t = (x - a.x) / (b.x - a.x);
    return lerp(a.y, b.y, t);
  }

  getSlope(x) {
    const dx = 14;
    return (this.getY(x + dx) - this.getY(x - dx)) / (dx * 2);
  }

  getTrapAt(x) {
    return this.traps.find((trap) => !trap.recovered && x >= trap.x && x <= trap.x + trap.w) ?? null;
  }

  visiblePoints(camera, width, margin = 140) {
    const startX = Math.max(0, camera.x - margin);
    const endX = Math.min(this.length, camera.x + width + margin);
    const startIdx = clamp(Math.floor(startX / this.step), 0, this.points.length - 1);
    const endIdx = clamp(Math.ceil(endX / this.step), 0, this.points.length - 1);
    const points = [];
    for (let i = startIdx; i <= endIdx; i += 1) points.push(this.points[i]);
    return points;
  }
}
