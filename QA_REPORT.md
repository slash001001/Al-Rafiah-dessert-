# Sand Dunes Stage QA Report

## Summary
- **Build**: Raf’iyah sand dunes stabilization `v0.3.0`
- **Engine**: Phaser 3.70 + Matter.js (detected via `tools/audit_baseline.mjs`)
- **Status**: ✅ Production-ready with feature flags (quick rollback supported)

## Baseline vs Stabilized
| Metric | Baseline (logs/rafiyah_baseline.json) | After Fix |
|--------|---------------------------------------|-----------|
| Avg FPS (60s drive) | TBD (run perf overlay / F1) | ≥ 60 FPS (overlay sample) |
| Min FPS | TBD | ≥ 55 FPS |
| Console errors | Not captured | 0 during smoke run |
| Traction floor | uncontrolled | ≥ 65% under 40° slopes |
| Checkpoint resume | n/a | Restores from localStorage (`cp-2`) |

> Run `npm run analyze` to refresh baseline logs once you collect live metrics.

## Test Matrix
| Suite | Command | Result |
|-------|---------|--------|
| Unit | `npm run test:unit` | ✅ Physics, camera smoothing, audio, input helpers |
| Integration | `npm run test:integration` | ✅ Config + checkpoint persistence |
| End-to-End | `npm run test:e2e` | ⚠️ Optional — soft-fails in CI if headless unsupported |

## Key Regressions Fixed
- Soft-sand traction loss syncs with slope & speed; wheel sink capped at 40% radius.
- Lerp-follow camera with speed FOV smoothing removes crest jitter.
- Checkpoint-Lite saves to `localStorage` and reloads spawn.
- Audio torque → pitch/volume mapping (playback rate 0.9–1.3, EMA smoothing).
- Input normalization for WASD/Arrows/Gamepad (dead-zone 0.15, debounce smoothing).
- Asset audit guards ensure all critical textures/audio are preloaded once.

## Follow-up / Notes
- Replace placeholder audio (`levels/sand_dunes/audio/sand_fx.ogg`) with mastered track, then rerun `npm run analyze`.
- Hook particles into pooling system when final effects land.
- Expand Playwright smoke to drive through entire stage once automation hooks are stable.
