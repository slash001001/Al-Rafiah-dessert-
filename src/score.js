const STORAGE_KEY = 'ta3s_gmc_score';

export const createScoreboard = () => ({
  score: 0,
  comboLevel: 0,
  comboTimer: 0,
  maxCombo: 1,
  achievements: {
    firstBlood: false,
    comboMaster: false,
    bossSlayer: false,
  },
  pb: null,
});

export const addScore = (board, value) => {
  board.score = Math.max(0, board.score + value);
};

export const registerComboHit = (board, windowSeconds, multiplierStep, maxMultiplier) => {
  board.comboLevel = Math.min(board.comboLevel + 1, maxMultiplier - 1);
  board.comboTimer = windowSeconds;
  const comboMultiplier = 1 + board.comboLevel * multiplierStep;
  board.maxCombo = Math.max(board.maxCombo, comboMultiplier);
  if (comboMultiplier >= maxMultiplier && !board.achievements.comboMaster) {
    board.achievements.comboMaster = true;
  }
  return comboMultiplier;
};

export const dropCombo = board => {
  board.comboLevel = 0;
  board.comboTimer = 0;
};

export const tickCombo = (board, dt) => {
  if (board.comboTimer > 0) {
    board.comboTimer -= dt;
    if (board.comboTimer <= 0) {
      dropCombo(board);
    }
  }
};

export const loadProgress = board => {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data) board.pb = data.pb ?? null;
  } catch {
    board.pb = null;
  }
};

export const saveProgress = board => {
  const record = {
    pb: board.pb,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* ignore */
  }
};

export const evaluatePB = (board, time) => {
  const entry = { score: Math.round(board.score), time: Number(time.toFixed(2)), combo: board.maxCombo };
  if (!board.pb || entry.score > board.pb.score) {
    board.pb = entry;
    saveProgress(board);
    return true;
  }
  return false;
};
