// Meridian — panel contract test for every new route (R1-10, R1-11, B-03).
//
// Run (seed the three worlds first with scripts/seed-world.mjs):
//   MERIDIAN_DB=/tmp/mo/populated.test.db node scripts/test-contract.mjs
//
// For each of the populated, thin and empty seeded worlds it:
//   1. calls every new route handler in a child process against that world
//      and walks the whole response for NaN, Infinity and undefined — which
//      JSON would otherwise silently turn into null or drop;
//   2. checks the contract keys { available, reason, asOf, source, data } and
//      that a refusal carries a reason;
//   3. boots the real HTTP server on a spare port and checks no route answers
//      500;
// and, on the populated world, forces one /overview block to throw and checks
// the other blocks are still there.

import { spawn, execFileSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB = process.env.MERIDIAN_DB;
if (!DB) { console.error('Set MERIDIAN_DB to a throwaway path before running this.'); process.exit(1); }
if (DB.includes('meridian.db')) { console.error('Refusing to run against the real database.'); process.exit(1); }

const WORLDS = {
  populated: { db: '/tmp/mo/populated.test.db', prices: '/tmp/mo/prices-populated.json' },
  thin: { db: '/tmp/mo/thin.test.db', prices: '/tmp/mo/prices-thin.json' },
  empty: { db: '/tmp/mo/empty.test.db', prices: '/tmp/mo/prices-empty.json' },
};

// ─── child mode: run handlers in-process against one world ────
if (process.argv[2] === '--child') {
  const world = JSON.parse(process.argv[3]);
  const { overnightRoutes } = await import('../server/routes-overnight.js');
  const { buildOverview } = await import('../server/engines/overview.js');
  const pf = await import('../server/engines/portfolio.js');
  const prices = JSON.parse(readFileSync(world.prices, 'utf8'));
  const state = { prices, fired: [], lastFetch: Date.now() };
  const versions = { prices: 1, book: 0, bars: 0, news: 0, calendar: 0, flows: 0, goal: 0, watch: 0, briefing: 0 };
  const routes = overnightRoutes({ state, versions, dataVersion: () => Object.values(versions).join('.'), refreshPrices: async () => {} });
  const bad = [];
  const walk = (x, p) => {
    if (x === undefined) bad.push(`${p}: undefined`);
    else if (typeof x === 'number' && !Number.isFinite(x)) bad.push(`${p}: ${x}`);
    else if (Array.isArray(x)) x.forEach((v, i) => walk(v, `${p}[${i}]`));
    else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, `${p}.${k}`);
  };
  const results = {};
  for (const [key, fn] of Object.entries(routes)) {
    if (!key.startsWith('GET ')) continue;
    let out, err = null;
    try { out = await fn({}, {}); } catch (e) { err = e.message; }
    const before = bad.length;
    if (!err) walk(out, key);
    results[key] = {
      err,
      available: out?.available,
      hasReason: out?.available === false ? typeof out.reason === 'string' && out.reason.length > 3 : true,
      contract: key === 'GET /data-version' || key === 'GET /overview' ? true
        : ['available', 'reason', 'asOf', 'source', 'data'].every(k => out && k in out),
      badValues: bad.slice(before, before + 5),
    };
  }
  // Forced block failure.
  const forced = buildOverview({ prices, valued: pf.valuePortfolio(prices), lastFetch: Date.now(), cacheKey: 'x' }, { failBlock: 'calendar' });
  const others = Object.entries(forced.blocks).filter(([k]) => k !== 'calendar');
  process.stdout.write(JSON.stringify({ results, forced: {
    calendar: forced.blocks.calendar, failed: forced.failed,
    othersIntact: others.every(([, b]) => b && 'available' in b),
    othersAvailable: others.filter(([, b]) => b.available).map(([k]) => k),
  } }));
  process.exit(0);
}

// ─── parent ───────────────────────────────────────────────────
let passed = 0, failed = 0;
function check(label, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok   ${label}`); }
  else { failed++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
}
const section = n => console.log(`\n${n}\n${'-'.repeat(n.length)}`);

for (const [name, w] of Object.entries(WORLDS)) {
  if (!existsSync(w.db)) { check(`${name} world exists (seed it first)`, false, w.db); continue; }
  section(`${name} world: every route in-process`);
  const out = execFileSync(process.execPath, [fileURLToPath(import.meta.url), '--child', JSON.stringify(w)], {
    env: { ...process.env, MERIDIAN_DB: w.db }, cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024,
  });
  const { results, forced } = JSON.parse(out);
  for (const [route, r] of Object.entries(results)) {
    check(`${route} does not throw`, !r.err, r.err);
    check(`${route} carries the contract keys`, r.contract);
    check(`${route} refusal has a reason`, r.hasReason);
    check(`${route} has no NaN / Infinity / undefined`, r.badValues.length === 0, r.badValues.join('; '));
  }
  if (name === 'populated') {
    check('populated: /overview blocks all available', results['GET /overview'].available === true);
    check('forced failure: the calendar block is a refusal naming the failure', forced.calendar.available === false && /failed/.test(forced.calendar.reason));
    check('forced failure: it is listed in `failed`', forced.failed.includes('calendar'));
    check('forced failure: every other block is still present', forced.othersIntact);
    check('forced failure: other blocks still available (hero, top, day)', ['hero', 'top', 'day'].every(k => forced.othersAvailable.includes(k)), forced.othersAvailable.join(','));
  }
  if (name === 'empty') {
    const refusals = Object.entries(results).filter(([, r]) => r.available === false).length;
    check('empty: most panels refuse rather than invent', refusals >= 20, String(refusals));
  }

  section(`${name} world: over HTTP, nothing answers 500`);
  const port = { populated: 3191, thin: 3192, empty: 3193 }[name];
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT, stdio: 'ignore',
    env: { ...process.env, MERIDIAN_DB: w.db, MERIDIAN_PORT: String(port), MERIDIAN_PRICE_FIXTURE: w.prices, MERIDIAN_OFFLINE: '1' },
  });
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    await new Promise(r => setTimeout(r, 250));
    try { up = (await fetch(`http://localhost:${port}/data-version`)).ok; } catch { /* booting */ }
  }
  check(`${name}: server booted on ${port}`, up);
  if (up) {
    const codes = [];
    for (const route of Object.keys(results)) {
      const p = route.replace('GET ', '');
      const res = await fetch(`http://localhost:${port}${p}`);
      codes.push([p, res.status, res.headers.get('x-meridian-data-version')]);
    }
    const fiveHundreds = codes.filter(c => c[1] >= 500);
    check(`${name}: no route returns 500 (${codes.length} routes)`, fiveHundreds.length === 0, fiveHundreds.map(c => c[0]).join(', '));
    check(`${name}: every response carries X-Meridian-Data-Version`, codes.every(c => c[2]));
    // A write bumps the right part.
    const before = await (await fetch(`http://localhost:${port}/data-version`)).json();
    // A no-op write (no cash row has id -1) so the seeded world is not changed.
    await fetch(`http://localhost:${port}/cash`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: -1 }) });
    const after = await (await fetch(`http://localhost:${port}/data-version`)).json();
    check(`${name}: a holdings/cash write bumps only the book part`, after.versions.book === before.versions.book + 1 && after.versions.goal === before.versions.goal && after.versions.news === before.versions.news);
  }
  child.kill();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
