#!/usr/bin/env node
import { cpSync, existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const dist = resolve(root, 'dist');
const worktree = resolve(root, '.deploy-gh-pages-worktree');
function run(cmd, options = {}) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...options });
}
function tryRun(cmd, options = {}) {
  try { run(cmd, options); return true; } catch { return false; }
}
function cleanDirectoryExceptGit(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === '.git') continue;
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}
if (!existsSync(dist)) throw new Error('dist/ not found. Run npm run build first.');
run('git rev-parse --is-inside-work-tree');
run('git remote get-url origin');
tryRun(`git worktree remove ${JSON.stringify(worktree)} --force`);
rmSync(worktree, { recursive: true, force: true });
tryRun('git fetch origin gh-pages:gh-pages');
run(`git worktree add -B gh-pages ${JSON.stringify(worktree)}`);
cleanDirectoryExceptGit(worktree);
cpSync(dist, worktree, { recursive: true });
writeFileSync(join(worktree, '.nojekyll'), '');
run('git add -A', { cwd: worktree });
tryRun('git commit -m "deploy: Alrafyah game to GitHub Pages 🚀"', { cwd: worktree });
run('git push origin gh-pages --force', { cwd: worktree });
run(`git worktree remove ${JSON.stringify(worktree)} --force`);
console.log('Deployed to gh-pages branch. Enable GitHub Pages: Settings → Pages → Deploy from branch → gh-pages / root.');
