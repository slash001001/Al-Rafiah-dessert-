import fs from 'fs';
import path from 'path';

const baseUrl = 'https://slash001001.github.io/Al-Rafiah-dessert-/';

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function fetchHead(url) {
  const res = await fetch(url, { method: 'GET', redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return true;
}

function resolveUrl(src) {
  if (src.startsWith('http')) return src;
  return new URL(src, baseUrl).toString();
}

(async () => {
  try {
    const html = await fetchText(baseUrl);
    const refs = new Set();
    const regex = /(src|href)="(.*?)"/g;
    let m;
    while ((m = regex.exec(html)) !== null) {
      const link = m[2];
      if (link.endsWith('.js') || link.endsWith('.css')) refs.add(resolveUrl(link));
    }
    for (const ref of refs) {
      await fetchHead(ref);
      console.log('OK', ref);
    }
    console.log('pages healthcheck: OK');
  } catch (err) {
    console.error('pages healthcheck failed:', err.message || err);
    process.exit(1);
  }
})();
