export const CHECKPOINT_STORAGE_KEY = 'rafiyah.sand.progress';

export const serializeCheckpoint = data => ({
  id: data?.id ?? null,
  index: typeof data?.index === 'number' ? data.index : 0,
  anchorX: typeof data?.anchorX === 'number' ? data.anchorX : null,
});

export function storeCheckpoint(storage, data) {
  if (!storage) return;
  const payload = serializeCheckpoint(data);
  try {
    storage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Checkpoint store failed', err);
  }
}

export function loadCheckpoint(storage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CHECKPOINT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return serializeCheckpoint(parsed);
  } catch (err) {
    console.warn('Checkpoint load failed', err);
    return null;
  }
}

export function clearCheckpoint(storage) {
  if (!storage) return;
  try {
    storage.removeItem(CHECKPOINT_STORAGE_KEY);
  } catch (err) {
    console.warn('Checkpoint clear failed', err);
  }
}

export function completedCheckpointIds(checkpoints, targetIndex) {
  if (!Array.isArray(checkpoints)) return [];
  return checkpoints
    .filter(cp => typeof cp?.checkpointData?.index === 'number' && cp.checkpointData.index <= targetIndex)
    .map(cp => cp.checkpointData.id);
}
