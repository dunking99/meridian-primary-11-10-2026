// Meridian — Performance interactions: heatmap month click sets the return
// chart to that month; a period row click sets the chart range; benchmark
// chips switch the benchmark; unfillable ranges are disabled.
const PW = process.env.PLAYWRIGHT_MODULE ?? '/Users/hugodyson/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
let pass = 0, fail = 0;
const check = (l, c, d = '') => { if (c) { pass++; console.log(`  ok   ${l}`); } else { fail++; console.log(`  FAIL ${l} ${d}`); } };
await p.goto('http://localhost:5273/#/portfolio/performance', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
await p.click('[data-slot="MonthlyReturns"] button[role="cell"] >> nth=3');
await p.waitForTimeout(1500);
check('heatmap click shows that month on the chart', /clicked on the monthly grid/.test(await p.textContent('[data-slot="ReturnChart"]')));
await p.click('[data-slot="PeriodsTable"] button[role="row"]:has-text("3M")');
await p.waitForTimeout(1500);
const pressed = await p.$eval('[data-slot="ReturnChart"] [role="radiogroup"][aria-label="Range"] [aria-checked="true"]', e => e.textContent);
check('period row sets the chart range', pressed === '3M', pressed);
const disabled = await p.$$eval('[data-slot="ReturnChart"] [role="radiogroup"][aria-label="Range"] button[disabled]', bs => bs.map(x => x.textContent));
check('unfillable ranges are disabled (5Y on ~3.7y of history)', disabled.includes('5Y'), disabled.join(','));
await p.click('[data-slot="ReturnChart"] button:has-text("MSCI World") >> nth=0');
await p.waitForTimeout(1500);
check('benchmark chip switches the comparison', /against the benchmarks/.test(await p.textContent('[data-slot="ReturnChart"]')) && /MSCI World/.test(await p.textContent('[data-slot="PeriodsTable"]')));
console.log(`${pass} passed, ${fail} failed`);
await b.close(); process.exit(fail ? 1 : 0);
