# لعبة الرافعية — Alrafyah Game

A complete 2D dune-climb web game inspired by the Alrafyah blueprint. The goal is simple: drive an unbranded 4x4 up the dunes, avoid hidden **Rabdat** soft-sand traps, collect camp checklist items, survive sand gusts and a distant helicopter event, and reach **Al-Seef** at the summit.

## Features

- 2D side-scroller dune climb, playable on desktop and mobile.
- Keyboard + touch controls.
- Warm golden-hour → neon desert night visual transition.
- Procedural dune terrain, tire tracks, sand particles, skyline, distant highway cue, and mosque silhouette.
- Hidden Rabdat traps with rocking recovery and upgradeable winch.
- Random events: light sandstorm gust + distant training helicopter silhouette.
- Camp checklist collectibles: salt, knife, tongs, onion, mayo.
- Upgrade system saved with `localStorage`: engine, tires, suspension, winch.
- Arabic + English UI toggle.
- Generated visuals and generated WebAudio sounds; no external runtime assets.
- Static deployment ready for GitHub Pages.

## Run locally

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

No package installation is required because the game is dependency-free. `npm` is only used to run the Node scripts.

## Build

```bash
npm run build
```

This creates:

```text
dist/
```

## Preview build

```bash
npm run preview
```

Open:

```text
http://localhost:4173
```

## Deploy to GitHub Pages — recommended workflow

1. Create a GitHub repo, for example:

```text
Al-Rafiah-dessert-
```

2. Push this project to `main`.

3. In GitHub:

```text
Settings → Pages → Source: GitHub Actions
```

4. The included workflow `.github/workflows/pages.yml` will build and deploy automatically.

Expected URL format:

```text
https://<username>.github.io/<repo>/
```

For your current project naming, likely:

```text
https://slash001001.github.io/Al-Rafiah-dessert-/
```

## Deploy manually to `gh-pages`

After setting `origin`:

```bash
npm run build
npm run deploy:gh-pages
```

Then enable:

```text
Settings → Pages → Deploy from branch → gh-pages / root
```

## Controls

Desktop:

```text
D / Right Arrow  = Gas
A / Left Arrow   = Brake / Reverse
Space            = Winch recovery if upgraded
Q / E            = Balance/tilt in air
Esc              = Back to menu
```

Mobile:

```text
Use on-screen Gas, Brake, Winch, Q, E buttons.
```

## Tuning constants

Open `src/main.js` and `src/terrain.js`.

Recommended constants to adjust:

- Terrain length: `Terrain.length`
- Trap positions: `trapXs` in `Terrain.createTraps()`
- Upgrade max level: `MAX_UPGRADE_LEVEL`
- Upgrade costs: `UPGRADE_COST`
- Engine force: `engineForce` inside `updatePlay()`
- Traction: `traction` inside `updatePlay()`
- Event timing: `nextEventAt` and active event duration
- Win condition: `terrain.finishX`

## Safety note

The game is fictional and arcade-style. Real dune driving requires a proper 4x4, local knowledge, safe practice, and respect for the place.
