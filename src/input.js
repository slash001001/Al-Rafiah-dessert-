const state = {
  holdLeft: false,
  holdRight: false,
  invert: 1,
  actions: {
    jump: false,
    nitro: false,
    winch: false,
    choice: null,
    qteKey: null,
  },
};

const touchButtons = new Map();
const qteButtons = [];

let qteEnabled = false;

const keyMap = {
  ArrowLeft: 'holdLeft',
  ArrowRight: 'holdRight',
  a: 'holdLeft',
  d: 'holdRight',
  A: 'holdLeft',
  D: 'holdRight',
};

const pressMap = {
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

const choiceMap = { '1': 1, '2': 2, '3': 3 };

const qteKeySet = new Set(['k', 'K', 'l', 'L']);

const activePointers = new Map();

const gamepadState = {
  timestamp: 0,
};

const setHold = (key, value) => {
  if (key === 'holdLeft') state.holdLeft = value;
  if (key === 'holdRight') state.holdRight = value;
};

const enqueueAction = (action, value = true) => {
  if (action === 'choice') {
    state.actions.choice = value;
  } else if (action === 'qteKey') {
    state.actions.qteKey = value;
  } else {
    state.actions[action] = value;
  }
};

const handleKeyDown = ev => {
  if (keyMap[ev.key]) {
    setHold(keyMap[ev.key], true);
  }
  if (pressMap[ev.key]) {
    enqueueAction(pressMap[ev.key]);
  }
  if (choiceMap[ev.key]) {
    enqueueAction('choice', choiceMap[ev.key]);
  }
  if (qteKeySet.has(ev.key) && qteEnabled) {
    enqueueAction('qteKey', ev.key.toUpperCase() === 'K' ? 'KeyK' : 'KeyL');
  }
};

const handleKeyUp = ev => {
  if (keyMap[ev.key]) {
    setHold(keyMap[ev.key], false);
  }
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
    if (value === 'left') state.holdLeft = true;
    if (value === 'right') state.holdRight = true;
    activePointers.set(btn, { type, value });
  } else if (type === 'press') {
    enqueueAction(value, true);
  } else if (type === 'choice') {
    enqueueAction('choice', Number(value));
  } else if (type === 'qte') {
    if (qteEnabled) enqueueAction('qteKey', value);
  }
};

const touchEnd = btn => {
  const info = activePointers.get(btn);
  if (!info) return;
  if (info.type === 'hold') {
    if (info.value === 'left') state.holdLeft = false;
    if (info.value === 'right') state.holdRight = false;
  }
  activePointers.delete(btn);
};

export const registerTouchControl = (btn, action) => {
  touchButtons.set(btn, action);
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
  qteEnabled = visible;
  qteButtons.forEach(btn => {
    btn.classList.toggle('hidden', !visible);
  });
};

export const setInvertControls = invert => {
  state.invert = invert ? -1 : 1;
};

export const consumeAction = key => {
  const value = state.actions[key];
  state.actions[key] = key === 'choice' ? null : false;
  return value;
};

export const getInputSnapshot = () => ({
  left: state.invert === 1 ? state.holdLeft : state.holdRight,
  right: state.invert === 1 ? state.holdRight : state.holdLeft,
  rawLeft: state.holdLeft,
  rawRight: state.holdRight,
});

export const pollGamepad = () => {
  const pads = navigator.getGamepads?.() || [];
  const pad = pads[0];
  if (!pad || !pad.connected) return;
  if (pad.timestamp === gamepadState.timestamp) return;
  gamepadState.timestamp = pad.timestamp;
  const axis = pad.axes[0] || 0;
  state.holdLeft = axis < -0.2;
  state.holdRight = axis > 0.2;
  pad.buttons.forEach((btn, index) => {
    if (!btn.pressed) return;
    if (index === 0 || index === 1) enqueueAction('jump');
    if (index === 2) enqueueAction('nitro');
    if (index === 3) enqueueAction('winch');
  });
};

export const resetTransient = () => {
  state.actions.jump = false;
  state.actions.nitro = false;
  state.actions.winch = false;
  state.actions.choice = null;
  state.actions.qteKey = null;
};
