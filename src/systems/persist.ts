export const getNumber = (key: string, def = 0) => {
  if (typeof localStorage === 'undefined') return def;
  const v = localStorage.getItem(key);
  if (v == null) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

export const setNumber = (key: string, value: number) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, String(value));
};

export const inc = (key: string, delta = 1) => {
  setNumber(key, getNumber(key, 0) + delta);
};

export const getBool = (key: string, def = false) => {
  if (typeof localStorage === 'undefined') return def;
  const v = localStorage.getItem(key);
  if (v == null) return def;
  return v === '1';
};

export const setBool = (key: string, val: boolean) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, val ? '1' : '0');
};
