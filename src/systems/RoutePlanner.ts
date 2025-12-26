export type RouteKey = 'safe' | 'risky';

export interface RoutePlan {
  forkAtProgress: number;
  chosen?: RouteKey;
  safe: { finishProgress: number; chaosMul: number; reward?: string };
  risky: { finishProgress: number; chaosMul: number; reward?: string };
}

export function makeRoutePlan(rng: () => number): RoutePlan {
  const forkAtProgress = 0.38 + rng() * 0.14; // 0.38 - 0.52
  return {
    forkAtProgress,
    safe: { finishProgress: 1, chaosMul: 0.8, reward: 'refuel_hint' },
    risky: { finishProgress: 0.92, chaosMul: 1.2, reward: 'stash' }
  };
}
