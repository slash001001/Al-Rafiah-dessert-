import { sampleGround } from './world.js';
import { clamp } from './utils.js';

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

let cx;
let W = 0;
let H = 0;

const cam = { x: 0, shake: 0, renderX: 0, renderY: 0 };
const FX = { stars: [], speedLines: [] };

const ensureStars = () => {
  if (FX.stars.length) return;
  const COUNT = 140;
  for (let i = 0; i < COUNT; i += 1) {
    FX.stars.push({
      x: Math.random() * 12000,
      y: Math.random() * 0.4 + 0.05,
      a: Math.random() * 0.6 + 0.2,
    });
  }
};

const KMH = vx => Math.round(Math.abs(vx) * 0.36);

const wrapScreenX = x => {
  const span = W + 200;
  return ((x % span) + span) % span;
};

const drawNFSSkyParallax = () => {
  ensureStars();
  const g = cx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, PAL.skyTop);
  g.addColorStop(1, PAL.skyBot);
  cx.fillStyle = g;
  cx.fillRect(0, 0, W, H);

  cx.save();
  cx.fillStyle = '#cfe6ff';
  for (const s of FX.stars) {
    const sx = wrapScreenX(s.x - cam.renderX * 0.2) - 100;
    const sy = H * s.y;
    cx.globalAlpha = s.a;
    cx.fillRect(sx, sy, 2, 2);
  }
  cx.restore();

  cx.fillStyle = PAL.duneFar;
  for (let sx = -40; sx <= W + 80; sx += 8) {
    const wx = cam.renderX * 0.35 + sx;
    const yy = H * 0.7 - Math.sin(wx * 0.004) * 12;
    cx.fillRect(sx, yy, 80, H - yy);
  }

  cx.fillStyle = PAL.duneMid;
  for (let sx = -40; sx <= W + 80; sx += 10) {
    const wx = cam.renderX * 0.55 + sx;
    const yy = H * 0.78 - Math.sin(wx * 0.006) * 16;
    cx.fillRect(sx, yy, 80, H - yy);
  }
};

const drawMainDunes = camX => {
  const path = new Path2D();
  path.moveTo(0, H);
  for (let worldX = camX; worldX <= camX + W + 8; worldX += 8) {
    path.lineTo(worldX - camX, sampleGround(worldX));
  }
  path.lineTo(W, H);
  path.closePath();
  cx.fillStyle = PAL.duneMain;
  cx.fill(path);
  cx.globalAlpha = 0.18;
  cx.fillStyle = PAL.duneShade;
  cx.fill(path);
  cx.globalAlpha = 1;
};

const drawSpectators = (spectators, dt) => {
  spectators.forEach(sp => {
    const sx = sp.x - cam.renderX;
    if (sx < -120 || sx > W + 120) return;
    const sy = sampleGround(sp.x) - sp.offset + Math.sin(sp.sway) * 4;
    cx.fillStyle = sp.color;
    cx.beginPath();
    cx.ellipse(sx, sy, 12, 24, 0, 0, Math.PI * 2);
    cx.fill();
    cx.fillStyle = '#1a1f2b';
    cx.fillRect(sx - 10, sy, 20, 34);
    sp.sway += dt * 2;
  });
};

const drawChair = chair => {
  const sx = chair.x - cam.renderX;
  if (sx < -160 || sx > W + 160) return;
  const sy = sampleGround(chair.x);
  cx.fillStyle = '#5b2b1a';
  cx.fillRect(sx - 16, sy - 54, 32, 12);
  cx.fillRect(sx - 18, sy - 44, 36, 32);
  cx.fillRect(sx - 12, sy - 24, 10, 26);
  cx.fillRect(sx + 4, sy - 24, 10, 26);
};

const drawGate = x => {
  const sx = x - cam.renderX;
  if (sx < -260 || sx > W + 260) return;
  const ground = sampleGround(x);
  cx.save();
  cx.translate(sx, ground - 140);
  cx.strokeStyle = 'rgba(255,255,255,0.6)';
  cx.lineWidth = 6;
  cx.beginPath();
  cx.moveTo(-90, 140);
  cx.lineTo(-90, 0);
  cx.quadraticCurveTo(0, -50, 90, 0);
  cx.lineTo(90, 140);
  cx.stroke();
  cx.fillStyle = 'rgba(255,255,255,0.12)';
  cx.fillRect(-78, 20, 156, 100);
  cx.fillStyle = '#ffb347';
  cx.textAlign = 'center';
  cx.font = 'bold 24px sans-serif';
  cx.fillText('شاليمار', 0, 76);
  cx.restore();
};

