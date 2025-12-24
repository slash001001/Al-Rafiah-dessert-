import { choice, randInt } from './rng';

export type ChaosKey = 'stuck' | 'overheat' | 'flat' | 'rain' | 'helicopter' | 'camel' | 'dogs';

export interface ChaosEvent {
  key: ChaosKey;
  at: number;
  dur: number;
  intensity: 1 | 2 | 3;
}

export class ChaosDirector {
  private schedule: ChaosEvent[] = [];
  private nextIdx = 0;
  private rng: () => number = Math.random;
  private total = 210;

  reset(seedRng: () => number, runSeconds: number) {
    this.rng = seedRng;
    this.total = runSeconds;
    this.schedule = [];
    this.nextIdx = 0;
    this.buildSchedule();
  }

  private buildSchedule() {
    const count = randInt(this.rng, 2, 6);
    const keys: ChaosKey[] = ['stuck', 'overheat', 'flat', 'rain', 'helicopter', 'camel', 'dogs'];
    let last: ChaosKey | null = null;
    let lastAt = 0;
    for (let i = 0; i < count; i++) {
      let key = choice(this.rng, keys);
      if (key === last) key = choice(this.rng, keys);
      const bias = 0.4 + this.rng() * 0.6; // more late-game
      const at = Math.max(lastAt + 18, Math.floor(this.total * bias));
      lastAt = at;
      const pos = at / this.total;
      const intensity: 1 | 2 | 3 = pos < 0.5 ? 1 : pos < 0.8 ? 2 : 3;
      const dur = randInt(this.rng, 7, 14);
      this.schedule.push({ key, at, dur, intensity });
      last = key;
    }
    this.schedule.sort((a, b) => a.at - b.at);
  }

  update(elapsedSec: number): ChaosEvent | null {
    if (this.nextIdx >= this.schedule.length) return null;
    const ev = this.schedule[this.nextIdx];
    if (elapsedSec >= ev.at) {
      this.nextIdx++;
      return ev;
    }
    return null;
  }

  getSchedule() {
    return this.schedule;
  }
}
