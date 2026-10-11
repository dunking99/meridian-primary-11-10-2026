// Meridian — valuation honesty assertions (R1-01, R1-02)
//
// Run:
//   MERIDIAN_DB=/tmp/mo/valuation.db node scripts/test-valuation.mjs
//
// Answers worked out by hand before the code was changed:
//
//   R1-02  A quoted day change is measured against the PREVIOUS close, so a
//          position worth V today that moved p% has pound change
//              V * p / (100 + p)
//          £1,000 up 2%   -> 1000 * 2 / 102  = 19.6078... -> £19.61  (old formula said £20.00)
//          £1,000 down 2% -> 1000 * -2 / 98  = -20.4082... -> -£20.41 (old formula said -£20.00)
//          Portfolio: those two plus £500 cash. Day change = 19.61 - 20.41 = -0.80.
//          Yesterday's total = 2500 - (-0.80) = 2500.80, so dayChangePct =
//          -0.80 / 2500.80 * 100 = -0.0320 -> -0.03%.
//
//   R1-01  One holding priced at £10 x 100 = £1,000, one holding with no
//          price at all. Totals are the priced value only (£1,000 invested,
//          £1,000 total with no cash); partial:true; the unpriced symbol is
//          named in `excluded` with a reason. A fully priced portfolio's
//          response carries neither key and — with no day move, so R1-02
//          cannot change anything — is byte-identical to the pre-change
//          engine kept in the backup folder.

import { run } from '../server/db.js';
import * as pf from '../server/engines/portfolio.js';

const DB = process.env.MERIDIAN_DB;
if (!DB) { console.error('Set MERIDIAN_DB to a throwaway path before running this.'); process.exit(1); }
if (DB.includes('meridian.db')) { console.error('Refusing to run against the real database.'); process.exit(1); }

let passed = 0, failed = 0;
function check(label, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok   ${label}`); }
  else { failed++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
}
const section = n => console.log(`\n${n}\n${'-'.repeat(n.length)}`);

function reset() {
  run('DELETE FROM holdings'); run('DELETE FROM cash');
}
function hold(symbol, qty, avg = 1) {
  run(`INSERT INTO holdings (symbol, name, qty, avg_price, currency, account, wrapper, added_at)
       VALUES (?,?,?,?,?,?,?,?)`, symbol, symbol, qty, avg, 'GBP', 'Main', 'ISA', Date.now());
}

section('R1-02 day change uses the previous close as its base');
reset();
hold('UPP.L', 100); hold('DWN.L', 100);
run('INSERT INTO cash (account, wrapper, currency, amount, updated_at) VALUES (?,?,?,?,?)', 'Main', 'ISA', 'GBP', 500, Date.now());
let v = pf.valuePortfolio({
  'UPP.L': { price: 10, currency: 'GBP', changePct: 2 },
  'DWN.L': { price: 10, currency: 'GBP', changePct: -2 },
});
const up = v.positions.find(p => p.symbol === 'UPP.L');
const dn = v.positions.find(p => p.symbol === 'DWN.L');
check('£1,000 up 2% changed by £19.61, not £20.00', up.dayChangeGBP === 19.61, String(up.dayChangeGBP));
check('£1,000 down 2% changed by -£20.41, not -£20.00', dn.dayChangeGBP === -20.41, String(dn.dayChangeGBP));
check('position changes sum exactly to the portfolio day change',
  +(up.dayChangeGBP + dn.dayChangeGBP).toFixed(2) === v.dayChange, `${up.dayChangeGBP + dn.dayChangeGBP} vs ${v.dayChange}`);
check('portfolio day change is -£0.80', v.dayChange === -0.8, String(v.dayChange));
check('day change % uses yesterday\'s total (2500.80): -0.03%', v.dayChangePct === -0.03, String(v.dayChangePct));
check('a fully priced portfolio carries no partial flag', v.partial === undefined && v.excluded === undefined);

section('R1-01 an unpriced holding is excluded and named, not valued at £0 silently');
reset();
hold('PRC.L', 100); hold('NOPX.L', 50);
v = pf.valuePortfolio({ 'PRC.L': { price: 10, currency: 'GBP', changePct: 0 } });
check('partial is true', v.partial === true);
check('the unpriced symbol is named', v.excluded?.length === 1 && v.excluded[0].symbol === 'NOPX.L', JSON.stringify(v.excluded));
check('the exclusion carries a reason', typeof v.excluded?.[0]?.reason === 'string' && v.excluded[0].reason.length > 10);
check('invested equals the priced value only (£1,000)', v.invested === 1000, String(v.invested));
check('total equals the priced value only (£1,000)', v.total === 1000, String(v.total));
check('missingPrices still lists it (unchanged field)', v.missingPrices.includes('NOPX.L'));

section('R1-01 a fully priced portfolio is byte-identical to the pre-change engine');
reset();
hold('AAA.L', 10, 5); hold('BBB.L', 20, 7);
run('INSERT INTO cash (account, wrapper, currency, amount, updated_at) VALUES (?,?,?,?,?)', 'Main', 'ISA', 'GBP', 123.45, 1);
const prices = { 'AAA.L': { price: 6.5, currency: 'GBP', changePct: 0 }, 'BBB.L': { price: 8.25, currency: 'GBP', changePct: 0 } };
const after = JSON.stringify(pf.valuePortfolio(prices));
let before = null;
try {
  const old = await import('/Users/hugodyson/Meridian-Primary-backup/server/engines/portfolio.js');
  before = JSON.stringify(old.valuePortfolio(prices));
} catch (e) {
  console.log(`  (backup engine could not be loaded: ${e.message})`);
}
check('backup engine loaded for comparison', before != null);
check('output byte-identical with no day move', before === after, before && after ? `${before.length} vs ${after.length} chars` : '');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
