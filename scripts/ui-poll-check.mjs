// Meridian — does a price change update only what depends on it? (PG-10, R2-05)
//
//   node scripts/ui-poll-check.mjs [page=overview] [fixture=/tmp/mo/prices-populated.json]
//
// Loads the page against the populated test API (3101, started with a price
// fixture), snapshots every slot's HTML, changes one holding's quote in the
// fixture file, asks the server to re-read it, waits for the page's version
// poll, and reports which API paths were refetched and which slots redrew.
// The fixture file is restored afterwards.
import { readFileSync, writeFileSync } from 'fs';
const PW = process.env.PLAYWRIGHT_MODULE ?? '/Users/hugodyson/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const page = process.argv[2] ?? 'overview';
const FIX = process.argv[3] ?? '/tmp/mo/prices-populated.json';
const original = readFileSync(FIX, 'utf8');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto(`http://localhost:5273/#/portfolio/${page}`, { waitUntil: 'networkidle' });
await p.waitForTimeout(3000);
const snap = () => p.$$eval('[data-slot]', els => Object.fromEntries(els.map(e => [e.getAttribute('data-slot') + '#' + [...e.parentNode.children].indexOf(e), e.innerHTML])));
const before = await snap();
const requested = [];
p.on('request', r => { const u = new URL(r.url()); if (u.port === '3101' && u.pathname !== '/data-version') requested.push(u.pathname + u.search); });
try {
  const q = JSON.parse(original);
  const sym = 'TSEM.L';
  q[sym] = { ...q[sym], price: +(q[sym].price * 1.03).toFixed(4), changePct: +(q[sym].changePct + 3).toFixed(2) };
  writeFileSync(FIX, JSON.stringify(q));
  await fetch('http://localhost:3101/dev/prices/refresh', { method: 'POST' });
  await p.waitForTimeout(14000);
  const after = await snap();
  const changed = Object.keys(before).filter(k => before[k] !== after[k]);
  const unchanged = Object.keys(before).filter(k => before[k] === after[k]);
  console.log('refetched:', [...new Set(requested)].join('\n  ') || '(none)');
  console.log('redrawn slots:', changed.join(', ') || '(none)');
  console.log('untouched slots:', unchanged.join(', '));
  writeFileSync(new URL('../overnight-shots/' + page + '-poll-check.json', import.meta.url), JSON.stringify({ refetched: [...new Set(requested)], changed, unchanged }, null, 1));
} finally {
  writeFileSync(FIX, original);
  await fetch('http://localhost:3101/dev/prices/refresh', { method: 'POST' }).catch(() => {});
  await b.close();
}
