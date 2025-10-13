const state = {
  holdLeft: false,
  holdRight: false,
  invert: 1,
  invertTimer: 0,
  actions: {
    jump: false,
    nitro: false,
    winch: false,
    choice: null,
    qteKey: null,
  },
};

const touchMap = new Map();
const qteButtons = [];
let qteActive = false;

const keyHoldMap = {
  ArrowLeft: 'holdLeft',
  ArrowRight: 'holdRight',
  a: 'holdLeft',
  d: 'holdRight',
  A: 'holdLeft',
  D: 'holdRight',
};

const keyPressMap = {
  ArrowUp: 'jump',
  ' ': 'jump',
  Spacebar: 'jump',
  w: 'jump',
  W: 'jump',
  n: 'nitro',
  N: 'nitro',
  q: 'winch',
  Q: 'winch',
};

const choiceKeys = { '1': 1, '2': 2, '3': 3 };
const qteKeys = new Set(['k', 'K', 'l', 'L']);

const setHold = (key, value) => {
  if (key === 'holdLeft') state.holdLeft = value;
  if (key === 'holdRight') state.holdRight = value;
};

const enqueue = (action, value = true) => {
  if (action === 'choice') state.actions.choice = value;
  else if (action === 'qteKey') state.actions.qteKey = value;
  else state.actions[action] = value;
};

const handleKeyDown = event => {
  const hold = keyHoldMap[event.key];
  if (hold) setHold(hold, true);
  const press = keyPressMap[event.key];
  if (press) enqueue(press);
  if (choiceKeys[event.key]) enqueue('choice', choiceKeys[event.key]);
  if (qteActive && qteKeys.has(event.key)) enqueue('qteKey', event.key.toUpperCase() === 'K' ? 'KeyK' : 'KeyL');
};

const handleKeyUp = event => {
  const hold = keyHoldMap[event.key];
  if (hold) setHold(hold, false);
};

export const setupInput = () => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('blur', () => {
    state.holdLeft = false;
    state.holdRight = false;
  });
};

const touchStart = (btn, action) => {
  if (!action) return;
  const [type, value] = action.split(':');
  if (type === 'hold') {
    setHold(`hold${value[0].toUpperCase()}${value.slice(1)}`, true);
    touchMap.set(btn, { type, value });
  } else if (type === 'press') {
    enqueue(value);
  } else if (type === 'choice') {
    enqueue('choice', Number(value));
  } else if (type === 'qte' && qteActive) {
    enqueue('qteKey', value);
  }
};

const touchEnd = btn => {
  const info = touchMap.get(btn);
  if (!info) return;
  if (info.type === 'hold') setHold(info.value === 'left' ? 'holdLeft' : 'holdRight', false);
  touchMap.delete(btn);
};

export const registerTouchControl = (btn, action) => {
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    touchStart(btn, action);
  });
  btn.addEventListener('pointerup', e => {
    e.preventDefault();
    touchEnd(btn);
  });
  btn.addEventListener('pointerleave', () => touchEnd(btn));
};

export const registerQTEButton = btn => {
  qteButtons.push(btn);
  btn.classList.add('hidden');
};

export const setQTEVisible = visible => {
  qteActive = visible;
  qteButtons.forEach(btn => btn.classList.toggle('hidden', !visible));
};

export const setInvertControls = invert => {
  state.invert = invert ? -1 : 1;
};

export const scheduleInvert = seconds => {
  state.invertTimer = Math.max(state.invertTimer, seconds);
};

export const consumeAction = key => {
  const value = state.actions[key];
  if (key === 'choice') state.actions.choice = null;
  else state.actions[key] = false;
  return value;
};

export const getInputSnapshot = () => {
  if (state.invertTimer > 0) state.invertTimer = Math.max(0, state.invertTimer - 1 / 60);
  const invert = state.invertTimer > 0 ? -state.invert : state.invert;
  return {
    left: invert === 1 ? state.holdLeft : state.holdRight,
    right: invert === 1 ? state.holdRight : state.holdLeft,
    rawLeft: state.holdLeft,
    rawRight: state.holdRight,
    invertActive: invert === -1,
  };
};

export const resetTransient = () => {
  state.actions.jump = false;
  state.actions.nitro = false;
  state.actions.winch = false;
  state.actions.qteKey = null;
};
