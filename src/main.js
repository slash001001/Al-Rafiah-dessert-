import { AudioManager } from './audio.js';
import { ITEMS, UPGRADE_KEYS, itemJoke, itemName, t } from './i18n.js';
import { loadState, saveState } from './storage.js';
import { Terrain } from './terrain.js';
import { TAU, angleDelta, clamp, formatInt, lerp, mixColor, normalizeAngle, smoothstep } from './math.js';

const COLORS = {
  night: '#060815',
  night2: '#12183e',
  cyan: '#00F5FF',
  magenta: '#FF2BD6',
  sand: '#D8B26E',
  sandDark: '#8b5b34',
  fire: '#FF7A1A',
  gold: '#F4C27A',
  white: '#F7FBFF'
};

const MAX_UPGRADE_LEVEL = 5;
const UPGRADE_COST = {
  engine: [90, 150, 240, 360, 520],
  tires: [80, 140, 230, 350, 500],
  suspension: [75, 130, 210, 330, 470],
  winch: [110, 190, 290, 430, 620]
};

const ITEM_KINDS = ['salt', 'knife', 'tongs', 'onion', 'mayo'];

class AlrafyahGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.audio = new AudioManager();
    this.persist = loadState();
    this.lang = this.persist.language || 'ar';
    this.state = 'menu';
    this.width = 1280;
    this.height = 720;
    this.dpr = 1;
    this.time = 0;
    this.last = performance.now();
    this.buttons = [];
    this.touchRects = {};
    this.keys = new Set();
    this.activePointers = new Map();
    this.pointerWasDown = false;
    this.toast = { text: '', timer: 0, tone: 'info' };
    this.screenShake = 0;
    this.menuCarX = 0;
    this.frame = 0;
    this.terrain = null;
    this.camera = { x: 0, y: 0 };
    this.particles = [];
    this.tracks = [];
    this.runSummary = null;
    this.upgradeMessage = '';
    this.upgradeMessageTimer = 0;
    this.setupEvents();
    this.resize();
    this.applyLangToDocument();
    this.resetRun(false);
    requestAnimationFrame((now) => this.loop(now));
    const loading = document.getElementById('loading');
    if (loading) setTimeout(() => loading.classList.add('hidden'), 350);
  }

  setupEvents() {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 150));
    window.addEventListener('keydown', (e) => {
      this.audio.ensure();
      this.keys.add(e.code);
      if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
      if (e.code === 'Enter' && this.state === 'menu') this.startRun();
      if (e.code === 'Escape') this.goMenu();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    const pointerDown = (e) => {
      this.audio.ensure();
      const p = this.eventToCanvas(e);
      this.activePointers.set(e.pointerId ?? 1, p);
      this.pointerWasDown = true;
      if (this.state !== 'play' || this.isUiPointer(p.x, p.y)) this.handleClick(p.x, p.y);
      this.canvas.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    };
    const pointerMove = (e) => {
      if (this.activePointers.has(e.pointerId ?? 1)) this.activePointers.set(e.pointerId ?? 1, this.eventToCanvas(e));
      e.preventDefault();
    };
    const pointerUp = (e) => {
      this.activePointers.delete(e.pointerId ?? 1);
      e.preventDefault();
    };
    this.canvas.addEventListener('pointerdown', pointerDown, { passive: false });
    this.canvas.addEventListener('pointermove', pointerMove, { passive: false });
    this.canvas.addEventListener('pointerup', pointerUp, { passive: false });
    this.canvas.addEventListener('pointercancel', pointerUp, { passive: false });
  }

  eventToCanvas(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.width / rect.width),
      y: (e.clientY - rect.top) * (this.height / rect.height)
    };
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const cssW = Math.max(320, Math.floor(rect.width || window.innerWidth));
    const cssH = Math.max(240, Math.floor(rect.height || window.innerHeight));
    this.width = cssW;
    this.height = cssH;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(cssW * this.dpr);
    this.canvas.height = Math.floor(cssH * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  applyLangToDocument() {
    document.documentElement.lang = this.lang;
    document.documentElement.dir = this.lang === 'ar' ? 'rtl' : 'ltr';
  }

  loop(now) {
    const dt = Math.min(1 / 24, Math.max(0.001, (now - this.last) / 1000));
    this.last = now;
    this.time += dt;
    this.frame += 1;
    this.update(dt);
    this.draw();
    requestAnimationFrame((n) => this.loop(n));
  }

  update(dt) {
    if (this.toast.timer > 0) this.toast.timer -= dt;
    if (this.upgradeMessageTimer > 0) this.upgradeMessageTimer -= dt;
    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 18);
    this.menuCarX = (this.menuCarX + dt * 75) % 2200;
    if (this.state === 'play') this.updatePlay(dt);
    else if (this.state === 'win') this.audio.setFire(true);
    else {
      this.audio.setEngine(0, 0, true);
      this.audio.setWind(0.1);
      this.audio.setHelicopter(false);
      this.audio.setFire(false);
    }
  }

  resetRun(rebuildTerrain = true) {
    this.terrain = rebuildTerrain || !this.terrain ? new Terrain(20260424) : this.terrain;
    this.camera = { x: 0, y: 260 };
    this.car = {
      x: 120,
      y: this.terrain.getY(120) - 66,
      vx: 0,
      vy: 0,
      angle: 0,
      angVel: 0,
      wheelRot: 0,
      grounded: false,
      sink: 0,
      flipTimer: 0,
      stuckTimer: 0,
      recovery: 0,
      lastRockDir: 0,
      rockPulse: 0,
      maxHeight: 0,
      winchCooldown: 0,
      winchPulse: 0,
      bubble: '',
      bubbleTimer: 0,
      finishHintShown: false
    };
    this.mood = 100;
    this.runScore = 0;
    this.runCoins = 0;
    this.runTime = 0;
    this.collected = new Set();
    this.tracks = [];
    this.particles = [];
    this.activeEvent = null;
    this.nextEventAt = 12.5;
    this.finishReached = false;
    this.runSummary = null;
  }

  startRun() {
    this.resetRun(true);
    this.state = 'play';
    this.showToast(t(this.lang, 'startHint'), 'info');
    this.audio.setFire(false);
  }

  goMenu() {
    this.state = 'menu';
    this.audio.setHelicopter(false);
    this.audio.setFire(false);
  }

  goUpgrades() {
    this.state = 'upgrades';
  }

  toggleLang() {
    this.lang = this.lang === 'ar' ? 'en' : 'ar';
    this.persist.language = this.lang;
    saveState(this.persist);
    this.applyLangToDocument();
  }

  showToast(text, tone = 'info', timer = 2.2) {
    this.toast = { text, tone, timer };
  }

  buyUpgrade(key) {
    const level = this.persist.upgrades[key] ?? 0;
    if (level >= MAX_UPGRADE_LEVEL) return;
    const cost = UPGRADE_COST[key][level];
    if (this.persist.coins < cost) {
      this.upgradeMessage = t(this.lang, 'notEnough');
      this.upgradeMessageTimer = 1.6;
      this.audio.beep({ frequency: 180, duration: 0.14, type: 'square', gain: 0.05 });
      return;
    }
    this.persist.coins -= cost;
    this.persist.upgrades[key] = level + 1;
    saveState(this.persist);
    this.upgradeMessage = `${t(this.lang, key)} +1`;
    this.upgradeMessageTimer = 1.6;
    this.audio.pickup();
  }

  getInput() {
    const key = (code) => this.keys.has(code);
    const touch = { gas: false, brake: false, winch: false, tiltBack: false, tiltForward: false };
    for (const point of this.activePointers.values()) {
      for (const [name, r] of Object.entries(this.touchRects)) {
        if (this.inRect(point.x, point.y, r)) touch[name] = true;
      }
    }
    return {
      gas: key('ArrowRight') || key('KeyD') || touch.gas,
      brake: key('ArrowLeft') || key('KeyA') || touch.brake,
      winch: key('Space') || touch.winch,
      tiltBack: key('KeyQ') || key('ArrowUp') || touch.tiltBack,
      tiltForward: key('KeyE') || key('ArrowDown') || touch.tiltForward
    };
  }

  isUiPointer(x, y) {
    return this.buttons.some((b) => this.inRect(x, y, b));
  }

  handleClick(x, y) {
    for (let i = this.buttons.length - 1; i >= 0; i -= 1) {
      const b = this.buttons[i];
      if (this.inRect(x, y, b)) {
        b.onClick?.();
        return true;
      }
    }
    return false;
  }

  inRect(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  updatePlay(dt) {
    this.runTime += dt;
    const input = this.getInput();
    const up = this.persist.upgrades;
    const engineLevel = up.engine || 0;
    const tiresLevel = up.tires || 0;
    const suspensionLevel = up.suspension || 0;
    const winchLevel = up.winch || 0;
    const car = this.car;
    const terrain = this.terrain;

    car.winchCooldown = Math.max(0, car.winchCooldown - dt);
    car.winchPulse = Math.max(0, car.winchPulse - dt * 4);
    car.bubbleTimer = Math.max(0, car.bubbleTimer - dt);

    let throttle = (input.gas ? 1 : 0) - (input.brake ? 0.92 : 0);
    if (input.gas && input.brake) throttle = 0;

    if (!this.activeEvent && this.runTime > this.nextEventAt && car.x > 850 && car.x < terrain.finishX - 500) {
      this.activeEvent = {
        type: Math.random() < 0.58 ? 'storm' : 'helicopter',
        timer: 0,
        duration: 5.4 + Math.random() * 2.6,
        dir: Math.random() < 0.5 ? -1 : 1
      };
      this.showToast(t(this.lang, this.activeEvent.type === 'storm' ? 'storm' : 'helicopter'), 'event', 2.8);
    }
    let stormIntensity = 0;
    let windForce = 0;
    if (this.activeEvent) {
      this.activeEvent.timer += dt;
      const e = this.activeEvent;
      const f = Math.sin(clamp(e.timer / e.duration, 0, 1) * Math.PI);
      if (e.type === 'storm') {
        stormIntensity = f;
        windForce = e.dir * 95 * f;
        this.mood = clamp(this.mood - f * dt * 1.2, 0, 100);
      } else {
        stormIntensity = f * 0.28;
        windForce = e.dir * 48 * f;
      }
      if (e.timer >= e.duration) {
        this.activeEvent = null;
        this.nextEventAt = this.runTime + 17 + Math.random() * 18;
      }
    }

    const wheelA = this.wheelWorld(-48, 28);
    const wheelB = this.wheelWorld(48, 28);
    const slopeA = terrain.getSlope(wheelA.x);
    const slopeB = terrain.getSlope(wheelB.x);
    const gyA = terrain.getY(wheelA.x);
    const gyB = terrain.getY(wheelB.x);
    const wheelR = 21;
    const contactA = wheelA.y + wheelR > gyA;
    const contactB = wheelB.y + wheelR > gyB;
    const grounded = contactA || contactB;
    car.grounded = grounded;

    const trap = grounded ? terrain.getTrapAt(car.x) : null;
    let tractionTrap = 1;
    if (trap) {
      trap.discovered = true;
      trap.flash = 1;
      car.stuckTimer += dt;
      car.bubble = t(this.lang, 'rabdat');
      car.bubbleTimer = 1.1;
      tractionTrap = 0.28 / trap.severity;
      car.sink = lerp(car.sink, 15 + trap.severity * 6, clamp(dt * 7, 0, 1));
      this.mood = clamp(this.mood - dt * 5.2 * trap.severity, 0, 100);
      if (Math.abs(throttle) > 0.1) {
        const dir = Math.sign(throttle);
        if (dir !== car.lastRockDir && Math.abs(car.lastRockDir) > 0) {
          car.recovery += dt * (0.5 + tiresLevel * 0.12);
          car.rockPulse = 1;
        } else {
          car.recovery += dt * (0.11 + tiresLevel * 0.035);
        }
        car.lastRockDir = dir;
      }
      if (input.winch && winchLevel > 0 && car.winchCooldown <= 0) {
        car.recovery += 0.42 + winchLevel * 0.16;
        car.vx += 68 + winchLevel * 28;
        car.winchCooldown = Math.max(3.8, 9.4 - winchLevel * 0.95);
        car.winchPulse = 1;
        this.audio.winch();
      }
      if (car.recovery >= 1) {
        trap.recovered = true;
        car.stuckTimer = 0;
        car.recovery = 0;
        car.sink = 0;
        car.vx += 130 + tiresLevel * 22;
        this.showToast(this.lang === 'ar' ? 'طلعت من الربادة!' : 'Recovered from Rabdat!', 'success', 1.4);
      }
      if (car.stuckTimer > 16.5) this.failRun('stuck');
    } else {
      car.stuckTimer = Math.max(0, car.stuckTimer - dt * 1.6);
      car.recovery = Math.max(0, car.recovery - dt * 0.3);
      car.sink = lerp(car.sink, 0, clamp(dt * 5, 0, 1));
    }

    for (const tr of terrain.traps) tr.flash = Math.max(0, tr.flash - dt * 2.6);

    const traction = (0.62 + tiresLevel * 0.08) * tractionTrap * (1 - stormIntensity * 0.17);
    const engineForce = 700 + engineLevel * 135;
    const airForce = grounded ? 0.06 : 0.018;
    const slope = (slopeA + slopeB) / 2;
    const slopeDrag = slope * (grounded ? 520 : 100);

    if (grounded) {
      car.vx += throttle * engineForce * traction * dt;
      car.vx += slopeDrag * dt;
      car.vx += windForce * dt;
      car.vx *= Math.exp(-(0.55 - tiresLevel * 0.035) * dt);
      if (trap) car.vx = clamp(car.vx, -90, 210 + engineLevel * 18);
    } else {
      car.vx += throttle * engineForce * airForce * dt + windForce * 0.45 * dt;
      const tilt = (input.tiltBack ? -1 : 0) + (input.tiltForward ? 1 : 0);
      car.angVel += tilt * (3.2 + suspensionLevel * 0.25) * dt;
    }
    car.vx = clamp(car.vx, -250, 700 + engineLevel * 65);
    car.vy += 940 * dt;
    car.x += car.vx * dt;
    car.y += car.vy * dt;
    car.x = clamp(car.x, 70, terrain.length + 80);

    // Re-evaluate wheel contact after integration and correct body to terrain.
    const cA = this.wheelWorld(-48, 28);
    const cB = this.wheelWorld(48, 28);
    const gA = terrain.getY(cA.x);
    const gB = terrain.getY(cB.x);
    const penA = cA.y + wheelR - gA;
    const penB = cB.y + wheelR - gB;
    const contacts = [];
    if (penA > 0) contacts.push({ pen: penA, slope: terrain.getSlope(cA.x), x: cA.x });
    if (penB > 0) contacts.push({ pen: penB, slope: terrain.getSlope(cB.x), x: cB.x });
    if (contacts.length > 0) {
      const maxPen = Math.max(...contacts.map((c) => c.pen));
      car.y -= maxPen;
      if (car.vy > 0) car.vy *= -0.045;
      const avgSlope = contacts.reduce((s, c) => s + c.slope, 0) / contacts.length;
      const targetAngle = Math.atan(avgSlope);
      const stability = 4.7 + suspensionLevel * 0.72;
      car.angle += angleDelta(car.angle, targetAngle) * clamp(dt * stability, 0, 1);
      car.angVel *= Math.exp(-(7.2 + suspensionLevel) * dt);
      car.grounded = true;
      if (Math.abs(car.vx) > 18 && this.frame % 4 === 0) {
        this.tracks.push({ x: car.x - 33, y: terrain.getY(car.x - 33) + 4, a: clamp(Math.abs(car.vx) / 620, 0.15, 0.8) });
        if (this.tracks.length > 260) this.tracks.shift();
      }
      if (Math.abs(throttle) > 0.1 && Math.abs(car.vx) > 20) this.spawnDust(car.x - 50, terrain.getY(car.x - 50) - 7, throttle);
    } else {
      car.angle += car.angVel * dt;
      car.angVel *= Math.exp(-1.2 * dt);
      car.grounded = false;
    }
    car.angle = normalizeAngle(car.angle);
    car.wheelRot += car.vx * dt * 0.055;
    car.rockPulse = Math.max(0, car.rockPulse - dt * 5);

    if (grounded && Math.abs(normalizeAngle(car.angle)) > 1.86) car.flipTimer += dt;
    else car.flipTimer = Math.max(0, car.flipTimer - dt * 2.5);
    if (car.flipTimer > 2.1) this.failRun('flip');

    const height = Math.max(0, this.terrain.startY - car.y);
    car.maxHeight = Math.max(car.maxHeight, height);
    this.runScore = Math.floor(car.x * 0.11 + car.maxHeight * 4.2 + this.collected.size * 170 + this.mood * 4.5);

    this.updateCollectibles(dt);
    this.updateParticles(dt, stormIntensity);
    this.updateCamera(dt);

    if (!car.finishHintShown && car.x > terrain.finishX - 900) {
      car.finishHintShown = true;
      this.showToast(t(this.lang, 'finishHint'), 'success', 2.1);
    }
    if (car.x >= terrain.finishX && !this.finishReached) this.completeRun();

    this.audio.setEngine(throttle, car.vx, car.grounded);
    this.audio.setWind(stormIntensity);
    this.audio.setHelicopter(this.activeEvent?.type === 'helicopter', 0.45);
    this.audio.setFire(false);
  }

  wheelWorld(localX, localY) {
    const c = Math.cos(this.car.angle);
    const s = Math.sin(this.car.angle);
    return {
      x: this.car.x + localX * c - localY * s,
      y: this.car.y + localX * s + localY * c + this.car.sink
    };
  }

  updateCollectibles(dt) {
    const car = this.car;
    for (const item of this.terrain.collectibles) {
      if (item.taken) continue;
      item.bob += dt * 3.2;
      const dy = Math.sin(item.bob) * 6;
      const dist = Math.hypot(car.x - item.x, car.y - (item.y + dy));
      if (dist < (item.kind === 'coin' ? 54 : 65)) {
        item.taken = true;
        if (item.kind === 'coin') {
          this.runScore += 60;
          this.runCoins += 1;
        } else {
          this.collected.add(item.kind);
          this.mood = clamp(this.mood + 6, 0, 100);
          this.runScore += 330;
          this.runCoins += 3;
          this.showToast(`${t(this.lang, 'collected')}: ${itemName(this.lang, item.kind)}`, 'success', 1.5);
        }
        this.audio.pickup();
        this.spawnPickupBurst(item.x, item.y, item.kind);
      }
    }
  }

  updateParticles(dt, stormIntensity) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= Math.exp(-p.drag * dt);
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    if (stormIntensity > 0.08) {
      const count = Math.floor(stormIntensity * 7);
      for (let i = 0; i < count; i += 1) {
        this.particles.push({
          kind: 'storm',
          x: this.camera.x + Math.random() * this.width,
          y: this.camera.y + Math.random() * this.height,
          vx: -220 - Math.random() * 260,
          vy: 15 + Math.random() * 55,
          life: 0.8 + Math.random() * 0.8,
          maxLife: 1.4,
          gravity: 0,
          drag: 0.1,
          size: 1 + Math.random() * 3,
          color: 'rgba(244,194,122,.55)'
        });
      }
    }
  }

  spawnDust(x, y, throttle) {
    for (let i = 0; i < 4; i += 1) {
      this.particles.push({
        kind: 'dust',
        x: x + Math.random() * 22 - 11,
        y: y + Math.random() * 12 - 6,
        vx: -Math.sign(throttle || 1) * (45 + Math.random() * 130),
        vy: -20 - Math.random() * 80,
        life: 0.38 + Math.random() * 0.42,
        maxLife: 0.82,
        gravity: 170,
        drag: 2.4,
        size: 3 + Math.random() * 7,
        color: 'rgba(231,197,144,.62)'
      });
    }
  }

  spawnPickupBurst(x, y, kind) {
    const color = kind === 'coin' ? '#FAD97C' : (ITEMS[kind]?.color ?? '#fff');
    for (let i = 0; i < 18; i += 1) {
      const a = Math.random() * TAU;
      const sp = 70 + Math.random() * 165;
      this.particles.push({
        kind: 'spark',
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.45 + Math.random() * 0.4,
        maxLife: 0.85,
        gravity: 140,
        drag: 2.1,
        size: 2 + Math.random() * 3,
        color
      });
    }
  }

  updateCamera(dt) {
    const targetX = this.car.x - this.width * 0.34;
    const targetY = this.car.y - this.height * 0.58;
    this.camera.x = lerp(this.camera.x, clamp(targetX, 0, this.terrain.length - this.width * 0.58), clamp(dt * 4.5, 0, 1));
    this.camera.y = lerp(this.camera.y, clamp(targetY, -120, 390), clamp(dt * 3.4, 0, 1));
  }

  failRun(reason) {
    if (this.state !== 'play') return;
    this.state = 'gameover';
    this.finishReached = true;
    this.screenShake = 6;
    this.audio.crash();
    this.finishSummary(false, reason);
  }

  completeRun() {
    if (this.state !== 'play') return;
    this.state = 'win';
    this.finishReached = true;
    this.screenShake = 3;
    this.audio.win();
    this.audio.setFire(true);
    this.finishSummary(true, 'finish');
  }

  finishSummary(won, reason) {
    const missing = ITEM_KINDS.filter((id) => !this.collected.has(id));
    const itemPenalty = missing.length * 6;
    const finalMood = clamp(Math.round(this.mood - itemPenalty), 0, 100);
    const completionBonus = won ? 900 + finalMood * 6 : 0;
    const collectedBonus = this.collected.size * 220;
    const score = Math.max(0, Math.floor(this.runScore + completionBonus + collectedBonus - itemPenalty * 25));
    const coins = Math.max(0, Math.floor(score / (won ? 105 : 170)) + this.runCoins + (won ? 24 : 0));
    this.persist.coins += coins;
    const height = Math.round(this.car.maxHeight);
    const isBest = height > (this.persist.bestHeight || 0);
    if (isBest) this.persist.bestHeight = height;
    if (score > (this.persist.bestScore || 0)) this.persist.bestScore = score;
    saveState(this.persist);
    this.runSummary = { won, reason, missing, finalMood, score, coins, height, isBest };
  }

  worldToScreen(x, y) {
    const shake = this.screenShake > 0 ? this.screenShake : 0;
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;
    return { x: x - this.camera.x + sx, y: y - this.camera.y + sy };
  }

  draw() {
    this.buttons = [];
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    if (this.state === 'play' || this.state === 'win' || this.state === 'gameover') this.drawGameWorld();
    else this.drawMenuWorld();

    if (this.state === 'menu') this.drawMenu();
    else if (this.state === 'upgrades') this.drawUpgrades();
    else if (this.state === 'play') this.drawHUD();
    else if (this.state === 'win' || this.state === 'gameover') this.drawEndScreen();
    this.drawToast();
    ctx.restore();
  }

  drawMenuWorld() {
    const ctx = this.ctx;
    const progress = (Math.sin(this.time * 0.18) + 1) / 2;
    this.drawSky(progress * 0.62, true);
    this.drawFarLayers(progress * 0.6, { x: this.menuCarX * 0.2, y: 0 });
    const fakeCamera = { x: this.menuCarX, y: 250 };
    this.drawTerrain(fakeCamera, progress, true);
    const x = this.menuCarX + this.width * 0.45;
    const y = this.terrain.getY(x) - 64;
    const slope = this.terrain.getSlope(x);
    const previousCamera = this.camera;
    this.camera = fakeCamera;
    this.drawCar({ ...this.car, x, y, angle: Math.atan(slope), vx: 180, sink: 0, wheelRot: this.time * 3, winchPulse: 0, rockPulse: 0 }, 0.78);
    this.camera = previousCamera;
  }

  drawGameWorld() {
    const progress = clamp(this.car.x / this.terrain.length, 0, 1);
    this.drawSky(progress, false);
    this.drawFarLayers(progress, this.camera);
    this.drawTerrain(this.camera, progress, false);
    this.drawTracks();
    this.drawCollectibles();
    this.drawParticles();
    this.drawFinishCamp(progress);
    this.drawCar(this.car, 1);
    this.drawWorldTextBubbles();
    if (this.activeEvent?.type === 'helicopter') this.drawHelicopter();
    if (this.activeEvent?.type === 'storm') this.drawStormOverlay();
  }

  drawSky(progress, menu = false) {
    const ctx = this.ctx;
    const p = clamp(progress, 0, 1);
    const top = mixColor('#FAD97C', '#060815', smoothstep(0.15, 0.95, p));
    const mid = mixColor('#F4C27A', '#152159', smoothstep(0.25, 0.9, p));
    const bot = mixColor('#A86B38', '#281536', smoothstep(0.1, 1, p));
    const g = ctx.createLinearGradient(0, 0, 0, this.height);
    g.addColorStop(0, top);
    g.addColorStop(0.48, mid);
    g.addColorStop(1, bot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.width, this.height);

    const sunX = this.width * (0.2 + 0.43 * (1 - p));
    const sunY = lerp(this.height * 0.19, this.height * 0.72, smoothstep(0.05, 0.8, p));
    const sunR = 42 + 20 * (1 - p);
    ctx.save();
    ctx.globalAlpha = clamp(1 - p * 1.4, 0, 1);
    const sunG = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 3.5);
    sunG.addColorStop(0, 'rgba(255,245,190,1)');
    sunG.addColorStop(0.3, 'rgba(255,158,71,.45)');
    sunG.addColorStop(1, 'rgba(255,158,71,0)');
    ctx.fillStyle = sunG;
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR * 3.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFF1B8';
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, TAU); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = smoothstep(0.52, 1, p);
    for (let i = 0; i < 90; i += 1) {
      const x = (i * 113.7 + 37) % this.width;
      const y = (i * 59.3 + 19) % (this.height * 0.48);
      const tw = 0.45 + Math.sin(this.time * 2 + i) * 0.3;
      ctx.fillStyle = `rgba(255,255,255,${0.25 + tw * 0.5})`;
      ctx.fillRect(x, y, 1.5, 1.5);
    }
    const moonX = this.width * 0.78;
    const moonY = this.height * 0.16;
    ctx.fillStyle = 'rgba(240,248,255,.85)';
    ctx.beginPath(); ctx.arc(moonX, moonY, 30, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(6,8,21,.7)';
    ctx.beginPath(); ctx.arc(moonX - 10, moonY - 5, 30, 0, TAU); ctx.fill();
    ctx.restore();

    if (menu) {
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 1;
      for (let x = -50; x < this.width + 50; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, this.height * 0.58);
        ctx.lineTo(x + 140, this.height);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawFarLayers(progress, camera) {
    const ctx = this.ctx;
    const p = clamp(progress, 0, 1);
    const baseY = this.height * 0.58 - camera.y * 0.08;
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = mixColor('#8d5f43', '#0a1230', p);
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    for (let x = -40; x <= this.width + 60; x += 80) {
      const y = baseY + Math.sin((x + camera.x * 0.11) * 0.006) * 18 + Math.sin((x + camera.x * 0.05) * 0.015) * 7;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.width, this.height); ctx.closePath(); ctx.fill();
    ctx.restore();

    // Distant highway line and mosque silhouette from the blueprint.
    ctx.save();
    const highwayY = this.height * 0.60 - camera.y * 0.06;
    ctx.globalAlpha = 0.34 + 0.2 * (1 - p);
    ctx.strokeStyle = 'rgba(255,238,184,.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-60 - (camera.x * 0.16) % 160, highwayY);
    ctx.lineTo(this.width + 80, highwayY + 18);
    ctx.stroke();
    ctx.setLineDash([18, 28]);
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-40 - (camera.x * 0.16) % 160, highwayY - 2);
    ctx.lineTo(this.width + 80, highwayY + 16);
    ctx.stroke();
    ctx.setLineDash([]);

    const mx = this.width * 0.18 - (camera.x * 0.06) % (this.width + 220);
    const my = highwayY - 32;
    ctx.globalAlpha = 0.32 + 0.2 * p;
    ctx.fillStyle = mixColor('#4a2e2b', '#050711', p);
    ctx.fillRect(mx, my, 38, 32);
    ctx.beginPath(); ctx.arc(mx + 19, my, 19, Math.PI, 0); ctx.fill();
    ctx.fillRect(mx + 52, my - 26, 9, 58);
    ctx.beginPath(); ctx.arc(mx + 56.5, my - 29, 7, 0, TAU); ctx.fill();
    ctx.restore();
  }

  drawTerrain(camera, progress, menu = false) {
    const ctx = this.ctx;
    const p = clamp(progress, 0, 1);
    const points = this.terrain.visiblePoints(camera, this.width, 220);
    if (points.length < 2) return;
    ctx.save();
    ctx.beginPath();
    const first = this.worldToScreenWithCamera(points[0].x, points[0].y, camera);
    ctx.moveTo(first.x, first.y);
    for (const pt of points) {
      const s = this.worldToScreenWithCamera(pt.x, pt.y, camera);
      ctx.lineTo(s.x, s.y);
    }
    ctx.lineTo(this.width + 260, this.height + 260);
    ctx.lineTo(-260, this.height + 260);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, this.height * 0.2, 0, this.height + 160);
    g.addColorStop(0, mixColor('#E7C590', '#B48352', p * 0.3));
    g.addColorStop(0.45, mixColor('#D8B26E', '#4d2f33', smoothstep(0.4, 1, p)));
    g.addColorStop(1, mixColor('#7b4b2c', '#151026', p));
    ctx.fillStyle = g;
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.globalAlpha = menu ? 0.20 : 0.25;
    for (let i = -12; i < 38; i += 1) {
      ctx.strokeStyle = i % 3 === 0 ? `rgba(0,245,255,${0.12 + p * 0.18})` : 'rgba(255,255,255,.08)';
      ctx.lineWidth = i % 3 === 0 ? 1.4 : 0.8;
      ctx.beginPath();
      for (const pt of points) {
        const offset = 16 + i * 21 + Math.sin((pt.x + i * 40) * 0.008) * 7;
        const s = this.worldToScreenWithCamera(pt.x, pt.y + offset, camera);
        if (pt === points[0]) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
      }
      ctx.stroke();
    }
    ctx.restore();

    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = mixColor('#f8d7a0', COLORS.cyan, smoothstep(0.38, 1, p));
    ctx.lineWidth = menu ? 2 : 3;
    ctx.shadowColor = p > 0.45 ? COLORS.cyan : 'rgba(255,204,125,.8)';
    ctx.shadowBlur = p > 0.45 ? 12 : 4;
    ctx.beginPath();
    for (let i = 0; i < points.length; i += 1) {
      const pt = points[i];
      const s = this.worldToScreenWithCamera(pt.x, pt.y, camera);
      if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (!menu) this.drawTrapHints(camera);
    ctx.restore();
  }

  worldToScreenWithCamera(x, y, camera) {
    return { x: x - camera.x, y: y - camera.y };
  }

  drawTrapHints(camera) {
    const ctx = this.ctx;
    for (const trap of this.terrain.traps) {
      if (trap.x + trap.w < camera.x - 80 || trap.x > camera.x + this.width + 80) continue;
      if (!trap.discovered && trap.flash <= 0) continue;
      const x1 = trap.x - camera.x;
      const x2 = trap.x + trap.w - camera.x;
      const y1 = this.terrain.getY(trap.x + trap.w * 0.5) - camera.y;
      ctx.save();
      ctx.globalAlpha = trap.discovered ? 0.45 + trap.flash * 0.35 : trap.flash;
      const g = ctx.createLinearGradient(x1, y1 - 20, x2, y1 + 40);
      g.addColorStop(0, 'rgba(255,43,214,0)');
      g.addColorStop(0.5, 'rgba(255,43,214,.45)');
      g.addColorStop(1, 'rgba(255,43,214,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse((x1 + x2) / 2, y1 + 17, trap.w * 0.48, 34, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = COLORS.magenta;
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1 + 4);
      ctx.bezierCurveTo(x1 + trap.w * 0.3, y1 + 28, x1 + trap.w * 0.7, y1 - 12, x2, y1 + 8);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawTracks() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(88,54,30,.28)';
    ctx.lineWidth = 3;
    for (const tr of this.tracks) {
      const s = this.worldToScreen(tr.x, tr.y);
      if (s.x < -20 || s.x > this.width + 20 || s.y < -20 || s.y > this.height + 80) continue;
      ctx.globalAlpha = tr.a * 0.55;
      ctx.beginPath();
      ctx.moveTo(s.x - 10, s.y);
      ctx.lineTo(s.x + 10, s.y + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s.x - 11, s.y + 15);
      ctx.lineTo(s.x + 11, s.y + 17);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawCollectibles() {
    const ctx = this.ctx;
    for (const item of this.terrain.collectibles) {
      if (item.taken) continue;
      const bob = Math.sin(item.bob) * 6;
      const s = this.worldToScreen(item.x, item.y + bob);
      if (s.x < -60 || s.x > this.width + 60 || s.y < -80 || s.y > this.height + 80) continue;
      if (item.kind === 'coin') this.drawCoin(s.x, s.y, item.bob);
      else this.drawItemIcon(s.x, s.y, item.kind, item.bob);
    }
  }

  drawCoin(x, y, phase) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    const sx = 0.62 + Math.abs(Math.sin(phase)) * 0.45;
    ctx.scale(sx, 1);
    ctx.shadowColor = '#FAD97C';
    ctx.shadowBlur = 14;
    const g = ctx.createRadialGradient(-4, -5, 2, 0, 0, 15);
    g.addColorStop(0, '#fff6bd');
    g.addColorStop(0.45, '#fad97c');
    g.addColorStop(1, '#b97820');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  drawItemIcon(x, y, kind, phase = 0) {
    const ctx = this.ctx;
    const meta = ITEMS[kind];
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = meta.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(6,8,21,.82)';
    ctx.strokeStyle = meta.color;
    ctx.lineWidth = 2;
    roundRect(ctx, -25, -25, 50, 50, 14);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.rotate(Math.sin(phase) * 0.05);
    if (kind === 'salt') {
      ctx.fillStyle = '#f8f5df'; roundRect(ctx, -8, -12, 16, 25, 5); ctx.fill();
      ctx.fillStyle = '#7cc7ff'; ctx.fillRect(-8, -12, 16, 6);
      ctx.fillStyle = '#6a6a6a'; ctx.fillRect(-6, -17, 12, 5);
      ctx.fillStyle = '#111'; for (let i = -4; i <= 4; i += 4) ctx.fillRect(i, -15, 1, 1);
    } else if (kind === 'knife') {
      ctx.fillStyle = '#dce7ff';
      ctx.beginPath(); ctx.moveTo(-3, -17); ctx.lineTo(12, -5); ctx.lineTo(-1, 5); ctx.lineTo(-10, -11); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#9a5a2f'; roundRect(ctx, -14, 1, 15, 7, 3); ctx.fill();
    } else if (kind === 'tongs') {
      ctx.strokeStyle = '#d7d7d7'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-10, -15); ctx.lineTo(-2, 17); ctx.moveTo(10, -15); ctx.lineTo(2, 17); ctx.stroke();
      ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -17, 8, Math.PI, 0); ctx.stroke();
    } else if (kind === 'onion') {
      ctx.fillStyle = '#b887ff'; ctx.beginPath(); ctx.ellipse(0, 3, 13, 16, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#f2dcff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -13); ctx.quadraticCurveTo(-8, 4, 0, 19); ctx.quadraticCurveTo(8, 4, 0, -13); ctx.stroke();
      ctx.fillStyle = '#66e08d'; ctx.beginPath(); ctx.moveTo(0, -16); ctx.quadraticCurveTo(8, -24, 12, -14); ctx.quadraticCurveTo(3, -18, 0, -16); ctx.fill();
    } else if (kind === 'mayo') {
      ctx.fillStyle = '#fff6c9'; roundRect(ctx, -10, -17, 20, 31, 6); ctx.fill();
      ctx.fillStyle = '#00f5ff'; ctx.fillRect(-10, -7, 20, 8);
      ctx.fillStyle = '#f3efe2'; ctx.fillRect(-7, -22, 14, 6);
      ctx.fillStyle = '#ff2bd6'; ctx.font = '900 10px system-ui'; ctx.textAlign = 'center'; ctx.fillText('M', 0, 5);
    }
    ctx.restore();
  }

  drawParticles() {
    const ctx = this.ctx;
    ctx.save();
    for (const p of this.particles) {
      const s = this.worldToScreen(p.x, p.y);
      if (s.x < -80 || s.x > this.width + 80 || s.y < -80 || s.y > this.height + 80) continue;
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = alpha * (p.kind === 'storm' ? 0.5 : 0.9);
      ctx.fillStyle = p.color;
      if (p.kind === 'storm') {
        ctx.fillRect(s.x, s.y, p.size * 12, p.size * 0.7);
      } else {
        ctx.beginPath(); ctx.arc(s.x, s.y, p.size, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  drawFinishCamp(progress) {
    const ctx = this.ctx;
    const x = this.terrain.finishX + 95;
    const ground = this.terrain.getY(x);
    const s = this.worldToScreen(x, ground);
    if (s.x < -160 || s.x > this.width + 220) return;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.strokeStyle = COLORS.cyan;
    ctx.lineWidth = 3;
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(-65, -80); ctx.lineTo(-65, 0); ctx.stroke();
    ctx.fillStyle = COLORS.magenta;
    ctx.beginPath(); ctx.moveTo(-62, -78); ctx.lineTo(15, -58); ctx.lineTo(-62, -42); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(6,8,21,.72)';
    roundRect(ctx, 10, -48, 88, 45, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.stroke();
    ctx.fillStyle = COLORS.white; ctx.textAlign = 'center'; ctx.font = '900 18px system-ui'; ctx.fillText('AL-SEEF', 54, -20);
    this.drawCampfire(138, -18, 0.75 + progress * 0.2);
    ctx.restore();
  }

  drawCampfire(x, y, scale = 1) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = '#6a3d25'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-24, 16); ctx.lineTo(24, 2); ctx.moveTo(-22, 2); ctx.lineTo(24, 16); ctx.stroke();
    const flicker = 0.82 + Math.sin(this.time * 12) * 0.08 + Math.random() * 0.03;
    ctx.shadowColor = COLORS.fire; ctx.shadowBlur = 34;
    const g = ctx.createRadialGradient(0, 3, 0, 0, 0, 42);
    g.addColorStop(0, 'rgba(255,242,153,1)');
    g.addColorStop(0.28, 'rgba(255,122,26,.86)');
    g.addColorStop(1, 'rgba(255,122,26,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 4, 42 * flicker, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffec88'; ctx.beginPath(); ctx.moveTo(0, -35 * flicker); ctx.bezierCurveTo(-22, -7, -5, 18, 0, 22); ctx.bezierCurveTo(10, 12, 25, -9, 0, -35 * flicker); ctx.fill();
    ctx.fillStyle = COLORS.fire; ctx.beginPath(); ctx.moveTo(3, -22); ctx.bezierCurveTo(-9, -2, -1, 14, 4, 17); ctx.bezierCurveTo(13, 4, 15, -8, 3, -22); ctx.fill();
    ctx.restore();
  }

  drawCar(car, alpha = 1) {
    const ctx = this.ctx;
    const s = this.worldToScreen(car.x, car.y + (car.sink || 0));
    const progress = clamp((car.x || 0) / (this.terrain?.length || 1), 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(s.x, s.y);
    ctx.rotate(car.angle || 0);

    ctx.save();
    ctx.globalAlpha = 0.25 * alpha;
    ctx.fillStyle = '#000';
    ctx.scale(1, 0.42);
    ctx.beginPath(); ctx.ellipse(0, 92, 98, 34, 0, 0, TAU); ctx.fill();
    ctx.restore();

    if (car.winchPulse > 0) {
      ctx.save();
      ctx.globalAlpha = car.winchPulse;
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 3;
      ctx.shadowColor = COLORS.cyan;
      ctx.shadowBlur = 15;
      ctx.beginPath(); ctx.moveTo(58, 13); ctx.lineTo(138, -28); ctx.stroke();
      ctx.restore();
    }

    // Wheels
    this.drawWheel(-48, 30, car.wheelRot || 0, progress);
    this.drawWheel(48, 30, car.wheelRot || 0, progress);

    // Chassis body
    ctx.save();
    const chassisG = ctx.createLinearGradient(-72, -50, 78, 45);
    chassisG.addColorStop(0, '#1a2137');
    chassisG.addColorStop(0.52, '#0a0f1f');
    chassisG.addColorStop(1, '#253453');
    ctx.fillStyle = chassisG;
    ctx.strokeStyle = progress > 0.5 ? COLORS.cyan : '#f8d7a0';
    ctx.lineWidth = 2.6;
    ctx.shadowColor = progress > 0.5 ? COLORS.cyan : COLORS.fire;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(-78, 10);
    ctx.lineTo(-60, -26);
    ctx.quadraticCurveTo(-24, -48, 28, -41);
    ctx.lineTo(65, -10);
    ctx.lineTo(78, 18);
    ctx.lineTo(50, 26);
    ctx.lineTo(-58, 25);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    // Windows
    ctx.fillStyle = 'rgba(0,245,255,.22)';
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-40, -26); ctx.lineTo(-14, -36); ctx.lineTo(-7, -6); ctx.lineTo(-46, -7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-4, -36); ctx.lineTo(25, -34); ctx.lineTo(40, -7); ctx.lineTo(2, -7); ctx.closePath(); ctx.fill(); ctx.stroke();

    // Headlights and tail glow
    ctx.fillStyle = '#fff6bd'; ctx.shadowColor = '#fff6bd'; ctx.shadowBlur = 12;
    ctx.fillRect(68, 0, 12, 7);
    ctx.shadowColor = COLORS.magenta; ctx.fillStyle = COLORS.magenta; ctx.fillRect(-79, 8, 10, 7);
    ctx.restore();

    // Suspension springs
    ctx.strokeStyle = 'rgba(255,255,255,.38)'; ctx.lineWidth = 2;
    this.drawSpring(-48, 14, -40, 30);
    this.drawSpring(48, 14, 40, 30);

    ctx.restore();
  }

  drawWheel(x, y, rot, progress) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = '#080a10';
    ctx.strokeStyle = '#262b39';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, 23, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = progress > 0.48 ? COLORS.cyan : '#f6c97d';
    ctx.lineWidth = 2;
    ctx.globalAlpha *= 0.9;
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * TAU;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20); ctx.stroke();
    }
    ctx.fillStyle = '#b8c0d9'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
    ctx.restore();
  }

  drawSpring(x1, y1, x2, y2) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i <= 7; i += 1) {
      const t = i / 7;
      const x = lerp(x1, x2, t) + Math.sin(t * Math.PI * 7) * 3;
      const y = lerp(y1, y2, t);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  drawWorldTextBubbles() {
    const car = this.car;
    if (car.bubbleTimer <= 0 || !car.bubble) return;
    const ctx = this.ctx;
    const s = this.worldToScreen(car.x, car.y - 92);
    ctx.save();
    ctx.globalAlpha = clamp(car.bubbleTimer, 0, 1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '800 18px system-ui, sans-serif';
    const w = Math.min(this.width * 0.72, ctx.measureText(car.bubble).width + 34);
    ctx.fillStyle = 'rgba(6,8,21,.78)'; ctx.strokeStyle = COLORS.magenta; ctx.lineWidth = 2;
    roundRect(ctx, s.x - w / 2, s.y - 24, w, 48, 16); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(car.bubble, s.x, s.y);
    ctx.restore();
  }

  drawHelicopter() {
    if (!this.activeEvent) return;
    const ctx = this.ctx;
    const e = this.activeEvent;
    const f = clamp(e.timer / e.duration, 0, 1);
    const x = lerp(this.width + 140, -140, f);
    const y = this.height * 0.18 + Math.sin(f * Math.PI * 3) * 18;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.75, 0.75);
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = 'rgba(2,4,12,.92)';
    ctx.beginPath(); ctx.ellipse(0, 0, 42, 14, 0, 0, TAU); ctx.fill();
    ctx.fillRect(28, -3, 55, 6);
    ctx.beginPath(); ctx.moveTo(78, 0); ctx.lineTo(102, -13); ctx.lineTo(100, 13); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-52, -18); ctx.lineTo(52, -18); ctx.stroke();
    ctx.globalAlpha = 0.22 + 0.16 * Math.sin(this.time * 30);
    ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-76, -18); ctx.lineTo(76, -18); ctx.stroke();
    ctx.restore();
  }

  drawStormOverlay() {
    const ctx = this.ctx;
    const e = this.activeEvent;
    if (!e) return;
    const f = Math.sin(clamp(e.timer / e.duration, 0, 1) * Math.PI);
    ctx.save();
    ctx.globalAlpha = 0.16 * f;
    ctx.fillStyle = '#e7c590';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalAlpha = 0.26 * f;
    ctx.strokeStyle = 'rgba(244,194,122,.75)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 28; i += 1) {
      const x = ((this.time * -420 + i * 91) % (this.width + 240)) - 120;
      const y = (i * 37 + Math.sin(this.time + i) * 20) % this.height;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 180, y + 28); ctx.stroke();
    }
    ctx.restore();
  }

  drawHUD() {
    const ctx = this.ctx;
    this.drawTouchControls();
    const safePad = 16;
    const width = Math.min(this.width - 32, 860);
    ctx.save();
    ctx.fillStyle = 'rgba(6,8,21,.58)';
    ctx.strokeStyle = 'rgba(0,245,255,.35)'; ctx.lineWidth = 1.4;
    roundRect(ctx, safePad, safePad, width, 86, 20); ctx.fill(); ctx.stroke();
    const height = Math.round(this.car.maxHeight);
    const best = Math.max(height, this.persist.bestHeight || 0);
    this.drawMetric(safePad + 24, safePad + 20, t(this.lang, 'height'), `${formatInt(height)}m`, COLORS.cyan);
    this.drawMetric(safePad + 190, safePad + 20, t(this.lang, 'best'), `${formatInt(best)}m`, COLORS.gold);
    this.drawMetric(safePad + 382, safePad + 20, t(this.lang, 'score'), formatInt(this.runScore), COLORS.magenta);
    this.drawMoodBar(safePad + 560, safePad + 26, 205, 20);
    this.drawChecklist(safePad + 790, safePad + 18);
    ctx.restore();

    if (this.activeEvent) {
      const label = t(this.lang, this.activeEvent.type === 'storm' ? 'storm' : 'helicopter');
      this.drawPill(this.width - 24, 22, label, this.activeEvent.type === 'storm' ? COLORS.gold : COLORS.cyan, 'right');
    }
    const winchStatus = this.persist.upgrades.winch > 0
      ? (this.car.winchCooldown <= 0 ? t(this.lang, 'winchReady') : `${t(this.lang, 'winchCooldown')} ${this.car.winchCooldown.toFixed(0)}s`)
      : t(this.lang, 'noWinch');
    this.drawPill(this.width - 24, 66, winchStatus, this.car.winchCooldown <= 0 ? COLORS.cyan : COLORS.magenta, 'right');

    this.button('menuSmall', this.width - 114, this.height - 62, 96, 44, t(this.lang, 'menu'), () => this.goMenu(), { compact: true });
  }

  drawMetric(x, y, label, value, color) {
    const ctx = this.ctx;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = '700 12px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.68)'; ctx.fillText(label, x, y);
    ctx.font = '900 26px system-ui, sans-serif'; ctx.fillStyle = color; ctx.fillText(value, x, y + 18);
  }

  drawMoodBar(x, y, w, h) {
    const ctx = this.ctx;
    ctx.textAlign = 'left'; ctx.font = '700 12px system-ui'; ctx.fillStyle = 'rgba(255,255,255,.70)'; ctx.fillText(t(this.lang, 'mood'), x, y - 17);
    ctx.fillStyle = 'rgba(255,255,255,.13)'; roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
    const m = clamp(this.mood / 100, 0, 1);
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, COLORS.magenta); g.addColorStop(0.52, COLORS.gold); g.addColorStop(1, COLORS.cyan);
    ctx.fillStyle = g; roundRect(ctx, x, y, w * m, h, h / 2); ctx.fill();
    ctx.fillStyle = 'white'; ctx.font = '900 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(`${Math.round(this.mood)}%`, x + w / 2, y + 2);
  }

  drawChecklist(x, y) {
    const ctx = this.ctx;
    if (x > this.width - 80) return;
    ctx.save();
    ctx.textAlign = 'left'; ctx.font = '700 12px system-ui'; ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fillText(t(this.lang, 'checklist'), x, y - 3);
    ITEM_KINDS.forEach((kind, i) => {
      const meta = ITEMS[kind];
      const cx = x + i * 34 + 14;
      const cy = y + 34;
      ctx.globalAlpha = this.collected.has(kind) ? 1 : 0.35;
      ctx.fillStyle = this.collected.has(kind) ? meta.color : 'rgba(255,255,255,.1)';
      ctx.strokeStyle = meta.color; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(cx, cy, 13, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = this.collected.has(kind) ? '#050611' : meta.color;
      ctx.font = '900 11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(meta.short, cx, cy + 0.5);
    });
    ctx.restore();
  }

  drawPill(x, y, text, color, align = 'left') {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = '800 15px system-ui, sans-serif';
    const w = Math.min(330, ctx.measureText(text).width + 28);
    const left = align === 'right' ? x - w : x;
    ctx.fillStyle = 'rgba(6,8,21,.64)'; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    roundRect(ctx, left, y, w, 34, 17); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, left + w / 2, y + 17);
    ctx.restore();
  }

  updateTouchRects() {
    const pad = 22;
    const btnW = clamp(this.width * 0.19, 104, 150);
    const btnH = 74;
    this.touchRects = {
      brake: { x: pad, y: this.height - btnH - 24, w: btnW, h: btnH },
      gas: { x: this.width - btnW - pad, y: this.height - btnH - 24, w: btnW, h: btnH },
      winch: { x: this.width - btnW * 2 - pad - 18, y: this.height - btnH - 24, w: clamp(btnW * 0.88, 86, 122), h: btnH },
      tiltBack: { x: pad, y: this.height - btnH * 2 - 38, w: btnW * 0.72, h: 54 },
      tiltForward: { x: this.width - btnW * 0.72 - pad, y: this.height - btnH * 2 - 38, w: btnW * 0.72, h: 54 }
    };
  }

  drawTouchControls() {
    this.updateTouchRects();
    const ctx = this.ctx;
    const labels = {
      brake: this.lang === 'ar' ? 'فرامل' : 'BRAKE',
      gas: this.lang === 'ar' ? 'بنزين' : 'GAS',
      winch: this.lang === 'ar' ? 'ونش' : 'WINCH',
      tiltBack: 'Q',
      tiltForward: 'E'
    };
    ctx.save();
    for (const [key, r] of Object.entries(this.touchRects)) {
      const active = [...this.activePointers.values()].some((p) => this.inRect(p.x, p.y, r));
      ctx.globalAlpha = active ? 0.82 : 0.42;
      ctx.fillStyle = 'rgba(6,8,21,.64)'; ctx.strokeStyle = key === 'gas' ? COLORS.cyan : key === 'winch' ? COLORS.magenta : COLORS.gold; ctx.lineWidth = active ? 3 : 1.5;
      roundRect(ctx, r.x, r.y, r.w, r.h, 22); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'white'; ctx.font = `900 ${key.startsWith('tilt') ? 20 : 18}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(labels[key], r.x + r.w / 2, r.y + r.h / 2);
    }
    ctx.restore();
  }

  drawMenu() {
    const ctx = this.ctx;
    const cardW = Math.min(680, this.width - 36);
    const cardH = Math.min(560, this.height - 42);
    const x = (this.width - cardW) / 2;
    const y = (this.height - cardH) / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(6,8,21,.62)';
    ctx.strokeStyle = 'rgba(0,245,255,.45)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0,245,255,.22)'; ctx.shadowBlur = 44;
    roundRect(ctx, x, y, cardW, cardH, 30); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = COLORS.white; ctx.font = `900 ${clamp(this.width * 0.055, 36, 66)}px system-ui, sans-serif`;
    ctx.fillText(t(this.lang, 'title'), this.width / 2, y + 34);
    ctx.fillStyle = 'rgba(255,255,255,.78)'; ctx.font = '700 18px system-ui, sans-serif';
    wrapText(ctx, t(this.lang, 'subtitle'), this.width / 2, y + 110, cardW - 70, 28, 'center');

    const midX = this.width / 2;
    const btnW = Math.min(330, cardW - 90);
    this.button('play', midX - btnW / 2, y + 178, btnW, 58, t(this.lang, 'play'), () => this.startRun(), { primary: true });
    this.button('upgrades', midX - btnW / 2, y + 248, btnW, 54, `${t(this.lang, 'upgrades')}  •  ${formatInt(this.persist.coins)} ${t(this.lang, 'coins')}`, () => this.goUpgrades());
    this.button('language', midX - btnW / 2, y + 314, btnW, 50, t(this.lang, 'language'), () => this.toggleLang());

    const panelY = y + 385;
    ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.strokeStyle = 'rgba(255,255,255,.15)';
    roundRect(ctx, x + 34, panelY, cardW - 68, 94, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COLORS.cyan; ctx.font = '900 15px system-ui'; ctx.textAlign = this.lang === 'ar' ? 'right' : 'left';
    const textX = this.lang === 'ar' ? x + cardW - 58 : x + 58;
    ctx.fillText(t(this.lang, 'github'), textX, panelY + 16);
    ctx.fillStyle = 'rgba(255,255,255,.74)'; ctx.font = '700 14px system-ui';
    const info = `${t(this.lang, 'controls')}\n${t(this.lang, 'audio')}`;
    wrapText(ctx, info, textX, panelY + 42, cardW - 110, 21, this.lang === 'ar' ? 'right' : 'left');

    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '700 12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Warm Golden Hour → Neon Desert Night • Rabdat • Al-Seef • Campfire', midX, y + cardH - 34);
    ctx.restore();
  }

  drawUpgrades() {
    const ctx = this.ctx;
    const cardW = Math.min(930, this.width - 34);
    const cardH = Math.min(620, this.height - 34);
    const x = (this.width - cardW) / 2;
    const y = (this.height - cardH) / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(6,8,21,.72)'; ctx.strokeStyle = 'rgba(255,43,214,.38)'; ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(255,43,214,.18)'; ctx.shadowBlur = 38;
    roundRect(ctx, x, y, cardW, cardH, 30); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.textAlign = 'center'; ctx.fillStyle = COLORS.white; ctx.font = '900 42px system-ui';
    ctx.fillText(t(this.lang, 'upgradeTitle'), this.width / 2, y + 58);
    ctx.fillStyle = COLORS.gold; ctx.font = '900 20px system-ui';
    ctx.fillText(`${formatInt(this.persist.coins)} ${t(this.lang, 'coins')}`, this.width / 2, y + 94);
    const cols = this.width < 760 ? 1 : 2;
    const gap = 18;
    const itemW = cols === 1 ? cardW - 54 : (cardW - 72 - gap) / 2;
    const itemH = 132;
    const startY = y + 132;
    UPGRADE_KEYS.forEach((key, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ix = x + 27 + col * (itemW + gap);
      const iy = startY + row * (itemH + gap);
      this.drawUpgradeCard(ix, iy, itemW, itemH, key);
    });
    if (this.upgradeMessageTimer > 0) {
      ctx.fillStyle = COLORS.cyan; ctx.font = '900 18px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(this.upgradeMessage, this.width / 2, y + cardH - 88);
    }
    this.button('back', x + 28, y + cardH - 66, 160, 48, t(this.lang, 'back'), () => this.goMenu());
    this.button('playUpgrade', x + cardW - 210, y + cardH - 66, 180, 48, t(this.lang, 'play'), () => this.startRun(), { primary: true });
    ctx.restore();
  }

  drawUpgradeCard(x, y, w, h, key) {
    const ctx = this.ctx;
    const level = this.persist.upgrades[key] || 0;
    const maxed = level >= MAX_UPGRADE_LEVEL;
    const cost = maxed ? 0 : UPGRADE_COST[key][level];
    ctx.save();
    const accent = key === 'engine' ? COLORS.fire : key === 'tires' ? COLORS.cyan : key === 'suspension' ? COLORS.gold : COLORS.magenta;
    ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.strokeStyle = accent; ctx.lineWidth = 1.4;
    roundRect(ctx, x, y, w, h, 22); ctx.fill(); ctx.stroke();
    ctx.fillStyle = accent; ctx.font = '900 20px system-ui'; ctx.textAlign = this.lang === 'ar' ? 'right' : 'left';
    const tx = this.lang === 'ar' ? x + w - 22 : x + 22;
    ctx.fillText(t(this.lang, key), tx, y + 28);
    ctx.fillStyle = 'rgba(255,255,255,.68)'; ctx.font = '700 13px system-ui';
    wrapText(ctx, t(this.lang, `${key}Desc`), tx, y + 46, w - 44, 18, this.lang === 'ar' ? 'right' : 'left');
    const barX = x + 22; const barY = y + h - 44; const barW = w - 188;
    ctx.fillStyle = 'rgba(255,255,255,.11)'; roundRect(ctx, barX, barY, barW, 14, 7); ctx.fill();
    ctx.fillStyle = accent; roundRect(ctx, barX, barY, barW * (level / MAX_UPGRADE_LEVEL), 14, 7); ctx.fill();
    ctx.fillStyle = 'white'; ctx.font = '900 13px system-ui'; ctx.textAlign = 'left'; ctx.fillText(`${t(this.lang, 'level')} ${level}/${MAX_UPGRADE_LEVEL}`, barX, barY - 18);
    this.button(`buy_${key}`, x + w - 144, y + h - 62, 120, 42, maxed ? t(this.lang, 'max') : `${t(this.lang, 'buy')} ${cost}`, () => this.buyUpgrade(key), { compact: true, disabled: maxed });
    ctx.restore();
  }

  drawEndScreen() {
    const ctx = this.ctx;
    const won = this.state === 'win';
    const sum = this.runSummary;
    const cardW = Math.min(780, this.width - 34);
    const cardH = Math.min(620, this.height - 34);
    const x = (this.width - cardW) / 2;
    const y = (this.height - cardH) / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(6,8,21,.76)';
    ctx.strokeStyle = won ? COLORS.cyan : COLORS.magenta;
    ctx.lineWidth = 1.7;
    ctx.shadowColor = won ? 'rgba(0,245,255,.22)' : 'rgba(255,43,214,.23)'; ctx.shadowBlur = 42;
    roundRect(ctx, x, y, cardW, cardH, 30); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

    ctx.textAlign = 'center'; ctx.fillStyle = won ? COLORS.cyan : COLORS.magenta; ctx.font = `900 ${clamp(this.width * 0.046, 32, 54)}px system-ui`;
    ctx.fillText(won ? t(this.lang, 'winTitle') : t(this.lang, 'loseTitle'), this.width / 2, y + 48);
    if (won) {
      this.drawCampfire(this.width / 2, y + 132, 1.05);
      ctx.fillStyle = COLORS.gold; ctx.font = '900 22px system-ui';
      ctx.fillText(t(this.lang, 'visit'), this.width / 2, y + 190);
    }

    const statsY = won ? y + 220 : y + 128;
    const stats = [
      [t(this.lang, 'height'), `${formatInt(sum?.height ?? 0)}m`, COLORS.cyan],
      [t(this.lang, 'score'), formatInt(sum?.score ?? 0), COLORS.magenta],
      [t(this.lang, 'earned'), `${formatInt(sum?.coins ?? 0)} ${t(this.lang, 'coins')}`, COLORS.gold],
      [t(this.lang, 'finalMood'), `${sum?.finalMood ?? Math.round(this.mood)}%`, COLORS.fire]
    ];
    const boxW = (cardW - 78) / 2;
    stats.forEach((st, i) => {
      const bx = x + 30 + (i % 2) * (boxW + 18);
      const by = statsY + Math.floor(i / 2) * 82;
      ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.strokeStyle = 'rgba(255,255,255,.16)';
      roundRect(ctx, bx, by, boxW, 64, 16); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.66)'; ctx.font = '700 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(st[0], bx + boxW / 2, by + 14);
      ctx.fillStyle = st[2]; ctx.font = '900 24px system-ui'; ctx.fillText(st[1], bx + boxW / 2, by + 38);
    });

    if (sum?.isBest) {
      ctx.fillStyle = COLORS.cyan; ctx.font = '900 18px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(t(this.lang, 'personalBest'), this.width / 2, statsY + 168);
    }
    const missing = sum?.missing ?? [];
    const jokesY = statsY + 190;
    ctx.textAlign = this.lang === 'ar' ? 'right' : 'left';
    const textX = this.lang === 'ar' ? x + cardW - 36 : x + 36;
    ctx.fillStyle = 'rgba(255,255,255,.78)'; ctx.font = '800 15px system-ui';
    const itemText = missing.length
      ? `${t(this.lang, 'missing')}: ${missing.map((id) => itemName(this.lang, id)).join('، ')}`
      : `${t(this.lang, 'collected')}: ${ITEM_KINDS.map((id) => itemName(this.lang, id)).join('، ')}`;
    wrapText(ctx, itemText, textX, jokesY, cardW - 72, 22, this.lang === 'ar' ? 'right' : 'left');
    ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.font = '700 13px system-ui';
    const joke = missing.length ? itemJoke(this.lang, missing[0]) : (this.lang === 'ar' ? 'القعدة كاملة… الشاهي جاهز.' : 'Camp complete… tea is ready.');
    wrapText(ctx, joke, textX, jokesY + 48, cardW - 72, 20, this.lang === 'ar' ? 'right' : 'left');

    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '700 12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(t(this.lang, 'safety'), this.width / 2, y + cardH - 96);
    const bw = Math.min(180, (cardW - 78) / 3);
    this.button('restartEnd', x + 30, y + cardH - 62, bw, 44, t(this.lang, 'restart'), () => this.startRun(), { primary: true, compact: true });
    this.button('upgradesEnd', x + 48 + bw, y + cardH - 62, bw, 44, t(this.lang, 'upgrades'), () => this.goUpgrades(), { compact: true });
    this.button('menuEnd', x + 66 + bw * 2, y + cardH - 62, bw, 44, t(this.lang, 'menu'), () => this.goMenu(), { compact: true });
    ctx.restore();
  }

  drawToast() {
    if (this.toast.timer <= 0 || !this.toast.text) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = clamp(this.toast.timer, 0, 1);
    ctx.font = '900 17px system-ui, sans-serif';
    const w = Math.min(this.width - 34, ctx.measureText(this.toast.text).width + 42);
    const x = (this.width - w) / 2;
    const y = 118;
    const color = this.toast.tone === 'success' ? COLORS.cyan : this.toast.tone === 'event' ? COLORS.gold : COLORS.magenta;
    ctx.fillStyle = 'rgba(6,8,21,.72)'; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, w, 42, 20); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(this.toast.text, x + w / 2, y + 21);
    ctx.restore();
  }

  button(id, x, y, w, h, label, onClick, options = {}) {
    const ctx = this.ctx;
    const disabled = !!options.disabled;
    this.buttons.push({ id, x, y, w, h, onClick: disabled ? undefined : onClick });
    ctx.save();
    ctx.globalAlpha = disabled ? 0.45 : 1;
    const primary = options.primary;
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    if (primary) {
      g.addColorStop(0, 'rgba(0,245,255,.90)');
      g.addColorStop(1, 'rgba(255,43,214,.85)');
      ctx.fillStyle = g;
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.strokeStyle = options.disabled ? 'rgba(255,255,255,.16)' : 'rgba(0,245,255,.35)';
    }
    ctx.lineWidth = primary ? 2 : 1.4;
    ctx.shadowColor = primary ? 'rgba(0,245,255,.25)' : 'transparent';
    ctx.shadowBlur = primary ? 18 : 0;
    roundRect(ctx, x, y, w, h, options.compact ? 15 : 20); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = primary ? '#04101c' : 'white';
    ctx.font = `900 ${options.compact ? 15 : 18}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
    ctx.restore();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, align = 'left') {
  ctx.textAlign = align;
  const paragraphs = String(text).split('\n');
  let yy = y;
  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    let line = '';
    for (let i = 0; i < words.length; i += 1) {
      const test = line ? `${line} ${words[i]}` : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, yy);
        line = words[i];
        yy += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, yy);
    yy += lineHeight;
  }
  return yy;
}

const canvas = document.getElementById('game');
if (!canvas) throw new Error('Canvas #game not found');
window.alrafyahGame = new AlrafyahGame(canvas);
