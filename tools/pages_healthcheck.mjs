import { JSDOM } from 'jsdom';

const BASE = 'https://slash001001.github.io/Al-Rafiah-dessert-/';

async function head(url) {
  const res = await fetch(url, { method: 'HEAD' });
  return { url, status: res.status, ok: res.ok };
}

async function main() {
  const res = await fetch(BASE);
  console.log(`Root ${res.status}`);
  if (!res.ok) process.exit(1);
  const html = await res.text();
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const assets = [
    ...Array.from(doc.querySelectorAll('script[type="module"]')).map(s => s.getAttribute('src')).filter(Boolean),
    ...Array.from(doc.querySelectorAll('link[rel="modulepreload"]')).map(l => l.getAttribute('href')).filter(Boolean),
    ...Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).map(l => l.getAttribute('href')).filter(Boolean)
  ];
  for (const asset of assets) {
    const url = asset!.startsWith('http') ? asset! : new URL(asset!, BASE).href;
    const r = await head(url);
    console.log(`${r.status} ${url}`);
    if (!r.ok) process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
