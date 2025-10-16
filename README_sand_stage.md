# Raf’iyah Sand Stage Stabilization Guide

## Feature Flags
All stabilization features are toggled via `config/rafiyah.flags.json`:

```json
{
  "enableSandTuning": true,
  "enableCameraLerp": true,
  "enableCheckpointLite": true,
  "enableAudioTorqueSync": true,
  "enablePerfOverlay": true
}
```

Flip any flag to `false` for quick rollback. To disable all at once, run:

```bash
node tools/quick_revert.mjs
```

## Recommended Workflow
1. **Audit** – `npm run analyze` writes baseline logs (`logs/rafiyah_baseline.json`, `/reports/rafiyah_baseline.md`).
2. **Enable Flags Gradually**
   - `enableSandTuning`: verify soft-sand traction (no wheel sink <10 km/h).
   - `enableCameraLerp`: crest drive, confirm jitter-free follow.
   - `enableCheckpointLite`: drive past CP1, refresh — spawn resumes at CP1.
   - `enableAudioTorqueSync`: accelerate/brake; listen for smooth pitch changes.
   - `enablePerfOverlay`: toggle with `F1`, ensure FPS ≥60 during 60s session.
3. **Tests**
   ```bash
   npm run test           # unit + integration
   npm run test:e2e       # Playwright smoke (optional, soft-fails in CI)
   ```
4. **Release**
   ```bash
   npm run release        # test → build → deploy
   ```

## Scene Entry Points
- Phaser scene: `levels/sand_dunes/sand_dunes_scene.js`
- Physics helpers: `levels/sand_dunes/physics_utils.js`
- Stabilization helpers (camera/audio/input): `levels/sand_dunes/stabilization_utils.js`
- Checkpoint storage helpers: `levels/sand_dunes/checkpoint_store.js`

## CI / Tooling
- `npm run lint` – ESLint sweep (JS/TS).
- `npx tsc --noEmit` – type-check (run in CI).
- GitHub Workflow: `.github/workflows/ci.yml` (lint → tests → e2e → build).

## Logs & Reports
- `/logs/rafiyah_baseline.json` – baseline snapshot (update via `npm run analyze`).
- `/logs/sand_physics_diff.json` – diff between defaults and current sand config.
- `/logs/rafiyah_errors.txt` – append browser console errors when observed.
- `/reports/rafiyah_baseline.md` – summary of baseline metrics.

Keep the perf overlay (`F1`) closed by default; enable only when profiling to avoid UI clutter.