const drawBossZone = x => {
  const sx = x - cam.renderX;
  const ground = sampleGround(x);
  cx.fillStyle = 'rgba(255,96,96,0.12)';
  cx.fillRect(sx - 200, ground - 200, 400, 200);
  cx.strokeStyle = 'rgba(255,96,96,0.7)';
  cx.setLineDash([18, 10]);
  cx.strokeRect(sx - 180, ground - 160, 360, 180);
  cx.setLineDash([]);
};

const drawFinish = x => {
  const sx = x - cam.renderX;
  const ground = sampleGround(x);
  cx.fillStyle = '#ffffff';
  cx.fillRect(sx - 4, ground - 160, 8, 160);
  cx.fillStyle = '#ef3a5d';
  cx.fillRect(sx, ground - 160, 72, 42);
  cx.fillStyle = '#000';
  cx.textAlign = 'center';
  cx.font = 'bold 22px sans-serif';
  cx.fillText('🏁', sx + 36, ground - 130);
};

const drawDogs = (dogs, showBlood) => {
  dogs.forEach(dog => {
    const sx = dog.x - cam.renderX;
    if (sx < -200 || sx > W + 200) return;
    const bodyY = dog.y - 28;
    cx.save();
    cx.translate(sx, bodyY);
    if (dog.hit) {
      cx.rotate(0.35);
      cx.globalAlpha = dog.fade;
    }
    cx.fillStyle = '#2b2722';
    cx.fillRect(-22, -12, 44, 24);
    cx.fillRect(16, -20, 20, 16);
    cx.fillStyle = '#d9c38f';
    cx.fillRect(-20, 10, 8, 16);
    cx.fillRect(6, 10, 8, 16);
    cx.fillRect(-2, 10, 8, 16);
    cx.fillRect(20, 10, 8, 16);
    cx.fillStyle = '#443c33';
    cx.fillRect(18, -32, 18, 16);
    cx.fillStyle = '#fff';
    cx.fillRect(28, -28, 6, 6);
    cx.fillStyle = '#000';
    cx.fillRect(30, -26, 3, 3);
    cx.restore();
    if (dog.hit && showBlood) {
      cx.fillStyle = 'rgba(255,0,0,0.25)';
      cx.beginPath();
      cx.arc(sx + 10, dog.y - 16, 22, 0, Math.PI * 2);
      cx.fill();
    }
  });
  cx.globalAlpha = 1;
};

const drawTracks = tracks => {
  cx.strokeStyle = 'rgba(46,34,24,0.35)';
  cx.lineWidth = 4;
  tracks.forEach(track => {
    cx.globalAlpha = clamp(track.life / 1.6, 0, 1);
    cx.beginPath();
    cx.moveTo(track.x - cam.renderX - 12, track.y);
    cx.lineTo(track.x - cam.renderX + 12, track.y + 2);
    cx.stroke();
  });
  cx.globalAlpha = 1;
};

const drawBlood = blood => {
  cx.fillStyle = 'rgba(200,0,0,0.6)';
  blood.forEach(p => {
    cx.globalAlpha = clamp(p.life / 0.6, 0, 1);
    cx.beginPath();
    cx.arc(p.x - cam.renderX, p.y, 6, 0, Math.PI * 2);
    cx.fill();
  });
  cx.globalAlpha = 1;
};

const drawSand = sand => {
  sand.forEach(p => {
    const alpha = clamp(p.life / 0.9, 0, 1);
    cx.globalAlpha = alpha;
    cx.fillStyle = 'rgba(232,200,140,0.35)';
    cx.beginPath();
    cx.ellipse(p.x - cam.renderX + (1 - alpha) * 80 * p.dir, p.y, 34 * alpha, 14 * alpha, 0, 0, Math.PI * 2);
    cx.fill();
  });
  cx.globalAlpha = 1;
};

