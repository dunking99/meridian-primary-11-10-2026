// Meridian — Analysis interactions: the market-move slider updates the
// shock impact live without a request; the Monte Carlo horizon slider
// refetches once (debounced); a scenario card opens its per-holding table.
const PW = process.env.PLAYWRIGHT_MODULE ?? '/Users/hugodyson/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
let pass = 0, fail = 0;
const check = (l, c, d = '') => { if (c) { pass++; console.log(`  ok   ${l}`); } else { fail++; console.log(`  FAIL ${l} ${d}`); } };
await p.goto('http://localhost:5273/#/portfolio/analysis', { waitUntil: 'networkidle' });
await p.waitForTimeout(3000);
const reqs = [];
p.on('request', r => { if (r.url().includes(':3101') && !r.url().includes('data-version')) reqs.push(r.url()); });
await p.click('[data-slot="ScenarioLab"] button[role="radio"]:has-text("Your shock")');
const before = await p.textContent('[data-slot="ScenarioLab"]');
const slider = await p.$('[data-slot="ScenarioLab"] input[type="range"]');
await slider.focus(); for (let i = 0; i < 5; i++) await p.keyboard.press('ArrowLeft');
await p.waitForTimeout(400);
const after = await p.textContent('[data-slot="ScenarioLab"]');
check('arrow keys move the shock slider and the impact updates', before !== after && /-15%/.test(after), after.slice(0, 80));
check('the shock slider sends no request', reqs.length === 0, reqs.join(','));
await p.click('[data-slot="ScenarioLab"] button[role="radio"]:has-text("Presets")');
await p.click('[data-slot="ScenarioLab"] button[role="listitem"]:has-text("Yen carry")');
await p.waitForTimeout(500);
check('a scenario card opens its per-holding table', /own history|beta/.test(await p.textContent('[data-slot="ScenarioLab"]')));
const mc = await p.$('[data-slot="MonteCarlo"] input[type="range"] >> nth=0');
await mc.focus(); for (let i = 0; i < 5; i++) await p.keyboard.press('ArrowRight');
await p.waitForTimeout(2500);
const mcReqs = reqs.filter(u => u.includes('montecarlo'));
check('Monte Carlo horizon refetches once after the drag settles', mcReqs.length === 1 && /years=15/.test(mcReqs[0]), mcReqs.join(','));
console.log(`${pass} passed, ${fail} failed`);
await b.close(); process.exit(fail ? 1 : 0);
