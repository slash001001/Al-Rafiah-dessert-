# Changelog

# Changelog

## [0.3.0] - 2025-10-16
- Added stabilization flag system (`config/rafiyah.flags.json`) and quick revert script.
- Implemented audit tooling, perf overlay toggle (F1), and baseline logs.
- Gated sand physics, camera smoothing, checkpoints, audio torque sync, and perf logging behind flags.
- Introduced checkpoint persistence with localStorage helpers and recovery.
- Expanded unit/integration tests, CI workflow, and npm scripts (`analyze`, Playwright fallback).
- Documented release steps and added release automation script.

## [0.2.0] - 2024-10-16
- Add Sand Dunes scene with procedural dunes, soft-sand physics, and checkpoints.
- Implement lerp-follow camera, sunrise lighting, dynamic shadows, and HUD telemetry.
- Introduce WebAudio wind/sand/suspension layers with interaction unlock.
- Provide physics helper module (`levels/sand_dunes/physics_utils.js`) and Vitest coverage.
- Add build/test tooling scaffold (Vite, Vitest, Playwright) for future automation.

## [0.1.0] - 2024-10-13
- Initial Phaser migration and menu integration.
