// Fill a THROWAWAY database with a synthetic portfolio world for the Portfolio
// pages: holdings, cash, a cash-flow ledger, transactions with fees, targets,
// a goal, fund compositions (one only partly disclosed), snapshots, news,
// calendar dates, a watchlist and alerts — plus a price-fixture JSON the API
// reads instead of Yahoo when started with MERIDIAN_PRICE_FIXTURE.
//
//   MERIDIAN_DB=/tmp/mo/pop.test.db node scripts/seed-world.mjs populated /tmp/mo/prices-pop.json
//   MERIDIAN_DB=/tmp/mo/thin.test.db node scripts/seed-world.mjs thin /tmp/mo/prices-thin.json
//   MERIDIAN_DB=/tmp/mo/empty.test.db node scripts/seed-world.mjs empty /tmp/mo/prices-empty.json
//
// Everything here is fabricated, deterministic (seeded PRNG) and uses test
// tickers (T*.L, TCO) and "[Test fixture]" headlines so a screenshot of it can
// never be mistaken for real holdings. Like seed-dev-db.js it refuses any
// database path that does not end in .test.db.

import { writeFileSync } from 'fs';

const target = process.env.MERIDIAN_DB ?? '';
if (!target.endsWith('.test.db')) {
  console.error('Refusing to run: set MERIDIAN_DB to a path ending in .test.db');
  process.exit(1);
}
const mode = process.argv[2] ?? 'populated';
const fixturePath = process.argv[3] ?? null;
if (!['populated', 'thin', 'empty'].includes(mode)) { console.error('mode must be populated | thin | empty'); process.exit(1); }

const { saveBars, run, db, setSetting } = await import('../server/db.js');
const { SYMBOLS } = await import('../server/config.js');
await import('../server/engines/performance.js');       // cash_flows table
const { saveComposition } = await import('../server/engines/rebuild/exposure.js');
const memory = await import('../server/engines/memory.js');
await import('../server/engines/signals.js');            // alert lifecycle columns

