// Meridian — composition hierarchy (R1-08), label check (R1-09), and the
// holdings-page reads built on the same valuation (B-23 targets, B-24 cash,
// B-51 concentration).
//
// Run:
//   MERIDIAN_DB=/tmp/mo/comp.db node scripts/test-composition.mjs
//
// Hand-worked answers:
//   Book: A.L £6,000 (sector 'Tech', class Equity), B.L £3,000 (sector null),
//   C.L £1,000 (sector 'Technology'), cash £2,000 -> whole book £12,000.
//   Sector lens with cash: Tech 0.5, Unclassified 0.25, Technology 1/12,
//   Cash 1/6 -> sums to 1. Without cash, denominators are £10,000:
//   Tech 0.6, Unclassified 0.3, Technology 0.1.
//   An all-unclassified book puts 100% in Unclassified.
//   Label check: 'Tech' and 'Technology' normalise to the same sector;
//   'UK' / 'United Kingdom' likewise for geography; ' UK' has stray spacing.
//   Targets: A.L target 50%: weight 6000/12000 = 50% -> drift 0.
//   Concentration: weights of book 0.5, 0.25, 1/12 -> HHI = 0.25 + 0.0625 +
//   0.006944 = 0.319444; top1 50%, top3 83.33%.

import { run } from '../server/db.js';
import * as pf from '../server/engines/portfolio.js';
import { compositionTree, labelCheck, normaliseLabel } from '../server/engines/composition.js';
import { targetsReport, cashReport, concentrationReport } from '../server/engines/holdings-data.js';
import { all } from '../server/db.js';

const DB = process.env.MERIDIAN_DB;
if (!DB) { console.error('Set MERIDIAN_DB to a throwaway path before running this.'); process.exit(1); }
if (DB.includes('meridian.db')) { console.error('Refusing to run against the real database.'); process.exit(1); }

