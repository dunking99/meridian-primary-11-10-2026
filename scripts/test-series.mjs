// Meridian — portfolio series, periods, per-holding returns, calendar returns,
// drawdowns, capture and the value bridge (R1-05, R1-06, R1-07, B-13, B-14,
// B-17, B-18).
//
// Run:
//   MERIDIAN_DB=/tmp/mo/series.db node scripts/test-series.mjs
//
// The world is built so every answer is known before the engine runs:
//
//   GROW.L  closes 100 x 1.001^k on EVERY calendar day k (weekends included,
//           so "one month" is exactly the number of calendar days in it).
//           Series ends on 2026-09-29, starts 399 days earlier.
//   FALL.L  closes 100 x 0.999^k on the same days.
//   ^FTSE   identical to GROW.L but with every Wednesday missing.
//
//   Quantities are 1,000 and 2,000 because the reconstruction stores pound
//   values to 2 decimals; at ~£100 a position that rounding would show in the
//   third decimal of a percentage, at ~£100,000 it does not.
//
//   With GROW.L alone, the portfolio IS GROW.L, so:
//     1W  = 1.001^7   - 1 = 0.7021%
//     1M  = 1.001^31  - 1 = 3.1480%   (2026-08-29 -> 2026-09-29, 31 days)
//     YTD = 1.001^272 - 1 = 31.24%    (2025-12-31 -> 2026-09-29, 272 days)
//     1Y  = 1.001^365 - 1 = 44.03%
//     3Y  refused: history starts 2025-08-26, needed by 2023-09-29.
//   The benchmark is the same series, so on every date both have, the
//   rebased benchmark equals the rebased portfolio and relative is 100.
//
//   With GROW.L (qty 1000) and FALL.L (qty 2000), per-holding contributions over any
//   window must sum to the portfolio's return over it (R1-07's identity).
//
//   Monthly: August 2026 runs 2026-07-31 -> 2026-08-31, 31 days: 3.1480%.
//
//   Drawdowns on [100,110,99,110,120,90,96,121,118]:
//     episode 1 peak 110 -> trough 99  = -10%,  recovered at index 3
//     episode 2 peak 120 -> trough 90  = -25%,  recovered at index 7 (121)
//     episode 3 peak 121 -> 118        = -2.479%, ongoing
//
//   Capture: portfolio daily return exactly 2x the benchmark's on every day
//   -> up capture 200%, down capture 200%, beta 2.
//
//   Bridge: 100 paid in, worth 110 now -> movement +10, and the steps sum to 110.

import { run, saveBars } from '../server/db.js';
import * as series from '../server/engines/series.js';
import * as pf from '../server/engines/portfolio.js';
import { holdingReturns } from '../server/engines/holdings-data.js';

const DB = process.env.MERIDIAN_DB;
if (!DB) { console.error('Set MERIDIAN_DB to a throwaway path before running this.'); process.exit(1); }
if (DB.includes('meridian.db')) { console.error('Refusing to run against the real database.'); process.exit(1); }