function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = r => { const u = Math.max(r(), 1e-9), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

const DAY = 86400_000;
const NOW = Date.now();
const iso = ms => new Date(ms).toISOString().slice(0, 10);
const CAL_DAYS = 1360;
const dates = [];
for (let i = CAL_DAYS; i > 0; i--) {
  const d = new Date(NOW - i * DAY);
  if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
  dates.push(iso(d.getTime()));
}
const marketRand = rng(20240101);
const market = dates.map(() => gauss(marketRand) * 0.0085);

function makeBars(symbol, seed, { start, beta = 1, idio = 0.007, drift = 0.0002, fromIndex = 0 } = {}) {
  const r = rng(seed);
  let price = start;
  const bars = [];
  for (let i = fromIndex; i < dates.length; i++) {
    const shock = drift + beta * market[i] + gauss(r) * idio;
    price = Math.max(price * (1 + shock), 0.01);
    bars.push({
      date: dates[i], open: +(price * (1 + gauss(r) * 0.002)).toFixed(4),
      high: +(price * (1 + Math.abs(gauss(r)) * 0.004)).toFixed(4), low: +(price * (1 - Math.abs(gauss(r)) * 0.004)).toFixed(4),
      close: +price.toFixed(4), adjClose: +price.toFixed(4), volume: Math.round(1e6 + r() * 9e6),
    });
  }
  saveBars(symbol, bars, { rejectFatal: false });
  return bars;
}

const lastClose = {};
const store = (sym, bars) => { lastClose[sym] = bars[bars.length - 1].close; return bars; };

// Benchmarks, FX and the rest of the configured universe.
Object.keys(SYMBOLS).forEach((s, idx) => {
  const start = s === '^FTSE' ? 7200 : s === '^GSPC' ? 4300 : s.startsWith('^') ? 3000 + idx * 50
    : s === 'GBPUSD=X' ? 1.26 : s === 'EURUSD=X' ? 1.08 : s === 'USDJPY=X' ? 145 : s.includes('=X') ? 1.1
    : s.endsWith('.L') ? 30 + (idx % 9) * 12 : 60 + idx * 3;
  const fx = s.includes('=X');
  store(s, makeBars(s, 1000 + idx * 7919, { start, beta: fx ? 0.05 : 0.6 + (idx % 5) * 0.15, idio: fx ? 0.003 : 0.006, drift: fx ? 0 : 0.00022 }));
});

// ─── The book ─────────────────────────────────────────────────
const BOOK = [
  { symbol: 'TWLD.L', name: 'Test World Equity Tracker', qty: 900, avg: 58, sector: 'Broad', geography: 'Global', cls: 'ETF', wrapper: 'ISA', account: 'Main ISA', target: 30, start: 52, beta: 1.0, idio: 0.004 },
  { symbol: 'TUSA.L', name: 'Test US Large Cap Tracker', qty: 320, avg: 64, sector: 'Broad', geography: 'US', cls: 'ETF', wrapper: 'ISA', account: 'Main ISA', target: 20, start: 60, beta: 1.1, idio: 0.004 },
  { symbol: 'TUKA.L', name: 'Test UK All-Share Tracker', qty: 800, avg: 4.1, sector: 'Broad', geography: 'UK', cls: 'ETF', wrapper: 'SIPP', account: 'Pension', target: 10, start: 4.0, beta: 0.8, idio: 0.004 },
  { symbol: 'TFTS.L', name: 'Test FTSE 100 Tracker', qty: 1500, avg: 7.4, sector: 'Broad', geography: 'United Kingdom', cls: 'ETF', wrapper: 'SIPP', account: 'Pension', target: null, start: 7.2, beta: 0.8, idio: 0.003 },
  { symbol: 'TSEM.L', name: 'Test Semiconductor ETF', qty: 400, avg: 21, sector: 'Tech', geography: 'Global', cls: 'ETF', wrapper: 'ISA', account: 'Main ISA', target: 8, start: 18, beta: 1.6, idio: 0.012 },
  { symbol: 'TGLD.L', name: 'Test Physical Gold ETC', qty: 250, avg: 31, sector: 'Gold', geography: 'Global', cls: 'Commodity', wrapper: 'GIA', account: 'Dealing', target: 7, start: 30, beta: 0.1, idio: 0.008 },
  { symbol: 'TEMX.L', name: 'Test Emerging Markets ETF', qty: 600, avg: 28, sector: 'EM', geography: 'EM', cls: 'ETF', wrapper: 'ISA', account: 'Main ISA', target: 5, start: 27, beta: 0.9, idio: 0.007 },
  { symbol: 'TJPN.L', name: 'Test Japan Equity ETF', qty: 500, avg: 5.2, sector: null, geography: 'Japan', cls: 'ETF', wrapper: 'ISA', account: 'Main ISA', target: 5, start: 5.0, beta: 0.7, idio: 0.007 },
  { symbol: 'TCO', name: 'Test Company Inc', qty: 40, avg: 150, sector: 'Tech', geography: 'US', cls: 'Equity', wrapper: 'GIA', account: 'Dealing', target: null, start: 140, beta: 1.2, idio: 0.014, currency: 'USD' },
  { symbol: 'TUNP.L', name: 'Test Unpriced Fund', qty: 100, avg: 10, sector: 'Other', geography: 'Global', cls: 'Fund', wrapper: 'ISA', account: 'Main ISA', target: null, noBars: true },
];

const book = mode === 'populated' ? BOOK : mode === 'thin' ? BOOK.slice(0, 1) : [];
book.forEach((h, i) => {
  if (h.noBars) return;
  store(h.symbol, makeBars(h.symbol, 5000 + i * 131, { start: h.start, beta: h.beta, idio: h.idio, drift: 0.00025 }));
});
for (const h of book) {
  run(`INSERT INTO holdings (symbol, name, qty, avg_price, currency, sector, geography, asset_class, account, wrapper, target_pct, thesis, added_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    h.symbol, h.name, h.qty, h.avg, h.currency ?? 'GBP', h.sector, h.geography, h.cls, h.account, h.wrapper, h.target,
    h.symbol === 'TWLD.L' ? '[Test fixture] Core global holding.' : null, NOW - 400 * DAY);
}

if (mode === 'populated') {
  // Watchlist symbols with bars, and one with none.
  store('TWAT.L', makeBars('TWAT.L', 9001, { start: 12, beta: 1, idio: 0.009 }));
  store('TCO2', makeBars('TCO2', 9002, { start: 80, beta: 1.3, idio: 0.012 }));
  run('INSERT INTO watchlist (symbol, tier, note, target, added_at) VALUES (?,?,?,?,?)', 'TCO2', 1, '[Test fixture] watching for a pullback', 70, NOW);
  run('INSERT INTO watchlist (symbol, tier, note, target, added_at) VALUES (?,?,?,?,?)', 'TWAT.L', 2, null, null, NOW);
  run('INSERT INTO watchlist (symbol, tier, note, target, added_at) VALUES (?,?,?,?,?)', 'TWNP.L', 3, '[Test fixture] no price feed', null, NOW);

  // Cash, one balance stale by edit age and one in dollars.
  run('INSERT INTO cash (account, wrapper, currency, amount, updated_at) VALUES (?,?,?,?,?)', 'Main ISA', 'ISA', 'GBP', 4200, NOW - 3 * DAY);
  run('INSERT INTO cash (account, wrapper, currency, amount, updated_at) VALUES (?,?,?,?,?)', 'Dealing', 'GIA', 'USD', 1500, NOW - 45 * DAY);

  // Ledger: money paid in over the years, one withdrawal.
  const flow = (daysAgo, amount, kind, note) => run(`INSERT INTO cash_flows (date, amount, currency, account, kind, note, created_at) VALUES (?,?,?,?,?,?,?)`,
    iso(NOW - daysAgo * DAY), amount, 'GBP', 'Main ISA', kind, note, NOW);
  flow(1300, 60000, 'deposit', '[Test fixture] opening transfer');
  flow(950, 20000, 'deposit', null);
  flow(600, 20000, 'deposit', null);
  flow(365, -5000, 'withdrawal', null);
  flow(240, 20000, 'deposit', null);

  // Transactions with fees.
  const tx = (sym, daysAgo, side, qty, price, fees, wrapper) => run(`INSERT INTO transactions (symbol, date, side, qty, price, fees, currency, account, wrapper, note) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    sym, iso(NOW - daysAgo * DAY), side, qty, price, fees, 'GBP', 'Main ISA', wrapper, null);
  tx('TWLD.L', 1290, 'buy', 600, 50, 11.95, 'ISA'); tx('TWLD.L', 590, 'buy', 300, 60, 11.95, 'ISA');
  tx('TSEM.L', 900, 'buy', 400, 21, 11.95, 'ISA'); tx('TCO', 300, 'buy', 40, 150, 5.95, 'GIA');
  tx('TGLD.L', 700, 'buy', 250, 31, 11.95, 'GIA'); tx('TUSA.L', 800, 'buy', 320, 64, 11.95, 'ISA');

  // Compositions. TWLD.L discloses only its top ten (22% of the fund); TGLD.L
  // stores a composition that publishes no holdings; TJPN.L has none at all.
  const u = (symbol, name, weight) => ({ symbol, name, weight });
  saveComposition({ symbol: 'TWLD.L', name: 'Test World Equity Tracker', category: 'Global Large-Cap Equity', expenseRatio: 0.2, asOf: iso(NOW - 12 * DAY),
    holdings: [u('TSTA', 'Test Alpha Corp', 0.045), u('TSTB', 'Test Beta Systems', 0.04), u('TSTC', 'Test Gamma Chips', 0.035), u('TSTD', 'Test Delta Retail', 0.025), u('TSTE', 'Test Epsilon Search', 0.02),
      u('TSTF.L', 'Test Foxtrot Energy', 0.012), u('TSTG.T', 'Test Golf Motors', 0.012), u('TSTH.PA', 'Test Hotel Luxury', 0.011), u('TSTI', 'Test India Social', 0.011), u('TSTJ.AS', 'Test Juliet Litho', 0.009)],
    sectors: { technology: 0.26, financial_services: 0.15, healthcare: 0.11, consumer_cyclical: 0.11, industrials: 0.11, communication_services: 0.08, consumer_defensive: 0.06, energy: 0.04, basic_materials: 0.04, utilities: 0.02, realestate: 0.02 } });
  saveComposition({ symbol: 'TUSA.L', name: 'Test US Large Cap Tracker', category: 'US Large-Cap Equity', expenseRatio: 0.07, asOf: iso(NOW - 12 * DAY),
    holdings: [u('TSTA', 'Test Alpha Corp', 0.07), u('TSTB', 'Test Beta Systems', 0.065), u('TSTC', 'Test Gamma Chips', 0.06), u('TSTD', 'Test Delta Retail', 0.04), u('TSTE', 'Test Epsilon Search', 0.035), u('TSTI', 'Test India Social', 0.025), u('TSTK', 'Test Kilo Bank', 0.015), u('TSTL', 'Test Lima Health', 0.012)],
    sectors: { technology: 0.33, financial_services: 0.13, healthcare: 0.11, consumer_cyclical: 0.1, communication_services: 0.09, industrials: 0.08, consumer_defensive: 0.06, energy: 0.04, utilities: 0.03, realestate: 0.02, basic_materials: 0.01 } });
  saveComposition({ symbol: 'TSEM.L', name: 'Test Semiconductor ETF', category: 'Technology Sector Equity', expenseRatio: 0.35, asOf: iso(NOW - 40 * DAY),
    holdings: [u('TSTC', 'Test Gamma Chips', 0.09), u('TSTM.TW', 'Test Mike Foundry', 0.085), u('TSTN', 'Test November Logic', 0.08), u('TSTJ.AS', 'Test Juliet Litho', 0.07), u('TSTO', 'Test Oscar Memory', 0.05), u('TSTP.KS', 'Test Papa Semis', 0.045)],
    sectors: { technology: 1.0 } });
  saveComposition({ symbol: 'TUKA.L', name: 'Test UK All-Share Tracker', category: 'UK Equity', expenseRatio: 0.2, asOf: iso(NOW - 12 * DAY),
    holdings: [u('TSTF.L', 'Test Foxtrot Energy', 0.08), u('TSTQ.L', 'Test Quebec Pharma', 0.07), u('TSTR.L', 'Test Romeo Bank', 0.06), u('TSTS.L', 'Test Sierra Mining', 0.035), u('TSTT.L', 'Test Tango Staples', 0.03)],
    sectors: { financial_services: 0.22, consumer_defensive: 0.15, energy: 0.12, healthcare: 0.12, industrials: 0.12, basic_materials: 0.08, consumer_cyclical: 0.08, utilities: 0.05, communication_services: 0.03, technology: 0.02, realestate: 0.01 } });
  saveComposition({ symbol: 'TFTS.L', name: 'Test FTSE 100 Tracker', category: 'UK Large-Cap Equity', expenseRatio: 0.07, asOf: iso(NOW - 12 * DAY),
    holdings: [u('TSTF.L', 'Test Foxtrot Energy', 0.1), u('TSTQ.L', 'Test Quebec Pharma', 0.09), u('TSTR.L', 'Test Romeo Bank', 0.075), u('TSTS.L', 'Test Sierra Mining', 0.045), u('TSTT.L', 'Test Tango Staples', 0.04), u('TSTU.L', 'Test Uniform Tobacco', 0.035)],
    sectors: { financial_services: 0.2, consumer_defensive: 0.17, energy: 0.13, healthcare: 0.13, industrials: 0.11, basic_materials: 0.09, consumer_cyclical: 0.08, utilities: 0.05, communication_services: 0.03, technology: 0.01 } });
  saveComposition({ symbol: 'TEMX.L', name: 'Test Emerging Markets ETF', category: 'Global Emerging Markets Equity', expenseRatio: 0.18, asOf: iso(NOW - 12 * DAY),
    holdings: [u('TSTM.TW', 'Test Mike Foundry', 0.09), u('TSTP.KS', 'Test Papa Semis', 0.04), u('TSTV.NS', 'Test Victor Industries', 0.02), u('TSTW.SA', 'Test Whiskey Oil', 0.015)],
    sectors: { technology: 0.27, financial_services: 0.22, consumer_cyclical: 0.12, communication_services: 0.09, basic_materials: 0.08, energy: 0.06, industrials: 0.07, consumer_defensive: 0.05, healthcare: 0.04 } });
  saveComposition({ symbol: 'TGLD.L', name: 'Test Physical Gold ETC', category: 'Commodities Focused', expenseRatio: 0.12, asOf: iso(NOW - 12 * DAY), holdings: [], sectors: {} });

  // Snapshots, with gaps where "the app was off".
  const invested = book.filter(h => !h.noBars).reduce((a, h) => a + h.qty * (lastClose[h.symbol] ?? 0) * (h.currency === 'USD' ? 0.79 : 1), 0);
  const total = daysAgo => +(invested * (1 - daysAgo * 0.0006) + 5400).toFixed(2);
  for (let k = 40; k >= 1; k--) {
    const d = new Date(NOW - k * DAY);
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6 || k % 7 === 3) continue;
    const t = total(k);
    run(`INSERT OR REPLACE INTO portfolio_snapshots (date, ts, total_gbp, invested_gbp, cash_gbp, pnl_gbp, pnl_pct, day_change_gbp, breakdown) VALUES (?,?,?,?,?,?,?,?,?)`,
      iso(d.getTime()), d.getTime(), t, t - 5400, 5400, null, null, null, '{}');
  }

  // News touching holdings — headlines marked as fixtures.
  const story = (hAgo, title, source, symbols, sentiment, relevance, why) => run(
    `INSERT INTO news (guid, source, title, url, published, summary, tags, symbols, sentiment, fetched_at, ai_relevance, ai_category, ai_symbols, ai_sentiment, ai_why, ai_scored_at, ai_attempts)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    `fixture-${title.length}-${hAgo}`, source, title, `https://example.invalid/fixture/${hAgo}`, NOW - hAgo * 3600_000, null, '[]',
    JSON.stringify(symbols), sentiment, NOW, relevance, 'company', JSON.stringify(symbols), sentiment, why, NOW, 1);
  story(2, '[Test fixture] Chip makers rally after sector upgrade', 'Fixture Wire', ['TSEM.L', 'TWLD.L'], 0.55, 78, 'Semiconductor names held twice over.');
  story(5, '[Test fixture] UK large caps slip as energy stocks fall', 'Fixture Wire', ['TFTS.L', 'TUKA.L'], -0.4, 66, 'Both UK trackers carry the same energy names.');
  story(9, '[Test fixture] Gold steadies as dollar eases', 'Fixture Times', ['TGLD.L'], 0.05, 52, 'Gold position is flat on the day.');
  story(20, '[Test fixture] Test Company Inc to report results next week', 'Fixture Times', ['TCO'], 0.2, 71, 'Directly held equity reporting soon.');
  story(30, '[Test fixture] Emerging-market funds see outflows', 'Fixture Wire', ['TEMX.L'], -0.35, 58, 'EM fund held in the ISA.');
  story(40, '[Test fixture] Untracked company unveils product', 'Fixture Wire', ['ZZZZ'], 0.6, 90, 'Not held — must be excluded.');

  // Calendar cache: real-shaped dates for some, none published for others.
  const inDays = n => iso(NOW + n * DAY);
  setSetting('calendar_cache', {
    'TCO': { name: 'Test Company Inc', dates: { nextEarnings: inDays(6), nextEarningsLate: null, exDividendDate: inDays(34), dividendDate: inDays(44) }, fetchedAt: NOW },
    'TWLD.L': { name: 'Test World Equity Tracker', dates: { nextEarnings: null, exDividendDate: inDays(11), dividendDate: inDays(27) }, fetchedAt: NOW },
    'TUKA.L': { name: 'Test UK All-Share Tracker', dates: { nextEarnings: null, exDividendDate: inDays(19), dividendDate: null }, fetchedAt: NOW },
    'TFTS.L': { name: 'Test FTSE 100 Tracker', dates: { nextEarnings: null, exDividendDate: inDays(42), dividendDate: null }, fetchedAt: NOW },
    'TCO2': { name: 'TCO2', dates: { nextEarnings: inDays(15), exDividendDate: null, dividendDate: null }, fetchedAt: NOW },
    'TGLD.L': { name: 'Test Physical Gold ETC', dates: null, fetchedAt: NOW },
    'TSEM.L': { name: 'Test Semiconductor ETF', dates: null, fetchedAt: NOW },
  });
  setSetting('calendar_last_refresh', { at: NOW - 2 * 3600_000, fetched: 7, failed: 0, stale: 7 });

  // Alerts: one armed, one fired yesterday.
  run(`INSERT INTO alerts (symbol, kind, direction, threshold, status, note, created_at) VALUES (?,?,?,?,?,?,?)`, 'TCO2', 'price', 'below', 70, 'active', '[Test fixture]', NOW - 10 * DAY);
  run(`INSERT INTO alerts (symbol, kind, direction, threshold, status, note, created_at, triggered_at, triggered_value) VALUES (?,?,?,?,?,?,?,?,?)`, 'TSEM.L', 'dayMove', 'above', 3, 'triggered', '[Test fixture] big move', NOW - 20 * DAY, NOW - DAY, 3.4);

  // A goal the user "entered".
  setSetting('user_goal', { target: 400000, targetDate: iso(NOW + 9 * 365 * DAY), monthly: 500, label: '[Test fixture] retirement pot', createdAt: NOW, updatedAt: NOW });
}

