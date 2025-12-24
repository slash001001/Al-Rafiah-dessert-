const overlayId = 'rafiah-overlay';
const statusId = 'rafiah-overlay-status';
const errorId = 'rafiah-overlay-error';

const ensureRoot = () => {
  let root = document.getElementById(overlayId) as HTMLDivElement | null;
  if (root) return root;
  root = document.createElement('div');
  root.id = overlayId;
  root.style.position = 'fixed';
  root.style.inset = '12px';
  root.style.display = 'flex';
  root.style.flexDirection = 'column';
  root.style.justifyContent = 'flex-start';
  root.style.pointerEvents = 'none';
  root.style.zIndex = '9999';
  document.body.appendChild(root);

  const status = document.createElement('div');
  status.id = statusId;
  status.style.background = 'rgba(11,15,20,0.85)';
  status.style.color = '#e5e7eb';
  status.style.font = '16px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  status.style.padding = '10px 12px';
  status.style.border = '1px solid #38bdf8';
  status.style.borderRadius = '10px';
  status.textContent = 'Loading Rafiah…';
  root.appendChild(status);

  const err = document.createElement('div');
  err.id = errorId;
  err.style.marginTop = '8px';
  err.style.display = 'none';
  err.style.background = 'rgba(120,29,29,0.92)';
  err.style.color = '#fff1f2';
  err.style.font = '14px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  err.style.padding = '10px 12px';
  err.style.border = '1px solid #fecdd3';
  err.style.borderRadius = '10px';
  err.style.whiteSpace = 'pre-wrap';
  root.appendChild(err);

  return root;
};

export const createOverlay = () => {
  ensureRoot();
};

export const setOverlayStatus = (text: string) => {
  const status = document.getElementById(statusId);
  if (status) status.textContent = text;
};

export const showOverlayError = (message: string) => {
  const err = document.getElementById(errorId);
  if (err) {
    err.style.display = 'block';
    err.textContent = message;
  }
};

window.onerror = (_msg, _src, _line, _col, error) => {
  showOverlayError(`window.onerror: ${error instanceof Error ? error.message : String(_msg)}`);
};

window.onunhandledrejection = (ev) => {
  const reason = (ev as PromiseRejectionEvent).reason;
  showOverlayError(`unhandledrejection: ${reason instanceof Error ? reason.message : String(reason)}`);
};
