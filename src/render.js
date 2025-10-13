import { sampleGround, createParallax } from './world.js';
import { clamp } from './utils.js';

const parallaxLayers = createParallax();

export const createRenderer = (ctx, canvas) => {
  const renderState = {
    cameraX: 0,
    width: canvas.clientWidth,
    height: canvas.clientHeight,
  };

  const drawSky = cameraX => {
    const { width, height } = renderState;
    const grd = ctx.createLinearGradient(0, 0, 0, height);
    grd.addColorStop(0, '#09142b');
    grd.addColorStop(0.55, '#1a2f5a');
    grd.addColorStop(1, '#6f4a2b');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);
    parallaxLayers.forEach(layer => {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      for (let i = -1; i <= 4; i += 1) {
        const baseX = (i * layer.width) - (cameraX * layer.speed % layer.width);
        const y = height * 0.6 + Math.sin(i) * layer.amplitude;
        if (i === -1) ctx.moveTo(baseX, y);
        ctx.quadraticCurveTo(baseX + layer.width / 2, y + Math.sin(i + 1) * layer.amplitude, baseX + layer.width, y);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();
    });
  };

  const drawGround = cameraX => {
    const { width, height } = renderState;
    ctx.beginPath();
    const step = 20;
    for (let sx = -step; sx <= width + step; sx += step) {
      const worldX = sx + cameraX;
      const y = sampleGround(worldX);
      if (sx === -step) ctx.moveTo(sx, y);
      else ctx.lineTo(sx, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = '#8a5d37';
    ctx.fill();
  };

  const drawSandBand = (cameraX, from, to) => {
    if (to <= from) return;
    const { height } = renderState;
    const sx = Math.max(0, from - cameraX);
    const ex = to - cameraX;
    ctx.fillStyle = 'rgba(230,196,122,0.18)';
    ctx.fillRect(sx, 0, ex - sx, height);
  };

  const drawChair = (chair, cameraX) => {
    const sx = chair.x - cameraX;
    if (sx < -160 || sx > renderState.width + 160) return;
    const sy = sampleGround(chair.x);
    ctx.fillStyle = '#5b2b1a';
    ctx.fillRect(sx - 16, sy - 54, 32, 12);
    ctx.fillRect(sx - 18, sy - 44, 36, 32);
    ctx.fillRect(sx - 12, sy - 24, 10, 26);
    ctx.fillRect(sx + 4, sy - 24, 10, 26);
  };

  const drawGate = (x, cameraX) => {
    const sx = x - cameraX;
    if (sx < -260 || sx > renderState.width + 260) return;
    const ground = sampleGround(x);
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
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('شاليمار', 0, 76);
    ctx.restore();
  };

  const drawBossZone = (x, cameraX) => {
    const sx = x - cameraX;
    const ground = sampleGround(x);
    ctx.fillStyle = 'rgba(255,96,96,0.12)';
    ctx.fillRect(sx - 200, ground - 200, 400, 200);
    ctx.strokeStyle = 'rgba(255,96,96,0.7)';
    ctx.setLineDash([18, 10]);
    ctx.strokeRect(sx - 180, ground - 160, 360, 180);
    ctx.setLineDash([]);
  };

  const drawFinish = (x, cameraX) => {
    const sx = x - cameraX;
    const ground = sampleGround(x);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx - 4, ground - 160, 8, 160);
    ctx.fillStyle = '#ef3a5d';
    ctx.fillRect(sx, ground - 160, 72, 42);
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('🏁', sx + 36, ground - 130);
  };

  const drawSpectators = (spectators, cameraX, dt) => {
    spectators.forEach(sp => {
      const sx = sp.x - cameraX;
      if (sx < -120 || sx > renderState.width + 120) return;
      const sy = sampleGround(sp.x) - sp.offset + Math.sin(sp.sway) * 4;
      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 12, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1f2b';
      ctx.fillRect(sx - 10, sy, 20, 34);
      sp.sway += dt * 2;
    });
  };

  const drawDogs = (dogs, cameraX, showBlood) => {
    dogs.forEach(dog => {
      const sx = dog.x - cameraX;
      if (sx < -200 || sx > renderState.width + 200) return;
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
  };

  const drawTracks = (tracks, cameraX) => {
    ctx.strokeStyle = 'rgba(46,34,24,0.35)';
    ctx.lineWidth = 4;
    tracks.forEach(track => {
      ctx.globalAlpha = clamp(track.life / 1.6, 0, 1);
      ctx.beginPath();
      ctx.moveTo(track.x - cameraX - 12, track.y);
      ctx.lineTo(track.x - cameraX + 12, track.y + 2);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  };

  const drawBlood = (blood, cameraX) => {
    ctx.fillStyle = 'rgba(200,0,0,0.6)';
    blood.forEach(p => {
      ctx.globalAlpha = clamp(p.life / 0.6, 0, 1);
      ctx.beginPath();
      ctx.arc(p.x - cameraX, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  };

  const drawSand = (sand, cameraX) => {
    sand.forEach(p => {
      const alpha = clamp(p.life / 0.9, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(232,200,140,0.35)';
      ctx.beginPath();
      ctx.ellipse(
        p.x - cameraX + (1 - alpha) * 80 * p.dir,
        p.y,
        34 * alpha,
        14 * alpha,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  };

  const drawCar = (player, cameraX) => {
    const sx = player.x - cameraX;
    const ground = player.y;
    const bodyY = ground - 68 - 22;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(sx, ground - 6, 68, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(sx - 52, ground - 22, 22, 0, Math.PI * 2);
    ctx.arc(sx + 56, ground - 22, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(sx - 52, ground - 22, 12, 0, Math.PI * 2);
    ctx.arc(sx + 56, ground - 22, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#050608';
    ctx.beginPath();
    ctx.moveTo(sx - 84, bodyY + 14);
    ctx.quadraticCurveTo(sx - 82, bodyY - 16, sx - 42, bodyY - 42);
    ctx.lineTo(sx + 38, bodyY - 46);
    ctx.quadraticCurveTo(sx + 70, bodyY - 48, sx + 84, bodyY - 8);
    ctx.lineTo(sx + 86, bodyY + 34);
    ctx.lineTo(sx - 84, bodyY + 34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1f344e';
    ctx.beginPath();
    ctx.moveTo(sx - 36, bodyY - 36);
    ctx.lineTo(sx + 20, bodyY - 40);
    ctx.lineTo(sx + 12, bodyY - 8);
    ctx.lineTo(sx - 32, bodyY - 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1d1d1d';
    ctx.fillRect(sx + 42, bodyY + 4, 52, 28);
    ctx.fillStyle = '#555';
    ctx.fillRect(sx + 46, bodyY + 8, 44, 6);
    ctx.fillRect(sx + 46, bodyY + 18, 44, 6);
    ctx.fillStyle = '#ff3b4d';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GMC', sx + 68, bodyY + 22);
    const lamp = player.boostSec > 0 ? '#ffe56a' : '#ffdca1';
    ctx.fillStyle = lamp;
    ctx.fillRect(sx + 84, bodyY + 6, 10, 14);
    ctx.fillRect(sx - 88, bodyY + 6, 12, 14);
  };

  const renderScene = payload => {
    renderState.width = payload.viewport.width;
    renderState.height = payload.viewport.height;
    renderState.cameraX = clamp(
      payload.player.x - renderState.width * 0.35,
      0,
      payload.worldEnd - renderState.width * 0.3,
    );
    drawSky(renderState.cameraX);
    drawSand(payload.particles.sand, renderState.cameraX);
    drawGround(renderState.cameraX);
    drawSandBand(renderState.cameraX, payload.regions.SAND_FROM, payload.regions.SAND_TO);
    drawSpectators(payload.entities.spectators, renderState.cameraX, payload.dt);
    drawChair(payload.entities.chair, renderState.cameraX);
    drawDogs(payload.entities.dogs, renderState.cameraX, payload.settings.blood);
    drawTracks(payload.particles.tracks, renderState.cameraX);
    drawBlood(payload.particles.blood, renderState.cameraX);
    drawGate(payload.regions.SHALIMAR_X, renderState.cameraX);
    drawBossZone(payload.regions.BOSS_X, renderState.cameraX);
    drawFinish(payload.regions.FINISH_X, renderState.cameraX);
    drawCar(payload.player, renderState.cameraX);
  };

  return {
    renderScene,
  };
};
