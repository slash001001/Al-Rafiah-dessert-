# Taees Desert Adventure

A polished Phaser 3 remake of the classic off-road Saudi dunes experience. The project embraces an Angry Birds-inspired art direction blended with Hill Climb Racing physics, delivering bright, premium visuals and bilingual UX.

## Features
- Stylised Saudi dune environments with parallax layers, palm trees, camels, signage, and Aramco barrels placeholders.
- Responsive gameplay built with Phaser 3 + Matter physics: suspension constraints, boost, tilt control, and dust particles.
- Three handcrafted regions (الدمام، العلا، الثمامة) driven by `config.json` for quick iteration on terrain, decor, coins, and checkpoints.
- Fully bilingual interface (Arabic/English) with rounded UI, toasts, and on-screen mobile controls.
- Deploy-ready structure for GitHub Pages, using only CDN-hosted Phaser and local assets.

## Controls
- **Keyboard:** `→` accelerate, `←` reverse, `↑` air tilt forward, `↓` air tilt back, `Space` boost, `P` pause, `L` switch language.
- **Touch:** right button accelerate, left button reverse, centre button activates nitro.

## Audio
Handcrafted WAV assets inside `assets/sounds/` feature synthesized oud phrases and supporting SFX generated specifically for this build. Swap them with studio recordings if you prefer.

## Development
1. Serve locally (any static server) and open `index.html` inside the `game/` directory.
2. Tune dunes, collectibles, and decor via `config.json`.
3. Replace SVG placeholders inside `assets/` with final illustrations while keeping filenames intact.

## Deployment
1. Create a new GitHub repository.
2. Upload the contents of the `game/` folder to the repo root.
3. Enable GitHub Pages for the `main` branch with `/` as the root (or deploy the folder as a standalone repo).
4. Access the live build at `https://username.github.io/game/`.

Enjoy the dunes! 🎉