const drawCarNFS = (player, input) => {
  const baseX = player.x - cam.renderX;
  const baseY = player.y - 18;
  const jitter = cam.shake * 0.5;
  const jx = jitter ? (Math.random() - 0.5) * jitter : 0;
  const jy = jitter ? (Math.random() - 0.5) * jitter * 0.8 : 0;
  const braking = Boolean(input?.rawLeft && !input?.rawRight);

  cx.save();
  cx.translate(jx, jy);

  cx.fillStyle = 'rgba(0,0,0,0.25)';
  cx.beginPath();
  cx.ellipse(baseX, baseY + 28, 36, 12, 0, 0, Math.PI * 2);
  cx.fill();

  const bodyGrad = cx.createLinearGradient(0, baseY - 10, 0, baseY + 24);
  bodyGrad.addColorStop(0, '#1a1f28');
  bodyGrad.addColorStop(0.5, '#0f141c');
  bodyGrad.addColorStop(1, '#080b10');
  cx.fillStyle = bodyGrad;
  cx.strokeStyle = '#0a0c10';
  cx.lineWidth = 2.6;
  cx.beginPath();
  cx.moveTo(baseX - 30, baseY - 8);
  cx.lineTo(baseX + 32, baseY - 8);
  cx.lineTo(baseX + 26, baseY + 12);
  cx.lineTo(baseX - 26, baseY + 12);
  cx.closePath();
  cx.fill();
  cx.stroke();

  cx.fillStyle = '#121a26';
  cx.fillRect(baseX - 4, baseY - 6, 26, 12);
  cx.strokeRect(baseX - 4, baseY - 6, 26, 12);
  cx.fillStyle = '#0e1420';
  cx.fillRect(baseX - 30, baseY - 14, 24, 12);
  cx.strokeRect(baseX - 30, baseY - 14, 24, 12);
  cx.fillStyle = '#0a1018';
  cx.fillRect(baseX - 28, baseY - 12, 16, 8);

  cx.fillStyle = '#20283a';
  cx.fillRect(baseX - 34, baseY - 4, 18, 8);
  cx.fillStyle = '#161e2c';
  cx.fillRect(baseX - 33, baseY - 3, 16, 6);
  cx.fillStyle = '#e32929';
  cx.font = 'bold 10px system-ui';
  cx.textAlign = 'left';
  cx.fillText('GMC', baseX - 32, baseY + 3);

  cx.fillStyle = PAL.head;
  cx.fillRect(baseX - 16, baseY + 2, 8, 6);
  cx.fillStyle = braking ? PAL.brake : '#ffb84d';
  cx.fillRect(baseX - 36, baseY + 2, 5, 6);

  cx.globalAlpha = 0.28;
  cx.fillStyle = PAL.head;
  cx.beginPath();
  cx.ellipse(baseX - 12, baseY + 4, 12, 6, 0, 0, Math.PI * 2);
  cx.fill();
  cx.globalAlpha = 1;

  if (player.boostSec > 0) {
    cx.save();
    cx.fillStyle = PAL.neon;
    cx.globalAlpha = 0.65;
    cx.beginPath();
    cx.ellipse(baseX + 30, baseY + 4, 12, 5, 0, 0, Math.PI * 2);
    cx.fill();
    cx.globalAlpha = 0.28;
    cx.beginPath();
    cx.ellipse(baseX + 40, baseY + 4, 20, 8, 0, 0, Math.PI * 2);
    cx.fill();
    cx.restore();
  }

  cx.fillStyle = '#0a0d12';
  cx.beginPath();
  cx.arc(baseX - 18, baseY + 14, 6.5, 0, Math.PI * 2);
  cx.fill();
  cx.beginPath();
  cx.arc(baseX + 18, baseY + 14, 6.5, 0, Math.PI * 2);
  cx.fill();

  cx.restore();
};

