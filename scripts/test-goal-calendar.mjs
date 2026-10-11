// Meridian — calendar refresh scheduling (R1-03) and the user goal (R1-04).
//
// Run:
//   MERIDIAN_DB=/tmp/mo/goalcal.db node scripts/test-goal-calendar.mjs
//
// Hand-worked answers:
//
//   R1-03  Cache: FRESH.L fetched an hour ago, STALE.L two days ago, NEW.L
//          never. With a stubbed fetcher that fails for BAD.L, refreshing
//          [FRESH.L, STALE.L, NEW.L, BAD.L] must fetch exactly STALE.L and
//          NEW.L, skip FRESH.L (daily TTL), and put BAD.L in `unresolved`
//          without throwing.
//
//   R1-04  No goal saved -> available:false, reason 'No goal set'.
//          Zero-volatility history: every daily return is exactly 0.0004.
//          The simulation steps 21 trading days a month and adds the monthly
//          contribution at each month end, so after 12 months from £1,000
//          with £100 a month:
//              g   = 1.0004^21 = 1.0084347...
//              V12 = 1000 g^12 + 100 (g^12 - 1) / (g - 1)
//          and with no volatility every path lands on V12 exactly: the median
//          is V12, a target of V12 - 1 is reached with 100% probability and
//          V12 + 1 with 0%. Fewer than 252 returns is refused.
//          The goal horizon here is 12 months exactly (target date set so
//          years = 1 when evaluated at the same `now`).

import { run, setSetting, getSetting } from '../server/db.js';
import { refreshCorporateDates, buildCalendar } from '../server/engines/calendar.js';
import * as goal from '../server/engines/goal.js';

const DB = process.env.MERIDIAN_DB;
if (!DB) { console.error('Set MERIDIAN_DB to a throwaway path before running this.'); process.exit(1); }
if (DB.includes('meridian.db')) { console.error('Refusing to run against the real database.'); process.exit(1); }

let passed = 0, failed = 0;
function check(label, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok   ${label}`); }
  else { failed++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
}
const section = n => console.log(`\n${n}\n${'-'.repeat(n.length)}`);
const HOUR = 3600_000, DAY = 86400_000;

section('R1-03 the scheduled refresh: stale refreshed, fresh skipped, failure contained');
const now = Date.now();
setSetting('calendar_cache', {
  'FRESH.L': { name: 'Fresh', dates: { nextEarnings: null, exDividendDate: null, dividendDate: null }, fetchedAt: now - HOUR },
  'STALE.L': { name: 'Stale', dates: null, fetchedAt: now - 2 * DAY },
});
const asked = [];
const stub = async sym => {
  asked.push(sym);
  if (sym === 'BAD.L') throw new Error('network unreachable');
  return { name: `${sym} name`, dates: { nextEarnings: new Date(now + 5 * DAY).toISOString().slice(0, 10), exDividendDate: null, dividendDate: null } };
};
let threw = false, res = null;
try { res = await refreshCorporateDates(['FRESH.L', 'STALE.L', 'NEW.L', 'BAD.L'], { fetchSummary: stub }); }
catch { threw = true; }
check('does not throw when one symbol fails', !threw);
check('fetched the stale and never-seen symbols only', JSON.stringify(asked.sort()) === JSON.stringify(['BAD.L', 'NEW.L', 'STALE.L']), JSON.stringify(asked));
check('skipped the fresh one (daily TTL)', !asked.includes('FRESH.L'));
check('two refreshed', res?.fetched === 2, String(res?.fetched));
check('the failing symbol is in unresolved with a reason', res?.unresolved?.length === 1 && res.unresolved[0].symbol === 'BAD.L' && /network/.test(res.unresolved[0].reason), JSON.stringify(res?.unresolved));
const cache = getSetting('calendar_cache');
check('refreshed entries were written to the cache', cache['NEW.L']?.fetchedAt >= now && cache['STALE.L']?.fetchedAt >= now);
check('a refresh timestamp is recorded for provenance', getSetting('calendar_last_refresh')?.fetched === 2);
run(`INSERT INTO holdings (symbol, name, qty, avg_price, currency, account, wrapper, added_at) VALUES ('NEW.L','New',1,1,'GBP','Main','ISA',?)`, now);
run(`INSERT INTO holdings (symbol, name, qty, avg_price, currency, account, wrapper, added_at) VALUES ('BAD.L','Bad',1,1,'GBP','Main','ISA',?)`, now);
const cal = buildCalendar({ days: 30 });
check('the refreshed symbol now has its event on the calendar', cal.events.some(e => e.symbol === 'NEW.L' && e.type === 'earnings'));
check('the failed one is listed as unresolved, never given a date', cal.unresolved.some(u => u.symbol === 'BAD.L') && !cal.events.some(e => e.symbol === 'BAD.L'));

section('R1-04 the goal: no defaults, bootstrapped from history, refusals');
goal.clearGoal();
const none = goal.evaluateGoal(goal.loadGoal(), { returns: new Array(300).fill(0.0004), initial: 1000 });
check("no goal set -> available:false, reason 'No goal set'", none.available === false && none.reason === 'No goal set', none.reason);
const bad = goal.saveGoal({ target: 5000 });
check('saving without a date or monthly amount is refused, nothing defaulted', bad.ok === false && bad.errors.length === 2, JSON.stringify(bad.errors));
check('nothing was persisted by the refused save', goal.loadGoal() === null);

const t0 = Date.parse('2026-01-01T00:00:00Z');
const g = 1.0004 ** 21;
const V12 = 1000 * g ** 12 + 100 * (g ** 12 - 1) / (g - 1);
const target = +(V12).toFixed(2);
const saved = goal.saveGoal({ target: target - 1, targetDate: new Date(t0 + 365.25 * DAY).toISOString().slice(0, 10), monthly: 100 }, { now: t0 });
check('a complete goal saves', saved.ok, JSON.stringify(saved.errors));
const flat = new Array(300).fill(0.0004);
const ev = goal.evaluateGoal(goal.loadGoal(), { returns: flat, initial: 1000, now: t0, paths: 200 });
check('evaluates', ev.available, ev.reason);
check(`zero volatility: median equals the closed form (${V12.toFixed(2)})`, Math.abs(ev.data.median - V12) <= 1, `${ev.data.median}`);
check('target just below the certain outcome -> 100%', ev.data.probabilityPct === 100, String(ev.data.probabilityPct));
const ev2 = goal.evaluateGoal({ ...goal.loadGoal(), target: target + 1 }, { returns: flat, initial: 1000, now: t0, paths: 200 });
check('target just above the certain outcome -> 0%', ev2.data.probabilityPct === 0, String(ev2.data.probabilityPct));
// Required monthly for 50%: solve 1000 g^12 + c (g^12-1)/(g-1) = target+1 for c.
const cReq = ((target + 1) - 1000 * g ** 12) / ((g ** 12 - 1) / (g - 1));
check(`required monthly for a 50% chance is about £${cReq.toFixed(2)} (bisection, 14 steps)`, Math.abs(ev2.data.requiredMonthlyForFiftyPct - cReq) <= 2, `${ev2.data.requiredMonthlyForFiftyPct}`);
check('the method statement says it is not a forecast', /not a forecast/.test(ev.data.method));
const thin = goal.evaluateGoal(goal.loadGoal(), { returns: new Array(100).fill(0.0004), initial: 1000, now: t0 });
check('fewer than 252 returns is refused', thin.available === false && /252/.test(thin.reason), thin.reason);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
