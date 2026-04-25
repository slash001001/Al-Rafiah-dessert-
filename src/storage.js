const KEY = 'alrafyah_dune_climb_v1';

export const DEFAULT_STATE = Object.freeze({
  language: 'ar',
  coins: 80,
  bestHeight: 0,
  bestScore: 0,
  upgrades: {
    engine: 0,
    tires: 0,
    suspension: 0,
    winch: 0
  }
});

function cloneDefault() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const state = cloneDefault();
    return {
      ...state,
      ...parsed,
      upgrades: { ...state.upgrades, ...(parsed.upgrades ?? {}) }
    };
  } catch {
    return cloneDefault();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures; game remains playable.
  }
}

export function resetState() {
  const state = cloneDefault();
  saveState(state);
  return state;
}
