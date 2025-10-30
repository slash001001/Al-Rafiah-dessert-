import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  storeCheckpoint,
  loadCheckpoint,
  clearCheckpoint,
  completedCheckpointIds,
  CHECKPOINT_STORAGE_KEY,
} from '../../levels/sand_dunes/checkpoint_store.js';

const terrainSpec = JSON.parse(
  readFileSync(resolve(process.cwd(), 'levels/sand_dunes/terrain_config.json'), 'utf8')
);
const vehicleSpec = JSON.parse(
  readFileSync(resolve(process.cwd(), 'levels/sand_dunes/vehicle_config.json'), 'utf8')
);

describe('Sand Dunes scene integration', () => {
  it('loads terrain profile with valid dune segments', () => {
    expect(Array.isArray(terrainSpec.dunes)).toBe(true);
    expect(terrainSpec.dunes.length).toBeGreaterThanOrEqual(3);
    terrainSpec.dunes.forEach((dune: any) => {
      expect(dune.heightMeters).toBeGreaterThan(1);
      expect(dune.heightMeters).toBeLessThanOrEqual(4.5);
      expect(dune.lengthMeters).toBeGreaterThan(20);
    });
  });

  it('provides vehicle configuration sufficient for spawning', () => {
    expect(vehicleSpec.massKg).toBeGreaterThan(1000);
    expect(vehicleSpec.wheelBaseMeters).toBeGreaterThan(2.5);
    expect(vehicleSpec.wheelRadiusMeters).toBeGreaterThan(0.3);
    expect(vehicleSpec.engine.maxTorque).toBeGreaterThan(400);
  });

  it('defines three checkpoints with bilingual labels', () => {
    const checkpoints = terrainSpec.checkpoints.slice(0, 3);
    expect(checkpoints.length).toBe(3);
    checkpoints.forEach((cp: any) => {
      expect(cp.labelAr).toBeTruthy();
      expect(cp.labelEn).toBeTruthy();
    });
  });

  it('persists and restores checkpoint progress via storage helpers', () => {
    const storage = window.localStorage;
    clearCheckpoint(storage);
    expect(loadCheckpoint(storage)).toBeNull();

    storeCheckpoint(storage, { id: 'cp-2', index: 1, anchorX: 2048 });
    const stored = storage.getItem(CHECKPOINT_STORAGE_KEY);
    expect(stored).not.toBeNull();

    const restored = loadCheckpoint(storage);
    expect(restored?.id).toBe('cp-2');
    expect(restored?.anchorX).toBe(2048);

    const mockCheckpoints = [
      { checkpointData: { id: 'cp-1', index: 0 } },
      { checkpointData: { id: 'cp-2', index: 1 } },
      { checkpointData: { id: 'cp-3', index: 2 } },
    ];
    const ids = completedCheckpointIds(mockCheckpoints, 1);
    expect(ids).toEqual(['cp-1', 'cp-2']);

    clearCheckpoint(storage);
    expect(loadCheckpoint(storage)).toBeNull();
  });
});
