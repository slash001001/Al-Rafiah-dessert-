import { WORLD, sampleGround } from './world.js';
import { kmhFromVelocity } from './utils.js';

const PAL = {
  skyTop: '#061428',
  skyBot: '#0a1526',
  duneFar: '#0e1722',
  duneMid: '#132033',
  duneMain: '#a97a4b',
  duneShade: '#8b6a43',
  neon: '#00e5ff',
  accent: '#ffd166',
  brake: '#ff3b3b',
  head: '#fff7b0',
  gaugeBg: '#0d1320',
  gaugeOk: '#3ab26c',
  gaugeHi: '#ff6b6b',
};

const FX = {
  stars: [],
  speedLines: [],
};

export const ensureStars = () => {
  if (FX.stars.length) return;
  for (let i = 0; i < 140; i += 1) {
    FX.stars.push({
      x: Math.random() * WORLD.LENGTH,
      y: Math.random() * 0.4 + 0.05,
      a: Math.random() * 0.6 + 0.2,
    });
  }
};

export const spawnSpeedLines = (kmh, W, H) => {
  if (kmh < 120) return;
  const intensity = Math.min(14, Math.floor((kmh - 110) / 16));
  for (let i = 0; i < intensity; i += 1) {
    if (Math.random() > 0.4) continue;
    FX.speedLines.push({
      x: Math.random() * W,
      y: Math.random() * H * 0.48 + H * 0.12,
      len: 10 + Math.random() * 60,
      w: 1 + Math.random() * 2,
      a: 0.35 + Math.random() * 0.25,
    });
  }
};

export const updateSpeedLines = dt => {
  FX.speedLines = FX.speedLines
    .map(line => ({
      ...line,
      len: line.len * 1.05,
      a: line.a * Math.pow(0.9, dt * 60),
    }))
    .filter(line => line.a > 0.05);
};

const drawSky = (ctx, W, H, camX) => {
  ensureStars();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, PAL.skyTop);
  g.addColorStop(1, PAL.skyBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.fillStyle = '#cfe6ff';
  FX.stars.forEach(star => {
    const sx = ((star.x - camX * 0.2) % (W + 400) + (W + 400)) % (W + 400) - 200;
    const sy = H * star.y;
    ctx.globalAlpha = star.a;
    ctx.fillRect(sx, sy, 2, 2);
  });
  ctx.restore();

  ctx.fillStyle = PAL.duneFar;
  for (let sx = -40; sx <= W + 80; sx += 8) {
    const wx = camX * 0.35 + sx;
    const yy = H * 0.7 - Math.sin(wx * 0.004) * 12;
    ctx.fillRect(sx, yy, 80, H - yy);
  }

  ctx.fillStyle = PAL.duneMid;
  for (let sx = -40; sx <= W + 80; sx += 10) {
    const wx = camX * 0.55 + sx;
    const yy = H * 0.79 - Math.sin(wx * 0.006) * 16;
    ctx.fillRect(sx, yy, 80, H - yy);
  }
};

const drawMainDunes = (ctx, W, camX) => {
  ctx.beginPath();
  ctx.moveTo(0, 600);
  for (let x = camX; x <= camX + W + 8; x += 8) ctx.lineTo(x - camX, sampleGround(x));
  ctx.lineTo(W, 600);
  ctx.closePath();
  ctx.fillStyle = PAL.duneMain;
  ctx.fill();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = PAL.duneShade;
  ctx.fill();
  ctx.globalAlpha = 1;
};

const drawSpectators = (ctx, spectators, camX, dt) => {
  spectators.forEach(sp => {
    const sx = sp.x - camX;
    if (sx < -120 || sx > ctx.canvas.width + 120) return;
    const sy = sampleGround(sp.x) - sp.offset + Math.sin(sp.sway) * 4;
    ctx.fillStyle = sp.color;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 12, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1f2b';
    ctx.fillRect(sx - 10, sy, 20, 34);
    sp.sway += dt * 1.8;
  });
};

const drawChair = (ctx, camX) => {
  const sx = WORLD.CHAIR_X - camX;
  if (sx < -160 || sx > ctx.canvas.width + 160) return;
  const sy = sampleGround(WORLD.CHAIR_X);
  ctx.fillStyle = '#5b2b1a';
  ctx.fillRect(sx - 16, sy - 54, 32, 12);
  ctx.fillRect(sx - 18, sy - 44, 36, 32);
  ctx.fillRect(sx - 12, sy - 24, 10, 26);
  ctx.fillRect(sx + 4, sy - 24, 10, 26);
};