let passed = 0, failed = 0;
function check(label, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok   ${label}`); }
  else { failed++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
}
const near = (a, b, tol = 1e-3) => a != null && Math.abs(a - b) <= tol;
const section = n => console.log(`\n${n}\n${'-'.repeat(n.length)}`);

const END = Date.parse('2026-09-29T00:00:00Z');
const DAYS = 400;
const dates = Array.from({ length: DAYS }, (_, i) => new Date(END - (DAYS - 1 - i) * 86400_000).toISOString().slice(0, 10));
const bar = (date, close) => ({ date, open: close, high: close, low: close, close, adjClose: close, volume: 1 });

run('DELETE FROM ohlcv'); run('DELETE FROM holdings'); run('DELETE FROM cash');
saveBars('GROW.L', dates.map((d, k) => bar(d, 100 * Math.pow(1.001, k))), { rejectFatal: false });
saveBars('FALL.L', dates.map((d, k) => bar(d, 100 * Math.pow(0.999, k))), { rejectFatal: false });
saveBars('^FTSE', dates.map((d, k) => ({ d, k })).filter(x => new Date(x.d).getUTCDay() !== 3).map(x => bar(x.d, 100 * Math.pow(1.001, x.k))), { rejectFatal: false });

const hold = (s, q) => run(`INSERT INTO holdings (symbol, name, qty, avg_price, currency, account, wrapper, added_at) VALUES (?,?,?,?,?,?,?,?)`, s, s, q, 1, 'GBP', 'Main', 'ISA', Date.now());
const lastOf = s => s === 'GROW.L' ? 100 * Math.pow(1.001, DAYS - 1) : 100 * Math.pow(0.999, DAYS - 1);
const prices = { 'GROW.L': { price: lastOf('GROW.L'), currency: 'GBP', changePct: 0 }, 'FALL.L': { price: lastOf('FALL.L'), currency: 'GBP', changePct: 0 } };

hold('GROW.L', 1000);

section('R1-06 period returns against closed-form answers');
const per = series.periodReturns(prices, { benchmark: '^FTSE' });
check('periods available', per.available, per.reason);
const P = k => per.data.rows.find(r => r.period === k);
check('1W = 1.001^7 - 1 = 0.7021%', near(P('1W').portfolio, (Math.pow(1.001, 7) - 1) * 100), String(P('1W').portfolio));
check('1M = 1.001^31 - 1 = 3.1480%', near(P('1M').portfolio, (Math.pow(1.001, 31) - 1) * 100), String(P('1M').portfolio));
check('YTD starts at the last close of the previous year (2025-12-31)', P('YTD').from === '2025-12-31', P('YTD').from);
check('YTD = 1.001^272 - 1', near(P('YTD').portfolio, (Math.pow(1.001, 272) - 1) * 100), String(P('YTD').portfolio));
check('1Y = 1.001^365 - 1', near(P('1Y').portfolio, (Math.pow(1.001, 365) - 1) * 100), String(P('1Y').portfolio));
check('bars used are reported (1M -> 31)', P('1M').bars === 31, String(P('1M').bars));
check('3Y is refused for that period only, with a reason', P('3Y').available === false && /starts/.test(P('3Y').reason), P('3Y').reason);
check('benchmark identical series gives 0pp excess on 1M', near(P('1M').excessPp, 0, 1e-6), String(P('1M').excessPp));
check('ITD is available and annualised', P('ITD').available && P('ITD').portfolioAnnualised != null);

section('R1-05 series joined on date, rebased to 100');
const s1 = series.performanceSeries(prices, { benchmark: '^FTSE', range: '1Y' });
check('series available', s1.available, s1.reason);
const pts = s1.data.points;
check('first point rebased to 100 for both', pts[0].portfolio === 100 && pts[0].benchmark === 100, JSON.stringify(pts[0]));
const withB = pts.filter(p => p.benchmark != null);
check('benchmark missing on Wednesdays is null, not shifted', pts.filter(p => new Date(p.date).getUTCDay() === 3).every(p => p.benchmark === null));
check('where both exist, portfolio == benchmark (aligned on date)', withB.every(p => near(p.portfolio, p.benchmark, 1e-3)));
check('portfolio == benchmark yields a flat relative line at 100', withB.every(p => near(p.relative, 100, 1e-3)));
check('missing benchmark days are counted', s1.data.benchmark.missingDays > 40, String(s1.data.benchmark.missingDays));
check('peak is the last point (monotonic series), distance 0', s1.data.peak.atPeak && s1.data.peak.distancePct === 0);
const s3 = series.performanceSeries(prices, { benchmark: '^FTSE', range: '3Y' });
check('a range the history cannot fill is refused', s3.available === false && /3Y/.test(s3.reason), s3.reason);
check('the refusal still lists which ranges are fillable', s3.data?.fillable?.['1Y'] === true && typeof s3.data.fillable['3Y'] === 'string');
const sx = series.performanceSeries(prices, { benchmark: 'NOPE' });
check('an unknown benchmark is refused with a reason', sx.available === false && /benchmark list/.test(sx.reason));

section('R1-05 nineteen bars are never labelled 1Y');
run('DELETE FROM holdings'); saveBars('SHORT.L', dates.slice(-40).map((d, k) => bar(d, 50 + k)), { rejectFatal: false });
hold('SHORT.L', 1);
const shortPrices = { 'SHORT.L': { price: 89, currency: 'GBP', changePct: 0 } };
check('1Y refused on 40 bars', series.performanceSeries(shortPrices, { range: '1Y' }).available === false);
check('1M still available on 40 bars', series.performanceSeries(shortPrices, { range: '1M' }).available === true);
const shortPer = series.periodReturns(shortPrices, {});
check('1Y period unavailable on 40 bars', shortPer.data.rows.find(r => r.period === '1Y').available === false);

section('R1-07 per-holding contributions sum to the portfolio return');
run('DELETE FROM holdings'); hold('GROW.L', 1000); hold('FALL.L', 2000);
const v = pf.valuePortfolio(prices);
const hr = holdingReturns(prices, v, { benchmark: '^FTSE' });
check('returns available', hr.available, hr.reason);
for (const w of ['1D', '1W', '1M', 'YTD', '1Y']) {
  const meta = hr.data.windows[w];
  const sum = hr.data.rows.reduce((a, r) => a + (r.windows[w].contributionPct ?? 0), 0);
  check(`${w}: contributions sum to the portfolio return (${meta.portfolioPct}%)`, near(sum, meta.portfolioPct, 1e-4), `${sum} vs ${meta.portfolioPct}`);
}
const g1m = hr.data.rows.find(r => r.symbol === 'GROW.L').windows['1M'];
check('GROW.L 1M return is 1.001^31 - 1', near(g1m.returnPct, (Math.pow(1.001, 31) - 1) * 100), String(g1m.returnPct));
check('benchmark-relative is holding minus benchmark (GROW.L == ^FTSE -> 0)', near(g1m.relativePp, 0, 1e-4), String(g1m.relativePp));
run('INSERT INTO holdings (symbol, name, qty, avg_price, currency, account, wrapper, added_at) VALUES (?,?,?,?,?,?,?,?)', 'NOBARS.L', 'NOBARS.L', 1, 1, 'GBP', 'Main', 'ISA', Date.now());
const hr2 = holdingReturns({ ...prices, 'NOBARS.L': { price: 5, currency: 'GBP', changePct: 0 } }, pf.valuePortfolio({ ...prices, 'NOBARS.L': { price: 5, currency: 'GBP', changePct: 0 } }), {});
const nb = hr2.data.rows.find(r => r.symbol === 'NOBARS.L');
check('a holding without enough bars appears with nulls and a reason', nb && nb.windows['1M'].returnPct === null && /30 stored/.test(nb.reason), JSON.stringify(nb?.reason));
check('and is named in coverage.missing', hr2.coverage.missing.some(m => m.symbol === 'NOBARS.L'));
run("DELETE FROM holdings WHERE symbol = 'NOBARS.L'");

section('B-13 monthly and calendar-year returns');
run('DELETE FROM holdings'); hold('GROW.L', 1000);
const cal = series.calendarReturns(prices, { benchmark: '^FTSE', today: new Date('2026-09-30T12:00:00Z') });
check('calendar returns available', cal.available, cal.reason);
const aug = cal.data.months.find(m => m.month === '2026-08');
check('August 2026 = 1.001^31 - 1', near(aug.pct, (Math.pow(1.001, 31) - 1) * 100), String(aug.pct));
check('current month flagged partial', cal.data.months.find(m => m.month === '2026-09').partial === true);
check('first month flagged partial (history starts mid-month)', cal.data.months[0].partial === true);
check('2026 flagged partial (year to date)', cal.data.years.find(y => y.year === '2026').partial === true);
check('hit rate over complete months is 100% on a rising series', cal.data.hitRate === 100, String(cal.data.hitRate));

section('B-14 drawdown episodes on a known shape');
const shape = [100, 110, 99, 110, 120, 90, 96, 121, 118].map((value, i) => ({ date: dates[i], value }));
const eps = series.drawdownEpisodes(shape, { minDepth: 0 });
check('three episodes', eps.length === 3, String(eps.length));
check('episode 1 is -10% and recovered', near(eps[0].depthPct, -10) && !eps[0].ongoing, JSON.stringify(eps[0].depthPct));
check('episode 2 is -25% and recovered at 121', near(eps[1].depthPct, -25) && eps[1].recoveryDate === dates[7]);
check('episode 3 is -2.479% and ongoing', near(eps[2].depthPct, -2.479, 1e-3) && eps[2].ongoing === true, String(eps[2].depthPct));
const eps2 = series.drawdownEpisodes(shape, { minDepth: 0.05 });
check('a 5% floor drops the shallow ongoing episode', eps2.length === 2);

section('B-17 capture ratios on a portfolio that moves exactly 2x the benchmark');
run('DELETE FROM ohlcv WHERE symbol = ?', 'CAPB.X');
const bClose = [100], pVal = [100];
for (let i = 1; i < 200; i++) { const r = i % 2 ? 0.01 : -0.008; bClose.push(bClose[i - 1] * (1 + r)); pVal.push(pVal[i - 1] * (1 + 2 * r)); }
const capDates = dates.slice(-200);
saveBars('^GSPC', capDates.map((d, i) => bar(d, bClose[i])), { rejectFatal: false });
const cap = series.captureStats(prices, { benchmark: '^GSPC', points: capDates.map((d, i) => ({ date: d, value: pVal[i] })) });
check('capture available on 199 joined days', cap.available, cap.reason);
check('up capture 200%', near(cap.data.upCapture, 200, 0.1), String(cap.data.upCapture));
check('down capture 200%', near(cap.data.downCapture, 200, 0.1), String(cap.data.downCapture));
check('beta 2', near(cap.data.beta, 2, 1e-3), String(cap.data.beta));
const capShort = series.captureStats(prices, { benchmark: '^GSPC', points: capDates.slice(-50).map((d, i) => ({ date: d, value: pVal[150 + i] })) });
check('under 120 joined days is refused', capShort.available === false && /120/.test(capShort.reason));

section('B-19 contribution over time: parts sum to each month exactly');
run('DELETE FROM holdings'); hold('GROW.L', 1000); hold('FALL.L', 2000);
const cot = series.contributionOverTime(pf.reconstructHistoryByHolding(prices, 800), { months: 12 });
check('available', cot.available, cot.reason);
check('every month reconciles (flag)', cot.data.reconciles === true);
const augC = cot.data.months.find(m => m.month === '2026-08');
check('August parts sum to August return', near(augC.parts.reduce((a, p) => a + p.contributionPct, 0), augC.returnPct, 1e-4), `${augC.parts.reduce((a, p) => a + p.contributionPct, 0)} vs ${augC.returnPct}`);
{
  // Prior weight of GROW.L at 2026-07-31: 1000 x 100 x 1.001^k over the book,
  // with k the day index of that date; its August return is 1.001^31 - 1.
  const k = dates.indexOf('2026-07-31');
  const g0 = 1000 * 100 * Math.pow(1.001, k), f0 = 2000 * 100 * Math.pow(0.999, k);
  const expected = g0 / (g0 + f0) * (Math.pow(1.001, 31) - 1) * 100;
  check(`GROW.L August contribution = prior weight x (1.001^31 - 1) = ${expected.toFixed(4)}pp`,
    near(augC.parts.find(p => p.symbol === 'GROW.L').contributionPct, expected, 1e-3), String(augC.parts.find(p => p.symbol === 'GROW.L').contributionPct));
}
check('the latest month is marked partial', cot.data.months[cot.data.months.length - 1].partial === true);

section('Custom series window (heatmap click)');
run('DELETE FROM holdings'); hold('GROW.L', 1000);
const cw = series.performanceSeries(prices, { range: 'CUSTOM', from: '2026-07-31', to: '2026-08-31', benchmark: '^FTSE' });
check('custom window available', cw.available, cw.reason);
check('custom window spans the month', cw.data.from === '2026-07-31' && cw.data.to === '2026-08-31', `${cw.data.from} ${cw.data.to}`);
check('custom window before history is refused', series.performanceSeries(prices, { range: 'CUSTOM', from: '2020-01-01' }).available === false);

section('B-18 value bridge sums exactly');
const br = series.valueBridge({ currentValue: 110, flows: [{ date: '2025-09-29', amount: 100, kind: 'deposit' }] });
check('bridge available', br.available);
check('movement is +10', br.data.movement === 10, String(br.data.movement));
check('steps reconcile to the current value', br.data.reconciles === true);
check('no ledger is an explained refusal', series.valueBridge({ currentValue: 110, flows: [] }).available === false);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
