import { WORLD, sampleGround } from './world.js';
import { kmhFromVelocity } from './utils.js';

const PAL = {
  skyTop: '#041022',
  skyMid: '#0a1730',
  skyBot: '#0f2040',
  duneFar: '#0d1522',
  duneMid: '#17243a',
  duneMain: '#b78a5b',
  duneShade: '#8e6d47',
  neon: '#00e5ff',
  accent: '#ffd166',
  brake: '#ff3b3b',
  head: '#fff7b0',
  gaugeBg: '#0d1320',
  gaugeOk: '#2ce07c',
  gaugeHi: '#ff6b6b',
};

const FX = {
  stars: [],
  speedLines: [],
  bloomBuffer: null,
};

export const ensureStars = stars => {
  FX.stars = stars;
};

export const spawnSpeedLines = (settings, kmh, W, H) => {
  if (!settings.speedlines || kmh < 120) return;
  const intensity = Math.min(16, Math.floor((kmh - 110) / 14));
  for (let i = 0; i < intensity; i += 1) {
    if (Math.random() > 0.4) continue;
    FX.speedLines.push({
      x: Math.random() * W,
      y: Math.random() * H * 0.5 + H * 0.1,
      len: 20 + Math.random() * 80,
      w: 1 + Math.random() * 2,
      a: 0.25 + Math.random() * 0.3,
    });
  }
};

export const updateSpeedLines = dt => {
  FX.speedLines = FX.speedLines
    .map(line => ({
      ...line,
      len: line.len * 1.06,
      a: line.a * Math.pow(0.9, dt * 60),
    }))
    .filter(line => line.a > 0.05);
};

const drawSky = (ctx, W, H, cam, stars) => {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, PAL.skyTop);
  grad.addColorStop(0.55, PAL.skyMid);
  grad.addColorStop(1, PAL.skyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(0, -cam.y * 0.02);
  ctx.fillStyle = '#d9ebff';
  stars.forEach(star => {
    const sx = ((star.x - cam.x * 0.2) % (W + 480) + (W + 480)) % (W + 480) - 240;
    const sy = H * star.y;
    ctx.globalAlpha = star.a;
    ctx.fillRect(sx, sy, star.size, star.size);
  });
  ctx.restore();

  ctx.fillStyle = PAL.duneFar;
  for (let sx = -40; sx <= W + 80; sx += 8) {
    const wx = cam.x * 0.35 + sx;
    const yy = H * 0.72 - Math.sin(wx * 0.004) * 14;
    ctx.fillRect(sx, yy, 80, H - yy);
  }

  ctx.fillStyle = PAL.duneMid;
  for (let sx = -40; sx <= W + 80; sx += 10) {
    const wx = cam.x * 0.55 + sx;
    const yy = H * 0.8 - Math.sin(wx * 0.006) * 18;
    ctx.fillRect(sx, yy, 80, H - yy);
  }
};

const drawDunes = (ctx, W, cam) => {
  ctx.beginPath();
  ctx.moveTo(0, 600);
  for (let x = cam.x - 40; x <= cam.x + W + 8; x += 8) ctx.lineTo(x - cam.x, sampleGround(x) - cam.y);
  ctx.lineTo(W, 600);
  ctx.closePath();
  ctx.fillStyle = PAL.duneMain;
  ctx.fill();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = PAL.duneShade;
  ctx.fill();
  ctx.globalAlpha = 1;
};

const drawSpectators = (ctx, spectators, cam, dt) => {
  spectators.forEach(sp => {
    const sx = sp.x - cam.x;
    if (sx < -160 || sx > ctx.canvas.width + 160) return;
    const sy = sampleGround(sp.x) - sp.offset - cam.y + Math.sin(sp.sway) * 4;
    ctx.fillStyle = sp.color;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 12, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1f2b';
    ctx.fillRect(sx - 10, sy, 20, 34);
    sp.sway += dt * 1.8;
  });
};

const drawChair = (ctx, cam) => {
  const sx = WORLD.CHAIR_X - cam.x;
  if (sx < -160 || sx > ctx.canvas.width + 160) return;
  const sy = sampleGround(WORLD.CHAIR_X) - cam.y;
  ctx.fillStyle = '#5b2b1a';
  ctx.fillRect(sx - 16, sy - 54, 32, 12);
  ctx.fillRect(sx - 18, sy - 44, 36, 32);
  ctx.fillRect(sx - 12, sy - 24, 10, 26);
  ctx.fillRect(sx + 4, sy - 24, 10, 26);
};

const drawGate = (ctx, cam) => {
  const sx = WORLD.SHALIMAR_X - cam.x;
  if (sx < -260 || sx > ctx.canvas.width + 260) return;
  const ground = sampleGround(WORLD.SHALIMAR_X) - cam.y;
  ctx.save();
  ctx.translate(sx, ground - 140);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-90, 140);
  ctx.lineTo(-90, 0);
  ctx.quadraticCurveTo(0, -50, 90, 0);
  ctx.lineTo(90, 140);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(-78, 20, 156, 100);
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('شاليمار', 0, 76);
  ctx.restore();
};

