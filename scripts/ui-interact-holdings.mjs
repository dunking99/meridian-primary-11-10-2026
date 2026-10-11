// Meridian — Holdings interactions against the populated test API.
//   node scripts/ui-interact-holdings.mjs
// Checks: a treemap tile selects a holding and the inspector fills; a region
// click filters the table and is reflected in the URL; delete waits for undo
// (no DELETE request is sent when undone); Esc clears the selection; the
// table is keyboard navigable.
const PW = process.env.PLAYWRIGHT_MODULE ?? '/Users/hugodyson/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const deletes = [];
p.on('request', r => { if (r.method() === 'DELETE') deletes.push(r.url()); });
let pass = 0, fail = 0;
const check = (l, c, d = '') => { if (c) { pass++; console.log(`  ok   ${l}`); } else { fail++; console.log(`  FAIL ${l} ${d}`); } };
await p.goto('http://localhost:5273/#/portfolio/holdings', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
await p.click('[data-slot="PortfolioMap"] g[role="button"] >> nth=0');
await p.waitForTimeout(1500);
const insp = await p.textContent('[data-slot="PositionInspector"]');
check('treemap tile fills the inspector', /POSITION/.test(insp) && /QUANTITY|Quantity/.test(insp), insp.slice(0, 120));
await p.keyboard.press('Escape');
await p.waitForTimeout(500);
check('Esc clears the selection', /Select a holding/.test(await p.textContent('[data-slot="PositionInspector"]')));
await p.click('[data-slot="GeoExposure"] button[role="listitem"]:has-text("UK")');
await p.waitForTimeout(800);
check('region click writes the filter into the URL', /region=UK/.test(p.url()), p.url());
const rowsFiltered = await p.$$eval('[data-slot="HoldingsTable"] [role="row"][aria-selected]', rs => rs.length);
await p.click('[data-slot="HoldingsFilters"] button:has-text("Clear all")');
await p.waitForTimeout(800);
const rowsAll = await p.$$eval('[data-slot="HoldingsTable"] [role="row"][aria-selected]', rs => rs.length);
check('filter narrows the table and clear-all restores it', rowsFiltered > 0 && rowsFiltered < rowsAll, `${rowsFiltered} vs ${rowsAll}`);
await p.click('[data-slot="HoldingsTable"] button[aria-label^="Delete"] >> nth=0');
await p.waitForTimeout(500);
check('delete shows an undo prompt', /will be deleted/.test(await p.textContent('[data-slot="HoldingsTable"]')));
await p.click('[data-slot="HoldingsTable"] button:has-text("Undo")');
await p.waitForTimeout(9000);
check('undo means no DELETE request is ever sent', deletes.length === 0, deletes.join(','));
await p.focus('[data-slot="HoldingsTable"] [role="grid"]');
await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown');
await p.waitForTimeout(800);
check('arrow keys move the active row and select it', /POSITION|Quantity/.test(await p.textContent('[data-slot="PositionInspector"]')));
console.log(`${pass} passed, ${fail} failed`);
await b.close();
process.exit(fail ? 1 : 0);