const drawDogs = (ctx, dogs, camX, showBlood) => {
  dogs.forEach(dog => {
    const sx = dog.x - camX;
    if (sx < -200 || sx > ctx.canvas.width + 200) return;
    const bodyY = dog.y - 28;
    ctx.save();
    ctx.translate(sx, bodyY);
    if (dog.hit) {
      ctx.rotate(0.35);
      ctx.globalAlpha = dog.fade;
    }
    ctx.fillStyle = '#2b2722';
    ctx.fillRect(-22, -12, 44, 24);
    ctx.fillRect(16, -20, 20, 16);
    ctx.fillStyle = '#d9c38f';
    ctx.fillRect(-20, 10, 8, 16);
    ctx.fillRect(6, 10, 8, 16);
    ctx.fillRect(-2, 10, 8, 16);
    ctx.fillRect(20, 10, 8, 16);
    ctx.fillStyle = '#443c33';
    ctx.fillRect(18, -32, 18, 16);
    ctx.fillStyle = '#fff';
    ctx.fillRect(28, -28, 6, 6);
    ctx.fillStyle = '#000';
    ctx.fillRect(30, -26, 3, 3);
    ctx.restore();
    if (dog.hit && showBlood) {
      ctx.fillStyle = 'rgba(255,0,0,0.25)';
      ctx.beginPath();
      ctx.arc(sx + 10, dog.y - 16, 22, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.globalAlpha = 1;
};

const drawParticles = (ctx, particles, camX, settings) => {
  ctx.strokeStyle = 'rgba(46,34,24,0.35)';
  ctx.lineWidth = 4;
  particles.tracks.forEach(track => {
    ctx.globalAlpha = Math.max(0, track.life / 1.6);
    ctx.beginPath();
    ctx.moveTo(track.x - camX - 12, track.y);
    ctx.lineTo(track.x - camX + 12, track.y + 2);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  if (settings.blood) {
    ctx.fillStyle = 'rgba(200,0,0,0.6)';
    particles.blood.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life / 0.6);
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = 'rgba(232,200,140,0.35)';
  particles.sand.forEach(p => {
    const alpha = Math.max(0, p.life / 0.9);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.ellipse(p.x - camX + (1 - alpha) * 80 * p.dir, p.y, 34 * alpha, 14 * alpha, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(180,215,255,0.22)';
  particles.wind.forEach(p => {
    const alpha = Math.max(0, p.life / 0.8);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.ellipse(p.x - camX, p.y, 46 * alpha, 12 * alpha, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
};

const drawGate = (ctx, camX) => {
  const sx = WORLD.SHALIMAR_X - camX;
  if (sx < -260 || sx > ctx.canvas.width + 260) return;
  const ground = sampleGround(WORLD.SHALIMAR_X);
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

const drawBossZone = (ctx, camX) => {
  const sx = WORLD.BOSS_X - camX;
  const ground = sampleGround(WORLD.BOSS_X);
  ctx.fillStyle = 'rgba(255,96,96,0.12)';
  ctx.fillRect(sx - 200, ground - 200, 400, 200);
  ctx.strokeStyle = 'rgba(255,96,96,0.7)';
  ctx.setLineDash([18, 10]);
  ctx.strokeRect(sx - 180, ground - 160, 360, 180);
  ctx.setLineDash([]);
};

const drawFinish = (ctx, camX) => {
  const sx = WORLD.FINISH_X - camX;
  const ground = sampleGround(WORLD.FINISH_X);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(sx - 4, ground - 160, 8, 160);
  ctx.fillStyle = '#ef3a5d';
  ctx.fillRect(sx, ground - 160, 72, 42);
  ctx.fillStyle = '#000';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏁', sx + 36, ground - 130);
};

const drawCar = (ctx, player, input, camX) => {
  const baseX = player.x - camX;
  const baseY = player.y - 18;
  const jitter = (Math.random() - 0.5) * 2;
  ctx.save();
  ctx.translate(jitter, jitter * 0.8);

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(baseX, baseY + 28, 36, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  const bodyGrad = ctx.createLinearGradient(0, baseY - 10, 0, baseY + 24);
  bodyGrad.addColorStop(0, '#1a1f28');
  bodyGrad.addColorStop(0.5, '#0f141c');
  bodyGrad.addColorStop(1, '#080b10');
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = '#0a0c10';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(baseX - 30, baseY - 8);
  ctx.lineTo(baseX + 32, baseY - 8);
  ctx.lineTo(baseX + 26, baseY + 12);
  ctx.lineTo(baseX - 26, baseY + 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#121a26';
  ctx.fillRect(baseX - 4, baseY - 6, 26, 12);
  ctx.strokeRect(baseX - 4, baseY - 6, 26, 12);
  ctx.fillStyle = '#0e1420';
  ctx.fillRect(baseX - 30, baseY - 14, 24, 12);
  ctx.strokeRect(baseX - 30, baseY - 14, 24, 12);
  ctx.fillStyle = '#0a1018';
  ctx.fillRect(baseX - 28, baseY - 12, 16, 8);

  ctx.fillStyle = '#20283a';
  ctx.fillRect(baseX - 34, baseY - 4, 18, 8);
  ctx.fillStyle = '#161e2c';
  ctx.fillRect(baseX - 33, baseY - 3, 16, 6);
  ctx.fillStyle = '#e32929';
  ctx.font = 'bold 10px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('GMC', baseX - 32, baseY + 3);

  const braking = input?.rawLeft && !input?.rawRight;
  ctx.fillStyle = PAL.head;
  ctx.fillRect(baseX - 16, baseY + 2, 8, 6);
  ctx.fillStyle = braking ? PAL.brake : '#ffb84d';
  ctx.fillRect(baseX - 36, baseY + 2, 5, 6);

  ctx.globalAlpha = 0.28;
  ctx.fillStyle = PAL.head;
  ctx.beginPath();
  ctx.ellipse(baseX - 12, baseY + 4, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (player.boostSec > 0) {
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = PAL.neon;
    ctx.beginPath();
    ctx.ellipse(baseX + 30, baseY + 4, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.ellipse(baseX + 40, baseY + 4, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = '#0a0d12';
  ctx.beginPath();
  ctx.arc(baseX - 18, baseY + 14, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(baseX + 18, baseY + 14, 6.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

const drawHUDGauge = (ctx, kmh, W, H) => {
  const cx0 = W - 120;
  const cy0 = H - 110;
  const R = 80;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = PAL.gaugeBg;
  ctx.beginPath();
  ctx.arc(cx0, cy0, R + 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const MAX = 220;
  const fraction = Math.min(1, kmh / MAX);
  ctx.strokeStyle = '#1b263a';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(cx0, cy0, R, Math.PI * 0.75, Math.PI * 2.25);
  ctx.stroke();

  ctx.strokeStyle = kmh > 160 ? PAL.gaugeHi : PAL.gaugeOk;
  ctx.beginPath();
  ctx.arc(cx0, cy0, R, Math.PI * 0.75, Math.PI * 0.75 + fraction * (Math.PI * 1.5));
  ctx.stroke();

  const angle = Math.PI * 0.75 + fraction * (Math.PI * 1.5);
  ctx.strokeStyle = PAL.neon;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx0, cy0);
  ctx.lineTo(cx0 + Math.cos(angle) * R, cy0 + Math.sin(angle) * R);
  ctx.stroke();

  ctx.fillStyle = '#cfe6ff';
  ctx.font = 'bold 22px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(kmh)}`, cx0, cy0 + 8);
  ctx.font = '12px system-ui';
  ctx.fillText('km/h', cx0, cy0 + 26);
  ctx.restore();
};

const drawScreenFX = (ctx, W, H, hudHidden) => {
  ctx.save();
  FX.speedLines.forEach(line => {
    ctx.globalAlpha = line.a;
    ctx.strokeStyle = '#cfe6ff';
    ctx.lineWidth = line.w;
    ctx.beginPath();
    ctx.moveTo(line.x, line.y - line.len * 0.5);
    ctx.lineTo(line.x, line.y + line.len * 0.5);
    ctx.stroke();
  });
  ctx.restore();

  const vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.7);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, hudHidden ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
};

export const renderScene = (ctx, payload) => {
  const { viewport, player, particles, entities, settings } = payload;
  const W = viewport.width;
  const H = viewport.height;
  const cam = payload.camera;

  const targetCam = Math.max(0, Math.min(WORLD.LENGTH, player.x - W * 0.35));
  cam.x += (targetCam - cam.x) * 0.06;
  const shake = cam.shake || 0;
  const shakeX = (Math.random() - 0.5) * shake;
  const shakeY = (Math.random() - 0.5) * shake * 0.35;

  ctx.save();
  ctx.translate(0, shakeY);

  drawSky(ctx, W, H, cam.x);
  drawMainDunes(ctx, W, cam.x);
  drawSpectators(ctx, entities.spectators, cam.x, payload.dt);
  drawChair(ctx, cam.x);
  drawDogs(ctx, entities.dogs, cam.x, settings.blood);
  drawParticles(ctx, particles, cam.x, settings);
  drawGate(ctx, cam.x);
  drawBossZone(ctx, cam.x);
  drawFinish(ctx, cam.x);
  drawCar(ctx, player, payload.input, cam.x);

  ctx.restore();

  drawHUDGauge(ctx, kmhFromVelocity(player.vx), W, H);
  drawScreenFX(ctx, W, H, settings.hudHidden);
};
