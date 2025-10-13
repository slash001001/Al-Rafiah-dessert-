export const createParticleSystem = () => ({
  tracks: [],
  blood: [],
  sand: [],
  wind: [],
});

export const spawnTrack = (system, x, y) => {
  system.tracks.push({ x, y, life: 1.6 });
};

export const spawnBlood = (system, x, y, rng) => {
  for (let i = 0; i < 6; i += 1) {
    system.blood.push({
      x,
      y,
      vx: rng() * 80 - 40,
      vy: rng() * -60 - 20,
      life: 0.65,
    });
  }
};

export const spawnSand = (system, x, y, dir) => {
  system.sand.push({ x, y, dir, life: 0.9 });
};

export const spawnWind = (system, x, y, dir) => {
  system.wind.push({ x, y, dir, life: 0.8 });
};

export const updateParticles = (system, dt) => {
  system.tracks = system.tracks
    .map(track => ({ ...track, life: track.life - dt }))
    .filter(track => track.life > 0);

  system.blood = system.blood
    .map(p => ({
      ...p,
      life: p.life - dt,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      vy: p.vy + 260 * dt,
    }))
    .filter(p => p.life > 0);

  system.sand = system.sand
    .map(s => ({
      ...s,
      life: s.life - dt,
      x: s.x + s.dir * 140 * dt,
      y: s.y - 20 * dt,
    }))
    .filter(s => s.life > 0);

  system.wind = system.wind
    .map(w => ({
      ...w,
      life: w.life - dt,
      x: w.x + w.dir * 240 * dt,
      y: w.y - 30 * dt,
    }))
    .filter(w => w.life > 0);
};
