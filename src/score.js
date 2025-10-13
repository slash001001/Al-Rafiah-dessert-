const STORAGE_KEY = 'ta3s_gmc_pro_score';

export const createScoreboard = () => ({
  score: 0,
  comboCount: 0,
  comboTimer: 0,
  comboMax: 1,
  pb: null,
  achievements: {
    firstDog: false,
    combo3x: false,
    chairDodge: false,
    bossSlayer: false,
  },
});

export const addScore = (board, amount) => {
  board.score = Math.max(0, board.score + amount);
};

export const registerCombo = (board, windowMs, maxMultiplier) => {
  board.comboCount = Math.min(board.comboCount + 1, maxMultiplier - 1);
  board.comboTimer = windowMs;
  const multiplier = 1 + board.comboCount * 0.5;
  board.comboMax = Math.max(board.comboMax, multiplier);
  if (multiplier >= 3 && !board.achievements.combo3x) board.achievements.combo3x = true;
  return multiplier;
};

export const dropCombo = board => {
  board.comboCount = 0;
  board.comboTimer = 0;
};

export const tickCombo = (board, dt) => {
  if (board.comboTimer > 0) {
    board.comboTimer -= dt * 1000;
    if (board.comboTimer <= 0) dropCombo(board);
  }
};

export const loadProgress = board => {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data?.pb) board.pb = data.pb;
  } catch {
    board.pb = null;
  }
};

export const saveProgress = board => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pb: board.pb }));
  } catch {
    /* ignore */
  }
};

export const updatePersonalBest = (board, time) => {
  const entry = {
    score: Math.round(board.score),
    time: Number(time.toFixed(2)),
    combo: board.comboMax,
  };
  if (!board.pb || entry.score > board.pb.score) {
    board.pb = entry;
    saveProgress(board);
    return true;
  }
  return false;
};
