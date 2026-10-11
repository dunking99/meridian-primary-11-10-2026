// Meridian — render every gallery component in all six states, both themes.
//   node scripts/ui-gallery-check.mjs [idFilter]
// Writes overnight-shots/gallery-<id>-<theme>.png and reports console errors
// and any state cell that crashed ("failed to draw").
const PW = process.env.PLAYWRIGHT_MODULE ?? '/Users/hugodyson/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const filter = process.argv[2] ?? null;
const OUT = new URL('../overnight-shots/', import.meta.url).pathname;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', e => errors.push(e.message));
await p.goto('http://localhost:5273/#/gallery', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
const ids = await p.$$eval('nav[aria-label="Components"] button', bs => bs.map(b => b.innerText.trim()));
let bad = 0;
for (let i = 0; i < ids.length; i++) {
  const label = ids[i];
  if (filter && !label.includes(filter)) continue;
  for (const theme of ['dark', 'light']) {
    await p.click(`nav[aria-label="Components"] button >> nth=${i}`);
    await p.click(`main button:has-text("${theme}")`);
    await p.waitForTimeout(500);
    const crashed = await p.$$eval('[data-state]', els => els.filter(e => /failed to draw/.test(e.innerText)).map(e => e.getAttribute('data-state')));
    const id = await p.evaluate(() => new URLSearchParams(location.hash.split('?')[1]).get('c'));
    await p.screenshot({ path: `${OUT}gallery-${id}-${theme}.png`, fullPage: true });
    if (crashed.length) { bad++; console.log(`CRASH ${label} [${theme}]: ${crashed.join(', ')}`); }
  }
}
console.log(`${ids.length} components, ${bad} with crashed states, console errors ${errors.length}${errors.length ? `: ${[...new Set(errors)].slice(0, 5).join(' | ')}` : ''}`);
await b.close();
