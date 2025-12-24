import jokes from '../data/jokes.json';
import { choice } from './rng';

type JokeKey = string;

const recent: string[] = [];

export function pickJoke(rng: () => number, key: JokeKey, fallback: string) {
  const lines = (jokes as Record<string, string[]>)[key];
  if (!lines || !lines.length) return fallback;
  let line = choice(rng, lines);
  if (recent.includes(line) && lines.length > 1) {
    line = choice(rng, lines.filter((l) => l !== line));
  }
  recent.push(line);
  if (recent.length > 2) recent.shift();
  return line;
}

export function pickRare(rng: () => number, probability: number) {
  return rng() < probability;
}