const drawBossZone = (ctx, cam) => {
  const sx = WORLD.BOSS_X - cam.x;
  const ground = sampleGround(WORLD.BOSS_X) - cam.y;
  ctx.fillStyle = 'rgba(255,96,96,0.12)';
  ctx.fillRect(sx - 200, ground - 200, 400, 200);
  ctx.strokeStyle = 'rgba(255,96,96,0.7)';
  ctx.setLineDash([18, 10]);
  ctx.strokeRect(sx - 180, ground - 160, 360, 180);
  ctx.setLineDash([]);
};

const drawDogs = (ctx, dogs, cam, settings) => {
  dogs.forEach(dog => {
    const sx = dog.x - cam.x;
    if (sx < -200 || sx > ctx.canvas.width + 200) return;
    const bodyY = dog.y - cam.y - 28;
    ctx.save();
    ctx.translate(sx, bodyY);
    if (dog.hit) {
      ctx.rotate(0.35);
      ctx.globalAlpha = dog.fade;
    }
    // جسم محايد + تفاصيل بسيطة
    ctx.fillStyle = '#5a4b3a';
    ctx.fillRect(-22, -12, 44, 24);
    // رأس + أذن + ذيل
    ctx.fillStyle = '#6b5a45';
    ctx.fillRect(16, -18, 18, 14);
    ctx.fillRect(-30, -8, 8, 8);
    // أرجل
    ctx.fillStyle = '#7b6a55';
    ctx.fillRect(-20, 10, 7, 14);
    ctx.fillRect(-2, 10, 7, 14);
    ctx.fillRect(10, 10, 7, 14);
    ctx.fillRect(22, 10, 7, 14);
    // عين وأنف
    ctx.fillStyle = '#fff';
    ctx.fillRect(28, -24, 5, 5);
    ctx.fillStyle = '#000';
    ctx.fillRect(30, -22, 2, 2);
    ctx.restore();
    if (dog.hit && settings.blood) {
      ctx.fillStyle = 'rgba(255,0,0,0.25)';
      ctx.beginPath();
      ctx.arc(sx + 10, dog.y - 16 - cam.y, 22, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.globalAlpha = 1;
};

const drawParticles = (ctx, particles, cam, settings) => {
  ctx.strokeStyle = 'rgba(46,34,24,0.35)';
  ctx.lineWidth = 4;
  particles.tracks.forEach(track => {
    ctx.globalAlpha = Math.max(0, track.life / 1.6);
    ctx.beginPath();
    ctx.moveTo(track.x - cam.x - 12, track.y - cam.y);
    ctx.lineTo(track.x - cam.x + 12, track.y - cam.y + 2);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  if (settings.blood) {
    ctx.fillStyle = 'rgba(200,0,0,0.6)';
    particles.blood.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life / 0.6);
      ctx.beginPath();
      ctx.arc(p.x - cam.x, p.y - cam.y, 6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = 'rgba(232,200,140,0.35)';
  particles.sand.forEach(p => {
    const alpha = Math.max(0, p.life / 0.9);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.ellipse(p.x - cam.x + (1 - alpha) * 80 * p.dir, p.y - cam.y, 34 * alpha, 14 * alpha, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(180,215,255,0.22)';
  particles.wind.forEach(p => {
    const alpha = Math.max(0, p.life / 0.8);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.ellipse(p.x - cam.x, p.y - cam.y, 46 * alpha, 12 * alpha, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
};

const drawFinish = (ctx, cam) => {
  const sx = WORLD.FINISH_X - cam.x;
  const ground = sampleGround(WORLD.FINISH_X) - cam.y;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(sx - 4, ground - 160, 8, 160);
  ctx.fillStyle = '#ef3a5d';
  ctx.fillRect(sx, ground - 160, 72, 42);
  ctx.fillStyle = '#000';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏁', sx + 36, ground - 130);
};

const drawCar = (ctx, player, input, cam) => {
  const baseX = player.x - cam.x;
  const baseY = player.y - cam.y - 18;
  const jitter = (Math.random() - 0.5) * cam.shake * 4;
  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.rotate(cam.roll * 0.8);
  ctx.translate(jitter, jitter * 0.6);

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 28, 36, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  const bodyGrad = ctx.createLinearGradient(0, -10, 0, 24);
  bodyGrad.addColorStop(0, '#1a1f28');
  bodyGrad.addColorStop(0.5, '#0f141c');
  bodyGrad.addColorStop(1, '#080b10');
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = '#0a0c10';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-30, -8);
  ctx.lineTo(32, -8);
  ctx.lineTo(26, 12);
  ctx.lineTo(-26, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#121a26';
  ctx.fillRect(-4, -6, 26, 12);
  ctx.strokeRect(-4, -6, 26, 12);
  ctx.fillStyle = '#0e1420';
  ctx.fillRect(-30, -14, 24, 12);
  ctx.strokeRect(-30, -14, 24, 12);
  ctx.fillStyle = '#0a1018';
  ctx.fillRect(-28, -12, 16, 8);

  ctx.fillStyle = '#20283a';
  ctx.fillRect(-34, -4, 18, 8);
  ctx.fillStyle = '#161e2c';
  ctx.fillRect(-33, -3, 16, 6);
  ctx.fillStyle = '#e32929';
  ctx.font = 'bold 10px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('GMC', -32, 3);

  const braking = input?.rawLeft && !input?.rawRight;
  ctx.fillStyle = PAL.head;
  ctx.fillRect(-16, 2, 8, 6);
  ctx.fillStyle = braking ? PAL.brake : '#ffb84d';
  ctx.fillRect(-36, 2, 5, 6);

  ctx.globalAlpha = 0.28;
  ctx.fillStyle = PAL.head;
  ctx.beginPath();
  ctx.ellipse(-12, 4, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (player.boostSec > 0) {
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = PAL.neon;
    ctx.beginPath();
    ctx.ellipse(30, 4, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.ellipse(40, 4, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = '#0a0d12';
  ctx.beginPath();
  ctx.arc(-18, 14, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(18, 14, 6.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

const drawSpeedometer = (ctx, player, W, H) => {
  const kmh = kmhFromVelocity(player.vx);
  const cx0 = W - 120;
  const cy0 = H - 120;
  const R = 82;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = PAL.gaugeBg;
  ctx.beginPath();
  ctx.arc(cx0, cy0, R + 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const MAX = 220;
  const frac = Math.min(1, kmh / MAX);
  ctx.strokeStyle = '#1b263a';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(cx0, cy0, R, Math.PI * 0.75, Math.PI * 2.25);
  ctx.stroke();

  ctx.strokeStyle = kmh > 160 ? PAL.gaugeHi : PAL.gaugeOk;
  ctx.beginPath();
  ctx.arc(cx0, cy0, R, Math.PI * 0.75, Math.PI * 0.75 + frac * (Math.PI * 1.5));
  ctx.stroke();

  const angle = Math.PI * 0.75 + frac * (Math.PI * 1.5);
  ctx.strokeStyle = PAL.neon;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx0, cy0);
  ctx.lineTo(cx0 + Math.cos(angle) * R, cy0 + Math.sin(angle) * R);
  ctx.stroke();

  ctx.fillStyle = '#cfe6ff';
  ctx.font = 'bold 24px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(kmh)}`, cx0, cy0 + 10);
  ctx.font = '12px system-ui';
  ctx.fillText('km/h', cx0, cy0 + 28);
  ctx.restore();
};

const drawScreenFX = (ctx, W, H, settings, camShake) => {
  ctx.save();
  ctx.lineCap = 'round';
  FX.speedLines.forEach(line => {
    ctx.globalAlpha = line.a;
    ctx.strokeStyle = 'rgba(220,240,255,0.85)';
    ctx.lineWidth = Math.max(1, line.w - 0.5);
    ctx.beginPath();
    ctx.moveTo(line.x, line.y - line.len * 0.5);
    ctx.lineTo(line.x, line.y + line.len * 0.5);
    ctx.stroke();
  });
  ctx.restore();

  const vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.7);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, settings.bloom ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.3)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  if (settings.bloom) {
    ctx.globalAlpha = Math.min(0.35, camShake * 0.4);
    ctx.fillStyle = 'rgba(0, 229, 255, 0.18)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
};

export const renderScene = (ctx, payload) => {
  const { viewport, player, entities, particles, settings, camera, dt } = payload;
  const W = viewport.width;
  const H = viewport.height;
  const stars = payload.stars;
  const input = payload.input;

  ctx.save();
  ctx.translate(0, H * 0.02);

  drawSky(ctx, W, H, camera, stars);
  ctx.save();
  ctx.translate(0, -camera.y);
  ctx.rotate(camera.roll);
  drawDunes(ctx, W, camera);
  drawSpectators(ctx, entities.spectators, camera, dt);
  drawChair(ctx, camera);
  drawDogs(ctx, entities.dogs, camera, settings);
  drawParticles(ctx, particles, camera, settings);
  drawGate(ctx, camera);
  drawBossZone(ctx, camera);
  drawFinish(ctx, camera);
  drawCar(ctx, player, input, camera);
  ctx.restore();

  ctx.restore();

  drawSpeedometer(ctx, player, W, H);
  drawScreenFX(ctx, W, H, settings, camera.shake);
};
