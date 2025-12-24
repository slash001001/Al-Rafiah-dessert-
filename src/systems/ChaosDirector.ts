import { choice, randInt } from './rng';
import { balance } from '../config/balance';

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
  private lastTimeByKey: Partial<Record<ChaosKey, number>> = {};

  reset(seedRng: () => number, runSeconds: number) {
    this.rng = seedRng;
    this.total = runSeconds;
    this.schedule = [];
    this.nextIdx = 0;
    this.lastTimeByKey = {};
    this.buildSchedule();
  }

  private buildSchedule() {
    const cfg = balance.chaos;
    const keys: ChaosKey[] = ['stuck', 'overheat', 'flat', 'rain', 'helicopter', 'camel', 'dogs'];
    const maxCount = cfg.maxEvents;
    let generated = 0;
    let lastKey: ChaosKey | null = null;
    let lastAt = 0;
    while (generated < maxCount) {
      const key = this.weightedChoice(keys);
      if (key === lastKey) continue;
      const cooldown = cfg.cooldownSec[key] || cfg.minSpacingSec;
      const minAt = Math.max(lastAt + cfg.minSpacingSec, (this.lastTimeByKey[key] || 0) + cooldown);
      const bias = 0.4 + this.rng() * 0.6;
      const proposedAt = Math.max(minAt, Math.floor(this.total * bias));
      if (proposedAt >= this.total - 10) break;
      const pos = proposedAt / this.total;
      const intensity: 1 | 2 | 3 = pos < 0.5 ? 1 : pos < 0.8 ? 2 : 3;
      const dur = randInt(this.rng, 7, 14);
      this.schedule.push({ key, at: proposedAt, dur, intensity });
      this.lastTimeByKey[key] = proposedAt;
      lastKey = key;
      lastAt = proposedAt;
      generated++;
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

  private weightedChoice(keys: ChaosKey[]) {
    const weights = balance.chaos.weights;
    const sum = keys.reduce((s, k) => s + (weights[k] || 1), 0);
    let r = this.rng() * sum;
    for (const k of keys) {
      r -= weights[k] || 1;
      if (r <= 0) return k;
    }
    return choice(this.rng, keys);
  }
}