if (mode === 'thin') {
  run('INSERT INTO cash (account, wrapper, currency, amount, updated_at) VALUES (?,?,?,?,?)', 'Main ISA', 'ISA', 'GBP', 800, NOW - DAY);
}

try { memory.rebuild(); } catch (e) { console.log(`memory rebuild failed: ${e.message}`); }

// Price fixture: last stored close as the previous close, and a small
// deterministic day move, so up/down/flat all occur in the populated world.
if (fixturePath) {
  const pr = rng(777);
  const out = {};
  for (const [sym, prev] of Object.entries(lastClose)) {
    const idx = Object.keys(lastClose).indexOf(sym);
    const chg = sym === 'TFTS.L' ? 0 : +(gauss(pr) * 1.1).toFixed(2);
    const price = +(prev * (1 + chg / 100)).toFixed(4);
    const h = BOOK.find(b => b.symbol === sym);
    out[sym] = {
      price, prev, change: +(price - prev).toFixed(4), changePct: chg,
      dayHigh: null, dayLow: null, volume: null, avgVolume: null, high52: null, low52: null,
      marketState: 'REGULAR', currency: h?.currency ?? (SYMBOLS[sym]?.ccy ?? 'GBP'),
      name: h?.name ?? SYMBOLS[sym]?.name ?? sym, rawCurrency: null, instrument: 'unknown', live: true,
      fixture: true, _i: idx,
    };
    delete out[sym]._i;
  }
  writeFileSync(fixturePath, JSON.stringify(out, null, 1));
  console.log(`price fixture: ${Object.keys(out).length} symbols -> ${fixturePath}`);
}

console.log(`Seeded ${mode} world: ${book.length} holdings, ${dates.length} weekday bars per series, into ${target}`);
console.log('THIS DATA IS FABRICATED — for testing only.');
db.close?.();
