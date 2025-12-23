import { readFileSync } from 'node:fs';

const BASE = 'https://slash001001.github.io/Al-Rafiah-dessert-/';

async function fetchText(url) {
  const res = await fetch(url);
  return { ok: res.ok, status: res.status, url, text: res.ok ? await res.text() : '' };
}

async function fetchHead(url) {
  const res = await fetch(url, { method: 'HEAD' });
  return { ok: res.ok, status: res.status, url };
}

function extractAssets(html) {
  const js = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);
  const css = [...html.matchAll(/href="([^"]+\.css)"/g)].map(m => m[1]);
  return [...js, ...css];
}

async function main() {
  console.log(`Checking ${BASE}`);
  const root = await fetchText(BASE);
  console.log(`Root: ${root.status}`);
  if (!root.ok) return;
  const assets = extractAssets(root.text);
  for (const asset of assets) {
    const url = asset.startsWith('http') ? asset : new URL(asset, BASE).href;
    const res = await fetchHead(url);
    console.log(`${res.status} ${url}`);
  }
}

main().catch(err => {
  console.error('Healthcheck failed', err);
  process.exitCode = 1;
});
