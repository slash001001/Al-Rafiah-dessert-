import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const readJson = (relative, fallback = {}) => {
  try {
    const raw = fs.readFileSync(path.join(root, relative), 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
};

const diffObjects = (baseline, current) => {
  const diff = {};
  const keys = new Set([...Object.keys(baseline ?? {}), ...Object.keys(current ?? {})]);
  keys.forEach(key => {
    const before = baseline?.[key];
    const after = current?.[key];
    if (before !== after) {
      diff[key] = { before, after };
    }
  });
  return diff;
};

const main = async () => {
    const pkg = readJson('package.json', {});
    let engine = 'Unknown';
    if (pkg.dependencies?.phaser) {
      engine = `Phaser ${pkg.dependencies.phaser}`;
    } else if (pkg.dependencies?.three) {
      engine = `Three.js ${pkg.dependencies.three}`;
    }

    const stageDir = path.join(root, 'levels', 'sand_dunes');
    const stageFiles = fs.existsSync(stageDir) ? fs.readdirSync(stageDir).sort() : [];

    const sandConfig = readJson('physics/sand_config.json', {});
    const flags = readJson('config/rafiyah.flags.json', {});

    let defaultPhysics = null;
    try {
      const physicsModule = await import(pathToFileURL(path.join(root, 'levels', 'sand_dunes', 'physics_utils.js')));
      defaultPhysics = physicsModule.DEFAULT_SAND_PHYSICS ?? null;
    } catch (err) {
      defaultPhysics = null;
    }

    const baseline = {
      timestamp: new Date().toISOString(),
      engine,
      stageFiles,
      flags,
      runtime: {
        consoleErrors: 'Not captured (requires manual run)',
        avgFps: null,
        minFps: null,
        notes: 'Run the stage in a browser and update this file with observed metrics.',
      },
      sandPhysics: sandConfig.softSand ?? null,
    };

    const logsDir = path.join(root, 'logs');
    const reportsDir = path.join(root, 'reports');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    fs.writeFileSync(path.join(logsDir, 'rafiyah_baseline.json'), JSON.stringify(baseline, null, 2));
    fs.writeFileSync(path.join(logsDir, 'rafiyah_errors.txt'), 'No runtime errors captured. Run in browser to append real console output.\n');

    const physicsDiff = diffObjects(defaultPhysics, sandConfig.softSand ?? {});
    fs.writeFileSync(path.join(logsDir, 'sand_physics_diff.json'), JSON.stringify({
      timestamp: baseline.timestamp,
      diff: physicsDiff,
    }, null, 2));

    const reportMd = `# Raf’iyah Sand Stage Baseline\n\n- **Timestamp:** ${baseline.timestamp}\n- **Detected engine:** ${engine}\n- **Stage files:** ${stageFiles.join(', ') || 'n/a'}\n- **Flags:** ${Object.keys(flags).length ? JSON.stringify(flags, null, 2) : 'n/a'}\n\n## Runtime Notes\n- Console errors: ${baseline.runtime.consoleErrors}\n- Avg FPS: ${baseline.runtime.avgFps ?? 'TBD'}\n- Min FPS: ${baseline.runtime.minFps ?? 'TBD'}\n\nUpdate this report after running the in-game perf overlay (toggle with F1).\n`;
    fs.writeFileSync(path.join(reportsDir, 'rafiyah_baseline.md'), reportMd);

    console.log('Baseline audit files written.');
};

main();
