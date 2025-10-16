# Rafiah Dune Adventure

Fully self-contained Phaser 3 experience tailored for GitHub Pages. All assets are generated locally, so you only need to open `index.html`.

## Run
- Open `index.html` in any modern desktop or mobile browser (Chrome, Safari, Edge, Firefox).
- No build step or server required.

## Controls
- **Desktop**
  - `Up / W` – throttle
  - `Down / S` – brake / reverse
  - `Left / A`, `Right / D` – tilt in air / weight transfer
  - `Shift` – nitro boost
  - `Space` – handbrake
  - `P` or on-screen pause icon – pause menu
- **Mobile**
  - Bottom-left buttons: tilt left / tilt right (right also drives forward, left gives reverse)
  - Bottom-right buttons: brake, nitro
  - Pause button in lower-right corner

## Settings
- Pause menu (tap `II`) exposes:
  1. Resume / Restart
  2. Music and SFX toggles
  3. Language switch (Arabic / English)
  4. Mode toggle (Family Safe vs. Arcade Cartoon when enabled in config)
- Toggle reduced motion via pause menu switches; HUD reflects nitro, combo, and kettle (spill meter).

## GitHub Pages Deployment
1. Commit the `` folder to your repository.
2. In repository settings, enable **GitHub Pages** for the `main` branch with `/game` as the root.
3. After Pages finishes building, access the published URL to play Rafiah Dune Adventure in the browser.
