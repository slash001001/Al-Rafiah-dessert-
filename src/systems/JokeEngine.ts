import raw from '../data/jokes.json';
import { choice, mulberry32 } from './rng';

export type JokePoolKey = string;

export interface JokeContext {
  veh?: 'gmc' | 'prado';
  item?: string;
  timeLeftSec?: number;
  place?: string;
  missingEssentials?: string[];
  runCount?: number;
  lastEvents?: string[];
}

type Pools = Record<string, Record<'1' | '2' | '3', string[]>>;

const data = raw as unknown as { meta: any; pools: Pools };

export class JokeEngine {
  private rng: () => number;
  private recentLines: string[] = [];
  private recentKeys: string[] = [];
  private ctx: JokeContext = {};

  constructor(seed: number) {
    this.rng = mulberry32(seed);
  }

  setContext(ctx: Partial<JokeContext>) {
    this.ctx = { ...this.ctx, ...ctx };
  }

  pick(key: JokePoolKey, intensity: 1 | 2 | 3, fallback: string) {
    const pool = data.pools[key];
    if (!pool) return fallback;
    const arr = pool[String(intensity) as '1' | '2' | '3'] || pool['1'];
    if (!arr || !arr.length) return fallback;
    let line = choice(this.rng, arr);
    if (this.recentLines.includes(line) && arr.length > 1) {
      line = choice(this.rng, arr.filter((l) => l !== line));
    }
    // avoid same key back-to-back if possible
    if (this.recentKeys[this.recentKeys.length - 1] === key && Object.keys(pool).length > 0) {
      line = choice(this.rng, arr);
    }
    this.recentLines.push(line);
    if (this.recentLines.length > 3) this.recentLines.shift();
    this.recentKeys.push(key);
    if (this.recentKeys.length > 3) this.recentKeys.shift();
    return this.injectContext(line);
  }

  pickRare(prob: number) {
    return this.rng() < prob;
  }

  private injectContext(line: string) {
    let out = line;
    const vehName = this.ctx.veh === 'gmc' ? 'الجمس' : this.ctx.veh === 'prado' ? 'البرادو' : 'الموتر';
    if (out.includes('{veh}')) out = out.replace('{veh}', vehName);
    if (out.includes('{item}') && this.ctx.item) out = out.replace('{item}', this.ctx.item);
    if (out.includes('{place}')) out = out.replace('{place}', this.ctx.place || 'الرافعية');
    if (out.includes('{time}')) {
      const t = this.ctx.timeLeftSec ?? 0;
      const txt = t <= 30 ? 'الشمس قربت' : t <= 90 ? 'الوقت يحترق' : 'لسه عندنا شوي وقت';
      out = out.replace('{time}', txt);
    }
    return out;
  }
}