let passed = 0, failed = 0;
function check(label, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok   ${label}`); }
  else { failed++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
}
const near = (a, b, tol = 1e-6) => a != null && Math.abs(a - b) <= tol;
const section = n => console.log(`\n${n}\n${'-'.repeat(n.length)}`);

run('DELETE FROM holdings'); run('DELETE FROM cash');
const add = (s, sector, geo, target = null) => run(`INSERT INTO holdings (symbol, name, qty, avg_price, currency, sector, geography, asset_class, account, wrapper, target_pct, added_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  s, s, 100, 1, 'GBP', sector, geo, 'Equity', 'Main', 'ISA', target, Date.now());
add('A.L', 'Tech', 'UK', 50); add('B.L', null, 'United Kingdom'); add('C.L', 'Technology', ' UK');
run('INSERT INTO cash (account, wrapper, currency, amount, updated_at) VALUES (?,?,?,?,?)', 'Main', 'ISA', 'GBP', 2000, Date.now());
const prices = { 'A.L': { price: 60, currency: 'GBP', changePct: 0 }, 'B.L': { price: 30, currency: 'GBP', changePct: 0 }, 'C.L': { price: 10, currency: 'GBP', changePct: 0 } };
const v = pf.valuePortfolio(prices);

const sumTop = t => t.data.tree.reduce((a, n) => a + n.weight, 0);
const sumLeaves = t => { let s = 0; const w = n => { if (n.children) n.children.forEach(w); else s += n.weight; }; t.data.tree.forEach(w); return s; };

section('R1-08 every lens sums to one, with Unclassified kept visible');
for (const lens of ['class', 'sector', 'region', 'typed', 'wrapper', 'account', 'currency']) {
  for (const includeCash of [true, false]) {
    const t = compositionTree(v, { lens, includeCash });
    check(`${lens}${includeCash ? ' +cash' : ''}: top level sums to 1`, t.available && near(sumTop(t), 1, 1e-4), t.available ? String(sumTop(t)) : t.reason);
    check(`${lens}${includeCash ? ' +cash' : ''}: leaves sum to 1`, t.available && near(sumLeaves(t), 1, 1e-4));
  }
}
const sec = compositionTree(v, { lens: 'sector', includeCash: true });
const g = l => sec.data.groups.find(x => x.label === l)?.weight;
check('sector +cash: Tech 0.5', near(g('Tech'), 0.5), String(g('Tech')));
check('sector +cash: Unclassified 0.25 (not dropped, not spread)', near(g('Unclassified'), 0.25), String(g('Unclassified')));
check('sector +cash: Technology 1/12', near(g('Technology'), 1 / 12, 1e-5));
check('sector +cash: Cash 1/6', near(g('Cash'), 1 / 6, 1e-5));
const secNo = compositionTree(v, { lens: 'sector', includeCash: false });
check('sector without cash: Tech 0.6, Unclassified 0.3', near(secNo.data.groups.find(x => x.label === 'Tech').weight, 0.6) && near(secNo.data.groups.find(x => x.label === 'Unclassified').weight, 0.3));
const reg = compositionTree(v, { lens: 'region', includeCash: false });
check('region lens: single equities placed by listing venue (UK)', reg.data.groups.some(x => x.label === 'UK'));

run('UPDATE holdings SET sector = NULL');
const allU = compositionTree(pf.valuePortfolio(prices), { lens: 'sector', includeCash: false });
check('an all-unclassified book is 100% Unclassified', allU.data.groups.length === 1 && allU.data.groups[0].label === 'Unclassified' && near(allU.data.groups[0].weight, 1));
run("UPDATE holdings SET sector = 'Tech' WHERE symbol = 'A.L'"); run("UPDATE holdings SET sector = 'Technology' WHERE symbol = 'C.L'");

const none = compositionTree({ positions: [], cash: 0 }, { lens: 'sector' });
check('an empty book is refused, not NaN', none.available === false && typeof none.reason === 'string');

section('R1-09 label check reports, never rewrites');
check("'Tech' and 'Technology' normalise together", normaliseLabel('Tech') === normaliseLabel('Technology'));
check("'UK' and 'United Kingdom' normalise together", normaliseLabel('UK') === normaliseLabel('United Kingdom'));
const before = JSON.stringify(all('SELECT * FROM holdings ORDER BY id'));
const lc = labelCheck(all('SELECT * FROM holdings ORDER BY symbol'));
check('sector near-duplicate found', lc.data.fields.sector.nearDuplicates.length === 1, JSON.stringify(lc.data.fields.sector.nearDuplicates));
check('geography near-duplicate found (UK / United Kingdom / " UK")', lc.data.fields.geography.nearDuplicates.length === 1 && lc.data.fields.geography.nearDuplicates[0].spellings.length === 3);
check('stray whitespace reported', lc.data.fields.geography.whitespace.some(w => w.symbol === 'C.L'));
check('unclassified sector counted', lc.data.fields.sector.unclassified.count === 1);
check('the holdings table is unchanged after the check', JSON.stringify(all('SELECT * FROM holdings ORDER BY id')) === before);

section('B-23 targets, B-24 cash, B-51 concentration');
const v2 = pf.valuePortfolio(prices);
const tg = targetsReport(v2);
check('targets available with one set', tg.available);
check('A.L at its 50% target has drift 0', tg.data.rows.find(r => r.symbol === 'A.L').driftPp === 0);
check('untargeted holdings are named, not given a target', tg.data.untargeted.includes('B.L') && tg.data.rows.find(r => r.symbol === 'B.L').targetPct === null);
run('UPDATE holdings SET target_pct = NULL');
check('no targets at all -> refusal inviting the user to set one', targetsReport(pf.valuePortfolio(prices)).available === false);
const cr = cashReport(v2, prices, { lastFetch: Date.now(), mandate: { cashBufferPct: 5, riskLabel: 'Test' } });
check('cash report total £2,000', cr.available && cr.data.total === 2000);
check('buffer 5% of £12,000 = £600, deployable £1,400', cr.data.buffer.gbp === 600 && cr.data.buffer.deployable === 1400, JSON.stringify(cr.data.buffer));
const cc = concentrationReport(v2, { mandate: { maxPositionPct: 30, maxSectorPct: 40, maxPositions: 10, riskLabel: 'T', horizonLabel: 'T' } });
check('top1 50%', cc.data.top1 === 50, String(cc.data.top1));
check('top3 83.33%', cc.data.top3 === 83.33, String(cc.data.top3));
check('HHI 0.3194', near(cc.data.hhi, 0.3194, 1e-4), String(cc.data.hhi));
check('breach reported for a 50% position over a 30% cap', cc.data.breaches.some(b => b.kind === 'position' && b.symbol === 'A.L'));
check('Pareto cumulative ends at invested share (83.33%)', cc.data.pareto[cc.data.pareto.length - 1].cumulativePct === 83.33);
const cc2 = concentrationReport(v2, { mandate: { maxPositionPct: 60, maxSectorPct: 90, maxPositions: 10 } });
check('no banner-worthy breach when caps are not exceeded', cc2.data.breaches.length === 0, JSON.stringify(cc2.data.breaches));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
