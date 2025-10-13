export const createParticleSystem = () => ({
  tracks: [],
  blood: [],
  sand: [],
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
      life: 0.6,
    });
  }
};

export const spawnSand = (system, x, y, dir) => {
  system.sand.push({ x, y, dir, life: 0.9 });
};

export const updateParticles = (system, dt) => {
  system.tracks.forEach(track => {
    track.life -= dt;
  });
  system.blood.forEach(p => {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 220 * dt;
  });
  system.sand.forEach(s => {
    s.life -= dt;
  });
  system.tracks = system.tracks.filter(t => t.life > 0);
  system.blood = system.blood.filter(b => b.life > 0);
  system.sand = system.sand.filter(s => s.life > 0);
};
