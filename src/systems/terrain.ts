import Phaser from 'phaser';

export type TerrainProfile = {
  points: Phaser.Math.Vector2[];
  totalLength: number;
};

export type TerrainOptions = {
  length: number;
  segmentLength: number;
  baseHeight: number;
  amplitude: number;
};

export function buildTerrain(scene: Phaser.Scene, opts: TerrainOptions): TerrainProfile {
  const { length, segmentLength, baseHeight, amplitude } = opts;
  const points: Phaser.Math.Vector2[] = [];
  const jitter = () => Phaser.Math.FloatBetween(-amplitude * 0.35, amplitude * 0.35);
  let height = baseHeight;

  for (let x = 0; x <= length; x += segmentLength) {
    if (x < 380) {
      height = baseHeight - 12 + Math.sin(x * 0.002) * 6;
      points.push(new Phaser.Math.Vector2(x, height));
      continue;
    }
    const ramp = Phaser.Math.Clamp((x - 320) / 900, 0, 1);
    const amp = amplitude * (0.4 + 0.6 * ramp);
    const wave = Math.sin(x * 0.0014) * amp * 0.6 + Math.sin(x * 0.00065) * amp * 0.35;
    height = Phaser.Math.Clamp(baseHeight + wave + jitter() * ramp, baseHeight - amp, baseHeight + amp);
    points.push(new Phaser.Math.Vector2(x, height));
  }

  // smooth spikes
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1].y;
    const cur = points[i].y;
    const next = points[i + 1].y;
    points[i].y = (prev * 0.25 + cur * 0.5 + next * 0.25);
  }

  const thickness = 80;
  const matter = scene.matter;
  const matterLib = (Phaser.Physics.Matter as any).Matter as any;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const body = matterLib.Bodies.rectangle(midX, midY, len, thickness, {
      isStatic: true,
      angle,
      friction: 1,
      frictionStatic: 1,
      restitution: 0,
      label: 'terrain'
    });
    matter.world.add(body);
  }

  const ground = scene.add.graphics();
  ground.fillStyle(0xc18a53, 1);
  ground.beginPath();
  ground.moveTo(0, scene.scale.height + 200);
  points.forEach((p) => ground.lineTo(p.x, p.y));
  ground.lineTo(points[points.length - 1].x, scene.scale.height + 200);
  ground.closePath();
  ground.fillPath();
  ground.lineStyle(6, 0x8d5a2d, 0.9);
  ground.beginPath();
  ground.moveTo(points[0].x, points[0].y - 2);
  points.forEach((p) => ground.lineTo(p.x, p.y - 2));
  ground.strokePath();
  ground.setDepth(-1);

  scene.matter.world.setBounds(0, 0, length + 800, scene.scale.height + 500, 64, true, true, true, true);

  return { points, totalLength: points[points.length - 1].x };
}

export function sampleHeight(profile: TerrainProfile, x: number): number {
  const pts = profile.points;
  if (x <= pts[0].x) return pts[0].y;
  if (x >= pts[pts.length - 1].x) return pts[pts.length - 1].y;

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x);
      return Phaser.Math.Linear(a.y, b.y, t);
    }
  }
  return pts[pts.length - 1].y;
}