const drawSpeedometer = player => {
  if (!W || !H) return;
  const speed = KMH(player.vx);
  const cx0 = W - 120;
  const cy0 = H - 110;
  const R = 80;
  cx.save();
  cx.globalAlpha = 0.9;
  cx.fillStyle = PAL.gaugeBg;
  cx.beginPath();
  cx.arc(cx0, cy0, R + 16, 0, Math.PI * 2);
  cx.fill();
  cx.globalAlpha = 1;

  const MAX = 220;
  const frac = Math.min(1, speed / MAX);
  cx.strokeStyle = '#1b263a';
  cx.lineWidth = 12;
  cx.beginPath();
  cx.arc(cx0, cy0, R, Math.PI * 0.75, Math.PI * 2.25);
  cx.stroke();

  cx.strokeStyle = speed > 160 ? PAL.gaugeHi : PAL.gaugeOk;
  cx.beginPath();
  cx.arc(cx0, cy0, R, Math.PI * 0.75, Math.PI * 0.75 + frac * (Math.PI * 1.5));
  cx.stroke();

  const ang = Math.PI * 0.75 + frac * (Math.PI * 1.5);
  cx.strokeStyle = PAL.neon;
  cx.lineWidth = 3;
  cx.beginPath();
  cx.moveTo(cx0, cy0);
  cx.lineTo(cx0 + Math.cos(ang) * R, cy0 + Math.sin(ang) * R);
  cx.stroke();

  cx.fillStyle = '#cfe6ff';
  cx.font = 'bold 22px system-ui';
  cx.textAlign = 'center';
  cx.fillText(`${speed}`, cx0, cy0 + 8);
  cx.font = '12px system-ui';
  cx.fillText('km/h', cx0, cy0 + 26);
  cx.restore();
};

const drawScreenFX = () => {
  if (!W || !H) return;
  cx.save();
  for (const s of FX.speedLines) {
    cx.globalAlpha = s.a;
    cx.strokeStyle = '#cfe6ff';
    cx.lineWidth = s.w;
    cx.beginPath();
    cx.moveTo(s.x, s.y - s.len * 0.5);
    cx.lineTo(s.x, s.y + s.len * 0.5);
    cx.stroke();
  }
  cx.restore();

  const vignette = cx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.7);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
  cx.fillStyle = vignette;
  cx.fillRect(0, 0, W, H);
};

export const cameraShakeTick = (kmh, boostActive, dtSec) => {
  const base = Math.min(3.5, kmh * 0.02) + (boostActive ? 1.2 : 0);
  cam.shake = cam.shake * 0.85 + base * 0.15;
  cam.shake *= Math.pow(0.92, dtSec * 60);
};

export const spawnSpeedLines = kmh => {
  if (!W || !H || kmh < 120) return;
  const intensity = Math.min(12, Math.floor((kmh - 120) / 18));
  for (let i = 0; i < intensity; i += 1) {
    if (Math.random() > 0.35) continue;
    FX.speedLines.push({
      x: Math.random() * W,
      y: Math.random() * H * 0.55 + H * 0.05,
      len: 12 + Math.random() * 70,
      w: 1 + Math.random() * 2,
      a: 0.35 + Math.random() * 0.25,
    });
  }
};

export const updateSpeedLines = dt => {
  const decay = Math.pow(0.88, dt * 60);
  for (let i = FX.speedLines.length - 1; i >= 0; i -= 1) {
    const s = FX.speedLines[i];
    s.len *= 1.05;
    s.a *= decay;
    if (s.a < 0.05) FX.speedLines.splice(i, 1);
  }
};

export const createRenderer = (ctx, canvas) => {
  cx = ctx;
  W = canvas.clientWidth || canvas.width || window.innerWidth || 1024;
  H = canvas.clientHeight || canvas.height || window.innerHeight || 576;
  ensureStars();

  return {
    renderScene(payload) {
      cx = ctx;
      W = payload.viewport.width || W;
      H = payload.viewport.height || H;
      ensureStars();

      const targetCam = clamp(payload.player.x - W / 3, 0, payload.worldEnd);
      cam.x += (targetCam - cam.x) * 0.06;

      const shakeX = (Math.random() - 0.5) * cam.shake;
      const shakeY = (Math.random() - 0.5) * cam.shake * 0.35;
      cam.renderX = cam.x + shakeX;
      cam.renderY = shakeY;

      cx.save();
      cx.translate(0, cam.renderY);

      drawNFSSkyParallax();
      drawMainDunes(cam.renderX);
      drawSpectators(payload.entities.spectators, payload.dt);
      drawChair(payload.entities.chair);
      drawDogs(payload.entities.dogs, payload.settings.blood);
      drawTracks(payload.particles.tracks);
      drawBlood(payload.particles.blood);
      drawGate(payload.regions.SHALIMAR_X);
      drawBossZone(payload.regions.BOSS_X);
      drawFinish(payload.regions.FINISH_X);

      drawCarNFS(payload.player, payload.input);
      drawSand(payload.particles.sand);

      cx.restore();

      drawSpeedometer(payload.player);
      drawScreenFX();

      cx.globalAlpha = 1;
    },
  };
};
