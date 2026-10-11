// Meridian — dated portfolio series and everything measured along them.
//
// The Portfolio page's value chart has always been a fixed-weight
// reconstruction: today's share counts priced at each day's close. That
// answers "how would the book I hold now have behaved", not "what did I earn",
// and every figure below carries that basis rather than dropping it.
//
// Three rules run through the whole file:
//
//   1. Join on date, never on position. A benchmark with a missing day is
//      compared on the dates both have, not shifted a slot to the left.
//   2. A window the history cannot fill is refused, not relabelled. Nineteen
//      bars are never called "1Y".
//   3. Recorded (snapshot) and reconstructed values are never mixed on one
//      line. Recorded values only exist for days the app was running.

import { getBars, getSnapshots, all } from '../db.js';
import { BENCHMARKS, GBP_BENCHMARK } from '../config.js';
import * as A from './analytics.js';
import { reconstructHistory } from './portfolio.js';
import { ok, refuse, r2 } from './contract.js';

const DAY = 86400_000;
const parse = s => Date.parse(`${String(s).slice(0, 10)}T00:00:00Z`);
const iso = ms => new Date(ms).toISOString().slice(0, 10);

export const RECONSTRUCTED_BASIS =
  'Reconstructed: today\'s share counts priced at each day\'s stored close and FX rate. '
  + 'Trades, deposits and cash are not in it — it shows how the book you hold now would have moved.';
export const RECORDED_BASIS =
  'Recorded: portfolio totals snapshotted while the app was running. Days the app was off are gaps, not zero moves.';

/** Calendar arithmetic on ISO dates, in UTC so a DST change cannot shift a day. */
export function shiftDate(isoDate, { days = 0, months = 0, years = 0 } = {}) {
  const d = new Date(parse(isoDate));
  if (years) d.setUTCFullYear(d.getUTCFullYear() - years);
  if (months) d.setUTCMonth(d.getUTCMonth() - months);
  if (days) d.setUTCDate(d.getUTCDate() - days);
  return iso(d.getTime());
}

export const PERIODS = ['1W', '1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'ITD'];
export const RANGES = ['1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'MAX'];

/** Target start date for a period ending on `end`. Null for inception. */
export function periodStart(period, end) {
  switch (period) {
    case '1W': return shiftDate(end, { days: 7 });
    case '1M': return shiftDate(end, { months: 1 });
    case '3M': return shiftDate(end, { months: 3 });
    case '6M': return shiftDate(end, { months: 6 });
    case '1Y': return shiftDate(end, { years: 1 });
    case '3Y': return shiftDate(end, { years: 3 });
    case '5Y': return shiftDate(end, { years: 5 });
    // The last close of the previous calendar year: YTD is measured from where
    // the year started, which is the prior year's final close.
    case 'YTD': return `${Number(end.slice(0, 4)) - 1}-12-31`;
    case 'ITD': case 'MAX': return null;
    default: return undefined;
  }
}

// A period whose target start falls on a weekend or holiday just before the
// first stored bar is still fillable; anything further short is not.
const FILL_TOLERANCE_DAYS = 4;

/**
 * Index of the point a period starts from, or a refusal.
 * `points` is ascending [{date, value}].
 */
export function locateStart(points, period) {
  if (!points.length) return { ok: false, reason: 'No history.' };
  const end = points[points.length - 1].date;
  const target = periodStart(period, end);
  if (target === undefined) return { ok: false, reason: `Unknown period ${period}.` };
  if (target === null) return { ok: true, index: 0, target: points[0].date };

  // Last point on or before the target.
  let idx = -1;
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].date <= target) { idx = i; break; }
  }
  if (idx >= 0) return { ok: true, index: idx, target };

  const first = points[0].date;
  const shortBy = Math.round((parse(first) - parse(target)) / DAY);
  if (period !== 'YTD' && shortBy <= FILL_TOLERANCE_DAYS) return { ok: true, index: 0, target };
  return {
    ok: false,
    reason: period === 'YTD'
      ? `History starts ${first}, after the last close of ${target.slice(0, 4)}, so the year-to-date return has no starting point.`
      : `History starts ${first}; a ${period} window needs it to start by ${target} (${shortBy} days short).`,
  };
}

// ─── The portfolio series ─────────────────────────────────────

const historyCache = new Map();

/**
 * Reconstructed [{date, value}] with a short-lived memo. The key is supplied
 * by the caller (the server passes its data version), so a holding change or a
 * sync invalidates it without this module knowing about either.
 */
export function portfolioPoints(prices, { lookback = 5000, cacheKey = null } = {}) {
  const key = cacheKey != null ? `${cacheKey}|${lookback}` : null;
  if (key) {
    const hit = historyCache.get(key);
    if (hit && Date.now() - hit.at < 120_000) return hit.value;
  }
  const hist = reconstructHistory(prices, lookback);
  const value = {
    points: (hist.series ?? []).filter(p => Number.isFinite(p.value) && p.value > 0),
    symbols: hist.symbols ?? [],
    excluded: hist.excluded ?? [],
    note: hist.note ?? null,
  };
  if (key) {
    historyCache.set(key, { at: Date.now(), value });
    if (historyCache.size > 20) historyCache.delete(historyCache.keys().next().value);
  }
  return value;
}

/** Recorded [{date, value}] from snapshots, cash included as recorded. */
export function recordedPoints() {
  return (getSnapshots() ?? [])
    .filter(s => s.date && Number.isFinite(s.total_gbp) && s.total_gbp > 0)
    .map(s => ({ date: s.date, value: s.total_gbp }));
}

export function benchmarkInfo(symbol) {
  const sym = symbol || GBP_BENCHMARK;
  const b = BENCHMARKS.find(x => x.symbol === sym);
  if (!b) return null;
  return b;
}

/** Map date -> close for a benchmark, from stored bars. */
export function benchmarkMap(symbol) {
  return new Map(getBars(symbol)
    .map(b => [b.date, b.adj_close ?? b.close])
    .filter(([, v]) => Number.isFinite(v) && v > 0));
}

/** Close on or before a date, looking back at most `maxDays`. */
function closeOnOrBefore(map, sortedDates, date, maxDays = 5) {
  // Binary search for the last date <= target.
  let lo = 0, hi = sortedDates.length - 1, found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sortedDates[mid] <= date) { found = mid; lo = mid + 1; } else hi = mid - 1;
  }
  if (found < 0) return null;
  const d = sortedDates[found];
  if ((parse(date) - parse(d)) / DAY > maxDays) return null;
  return { date: d, value: map.get(d) };
}

function coverageFor(pp) {
  const missing = (pp.excluded ?? []).map(s => ({
    symbol: s, reason: 'Fewer than 30 stored daily bars, so it cannot be replayed backwards.',
  }));
  return {
    share: null,
    missing,
    note: missing.length
      ? `${missing.map(m => m.symbol).join(', ')} left out of the reconstruction (too little stored history). Cash is not in it.`
      : 'Cash is not in the reconstruction; it only covers priced holdings.',
  };
}

/**
 * Which ranges the history can fill, so buttons can be disabled up front
 * rather than clicked into a refusal.
 */
export function fillableRanges(points) {
  const out = {};
  for (const r of RANGES) {
    const loc = locateStart(points, r === 'MAX' ? 'ITD' : r);
    out[r] = loc.ok ? true : loc.reason;
  }
  return out;
}

// ─── R1-05: portfolio against a benchmark ─────────────────────

export function performanceSeries(prices, { benchmark = GBP_BENCHMARK, range = '1Y', basis = 'reconstructed', cacheKey = null, from = null, to = null } = {}) {
  const bench = benchmarkInfo(benchmark);
  if (!bench) {
    return refuse(`${benchmark} is not in the benchmark list (${BENCHMARKS.map(b => b.symbol).join(', ')}).`,
      { source: 'Benchmark list in server/config.js' });
  }
  if (!RANGES.includes(range) && range !== 'CUSTOM') return refuse(`Unknown range ${range}. Use one of ${RANGES.join(', ')}, or CUSTOM with from/to.`);

  let points, pp = null, basisText;
  if (basis === 'recorded') {
    points = recordedPoints();
    basisText = RECORDED_BASIS;
    if (points.length < 2) {
      return refuse(`Recorded return needs at least 2 days of snapshots; ${points.length} stored. Snapshots are taken every 15 minutes while the app runs.`,
        { basis: 'recorded', source: 'portfolio_snapshots' });
    }
  } else {
    pp = portfolioPoints(prices, { cacheKey });
    points = pp.points;
    basisText = RECONSTRUCTED_BASIS;
    if (points.length < 2) {
      return refuse(pp.note ?? 'No reconstructable history — no priced holding has 30+ stored bars.',
        { basis: 'reconstructed', source: 'Stored daily bars', coverage: coverageFor(pp) });
    }
  }

  const fillable = fillableRanges(points);
  let slice;
  if (range === 'CUSTOM') {
    // A custom window (e.g. one month clicked on the heatmap): from the last
    // close on or before `from` to the last close on or before `to`. Refused
    // rather than shortened if the history does not reach back that far.
    if (!from) return refuse('A custom range needs a from date.');
    const end = to ?? points[points.length - 1].date;
    let i0 = -1;
    for (let i = points.length - 1; i >= 0; i--) if (points[i].date <= from) { i0 = i; break; }
    if (i0 < 0) return refuse(`History starts ${points[0].date}, after ${from}.`, { basis, data: { fillable } });
    slice = points.slice(i0).filter(p => p.date <= end);
    if (slice.length < 2) return refuse(`Fewer than two closes between ${from} and ${end}.`, { basis, data: { fillable } });
  } else {
    const loc = locateStart(points, range === 'MAX' ? 'ITD' : range);
    if (!loc.ok) {
      return refuse(loc.reason, { basis, source: 'Stored daily bars', data: { fillable }, coverage: pp ? coverageFor(pp) : null });
    }
    slice = points.slice(loc.index);
  }
  const bmap = benchmarkMap(bench.symbol);
  const bdates = [...bmap.keys()].sort();

  // Rebase the benchmark at its own close on the first date of the window, or
  // the nearest stored close before it (never after — that would start the
  // benchmark later than the portfolio and flatter whichever lagged).
  const bStart = closeOnOrBefore(bmap, bdates, slice[0].date, 5);
  const p0 = slice[0].value;
  let benchMissing = 0;
  const out = slice.map(p => {
    const b = bmap.get(p.date);
    if (b == null) benchMissing++;
    const portfolio = +(p.value / p0 * 100).toFixed(4);
    const benchmarkV = b != null && bStart ? +(b / bStart.value * 100).toFixed(4) : null;
    return {
      date: p.date,
      value: +p.value.toFixed(2),
      portfolio,
      benchmark: benchmarkV,
      relative: benchmarkV != null ? +(portfolio / benchmarkV * 100).toFixed(4) : null,
    };
  });

  // Peak over the whole available history, not just the window: "distance
  // from peak" means the book's high, not the high of whatever range is shown.
  let peak = points[0];
  for (const p of points) if (p.value > peak.value) peak = p;
  const last = points[points.length - 1];

  const benchAvailable = !!bStart && out.some(o => o.benchmark != null);

  return ok({
    range, from: out[0].date, to: out[out.length - 1].date,
    points: out,
    fillable,
    benchmark: {
      symbol: bench.symbol, label: bench.label, note: bench.note,
      available: benchAvailable,
      reason: benchAvailable ? null : `No stored ${bench.symbol} close on or within 5 days before ${out[0].date}.`,
      missingDays: benchMissing,
      rebasedFrom: bStart?.date ?? null,
    },
    peak: {
      value: +peak.value.toFixed(2), date: peak.date,
      distancePct: r2((last.value / peak.value - 1) * 100),
      atPeak: last.date === peak.date,
    },
    last: { value: +last.value.toFixed(2), date: last.date },
  }, {
    source: `Stored daily bars; benchmark ${bench.symbol} from stored bars`,
    basis: basisText,
    coverage: pp ? coverageFor(pp) : { share: null, missing: [], note: 'Recorded snapshots include cash as it stood when each snapshot was taken.' },
    asOf: parse(last.date),
  });
}

// ─── R1-06: returns by period ─────────────────────────────────

function periodReturn(points, period) {
  const loc = locateStart(points, period);
  if (!loc.ok) return { available: false, reason: loc.reason };
  const start = points[loc.index], end = points[points.length - 1];
  if (loc.index === points.length - 1) return { available: false, reason: 'No bars after the start date.' };
  const cum = end.value / start.value - 1;
  const days = (parse(end.date) - parse(start.date)) / DAY;
  const annualise = ['3Y', '5Y'].includes(period) || (period === 'ITD' && days >= 365);
  return {
    available: true,
    from: start.date, to: end.date,
    bars: points.length - 1 - loc.index,
    pct: r2(cum * 100, 4),
    annualisedPct: annualise && cum > -1 ? r2((Math.pow(1 + cum, 365 / days) - 1) * 100, 4) : null,
  };
}

function benchReturnBetween(bmap, bdates, from, to) {
  const s = closeOnOrBefore(bmap, bdates, from, 5);
  const e = closeOnOrBefore(bmap, bdates, to, 5);
  if (!s || !e) return { available: false, reason: `No stored benchmark close near ${!s ? from : to}.` };
  if (s.date === e.date) return { available: false, reason: 'Benchmark has one bar in this window.' };
  return { available: true, from: s.date, to: e.date, pct: r2((e.value / s.value - 1) * 100, 4) };
}

export function periodReturns(prices, { benchmark = GBP_BENCHMARK, cacheKey = null, points: given = null } = {}) {
  const bench = benchmarkInfo(benchmark);
  if (!bench) return refuse(`${benchmark} is not in the benchmark list.`);
  const pp = given ? { points: given, excluded: [] } : portfolioPoints(prices, { cacheKey });
  const points = pp.points;
  if (points.length < 2) {
    return refuse(pp.note ?? 'No reconstructable history.', { basis: 'reconstructed', coverage: coverageFor(pp) });
  }
  const bmap = benchmarkMap(bench.symbol);
  const bdates = [...bmap.keys()].sort();

  const rows = PERIODS.map(period => {
    const p = periodReturn(points, period);
    if (!p.available) return { period, available: false, reason: p.reason, portfolio: null, benchmark: null, excessPp: null };
    const b = benchReturnBetween(bmap, bdates, p.from, p.to);
    const bDays = b.available ? (parse(b.to) - parse(b.from)) / DAY : null;
    const bAnn = b.available && p.annualisedPct != null && bDays >= 365
      ? r2((Math.pow(1 + b.pct / 100, 365 / bDays) - 1) * 100, 4) : null;
    return {
      period, available: true,
      from: p.from, to: p.to, bars: p.bars,
      portfolio: p.pct, portfolioAnnualised: p.annualisedPct,
      benchmark: b.available ? b.pct : null, benchmarkAnnualised: bAnn,
      benchmarkReason: b.available ? null : b.reason,
      excessPp: b.available ? r2(p.pct - b.pct, 4) : null,
    };
  });

  return ok({ rows, benchmark: { symbol: bench.symbol, label: bench.label, note: bench.note } }, {
    source: 'Stored daily bars (adjusted close where stored)',
    basis: RECONSTRUCTED_BASIS,
    coverage: coverageFor(pp),
    asOf: parse(points[points.length - 1].date),
  });
}

// ─── B-13: monthly and calendar-year returns ──────────────────

function lastOfBuckets(points, keyOf) {
  const out = [];
  for (const p of points) {
    const k = keyOf(p.date);
    if (out.length && out[out.length - 1].key === k) out[out.length - 1] = { key: k, date: p.date, value: p.value, n: out[out.length - 1].n + 1 };
    else out.push({ key: k, date: p.date, value: p.value, n: 1 });
  }
  return out;
}

export function calendarReturns(prices, { benchmark = GBP_BENCHMARK, cacheKey = null, points: given = null, today = new Date() } = {}) {
  const bench = benchmarkInfo(benchmark);
  if (!bench) return refuse(`${benchmark} is not in the benchmark list.`);
  const pp = given ? { points: given, excluded: [] } : portfolioPoints(prices, { cacheKey });
  const points = pp.points;
  if (points.length < 22) {
    return refuse(`Monthly returns need at least a month of history; ${points.length} bars stored.`,
      { basis: 'reconstructed', coverage: coverageFor(pp) });
  }
  const bmap = benchmarkMap(bench.symbol);
  const bdates = [...bmap.keys()].sort();
  const thisMonth = today.toISOString().slice(0, 7);
  const thisYear = today.toISOString().slice(0, 4);

  const months = lastOfBuckets(points, d => d.slice(0, 7));
  const monthRows = months.map((m, i) => {
    const prev = i === 0 ? { date: points[0].date, value: points[0].value } : months[i - 1];
    // The first month starts from the first stored bar, part-way through it.
    const partialStart = i === 0 && points[0].date.slice(8) > '05';
    const partialEnd = m.key === thisMonth;
    const pct = (m.value / prev.value - 1) * 100;
    const b = benchReturnBetween(bmap, bdates, prev.date, m.date);
    return {
      month: m.key, year: m.key.slice(0, 4), m: Number(m.key.slice(5)),
      pct: r2(pct, 3), bars: m.n,
      partial: partialStart || partialEnd,
      partialReason: partialStart ? `History starts ${points[0].date}` : partialEnd ? 'Month not finished' : null,
      benchmark: b.available ? b.pct : null,
      excessPp: b.available ? r2(pct - b.pct, 3) : null,
    };
  });

  const years = lastOfBuckets(points, d => d.slice(0, 4));
  const yearRows = years.map((y, i) => {
    const prev = i === 0 ? { date: points[0].date, value: points[0].value } : years[i - 1];
    const partialStart = i === 0 && points[0].date.slice(5) > '01-07';
    const partialEnd = y.key === thisYear;
    const pct = (y.value / prev.value - 1) * 100;
    const b = benchReturnBetween(bmap, bdates, prev.date, y.date);
    return {
      year: y.key, pct: r2(pct, 3), bars: y.n,
      partial: partialStart || partialEnd,
      partialReason: partialStart ? `History starts ${points[0].date}` : partialEnd ? 'Year to date' : null,
      sparse: y.n < 150 && !partialEnd && !partialStart,
      benchmark: b.available ? b.pct : null,
      excessPp: b.available ? r2(pct - b.pct, 3) : null,
    };
  });

  const complete = monthRows.filter(r => !r.partial);
  const seasonality = Array.from({ length: 12 }, (_, k) => {
    const xs = complete.filter(r => r.m === k + 1).map(r => r.pct);
    return { m: k + 1, average: xs.length ? r2(xs.reduce((a, b) => a + b, 0) / xs.length, 3) : null, count: xs.length };
  });
  const hitRate = complete.length ? r2(complete.filter(r => r.pct > 0).length / complete.length * 100, 1) : null;

  return ok({
    months: monthRows, years: yearRows, seasonality,
    hitRate, completeMonths: complete.length,
    benchmark: { symbol: bench.symbol, label: bench.label },
  }, {
    source: 'Stored daily bars; month and year ends are the last stored close in each',
    basis: RECONSTRUCTED_BASIS,
    coverage: coverageFor(pp),
    asOf: parse(points[points.length - 1].date),
  });
}

// ─── B-14: drawdowns ──────────────────────────────────────────

/**
 * Peak-to-trough episodes. An episode opens when the value falls below its
 * running peak and closes on the first day it regains that peak; one that has
 * not regained it by the last bar is ongoing and is reported as ongoing, never
 * as recovered.
 */
export function drawdownEpisodes(points, { minDepth = 0.01 } = {}) {
  const episodes = [];
  let peakIdx = 0, cur = null;
  for (let i = 0; i < points.length; i++) {
    const v = points[i].value;
    if (v >= points[peakIdx].value) {
      if (cur) {
        cur.recoveryIdx = i;
        episodes.push(cur);
        cur = null;
      }
      peakIdx = i;
      continue;
    }
    if (!cur) cur = { peakIdx, troughIdx: i, recoveryIdx: null };
    if (v < points[cur.troughIdx].value) cur.troughIdx = i;
  }
  if (cur) episodes.push(cur);

  return episodes
    .map(e => {
      const peak = points[e.peakIdx], trough = points[e.troughIdx];
      const rec = e.recoveryIdx != null ? points[e.recoveryIdx] : null;
      return {
        peakDate: peak.date, peakValue: +peak.value.toFixed(2),
        troughDate: trough.date, troughValue: +trough.value.toFixed(2),
        depthPct: r2((trough.value / peak.value - 1) * 100, 3),
        recoveryDate: rec?.date ?? null,
        ongoing: rec == null,
        daysDown: Math.round((parse(trough.date) - parse(peak.date)) / DAY),
        daysToRecover: rec ? Math.round((parse(rec.date) - parse(trough.date)) / DAY) : null,
        totalDays: Math.round(((rec ? parse(rec.date) : parse(points[points.length - 1].date)) - parse(peak.date)) / DAY),
        barsUnder: (e.recoveryIdx ?? points.length) - e.peakIdx,
        _p: e.peakIdx, _t: e.troughIdx, _r: e.recoveryIdx,
      };
    })
    .filter(e => -e.depthPct / 100 >= minDepth);
}

function downsample(arr, n = 40) {
  if (arr.length <= n) return arr;
  const step = (arr.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => arr[Math.round(i * step)]);
}

export function drawdowns(prices, { benchmark = GBP_BENCHMARK, cacheKey = null, points: given = null, minDepth = 0.01, limit = 10 } = {}) {
  const pp = given ? { points: given, excluded: [] } : portfolioPoints(prices, { cacheKey });
  const points = pp.points;
  if (points.length < 30) {
    return refuse(`Drawdowns need at least 30 bars of history; ${points.length} stored.`, { basis: 'reconstructed', coverage: coverageFor(pp) });
  }
  const bench = benchmarkInfo(benchmark);
  const bmap = bench ? benchmarkMap(bench.symbol) : new Map();
  const bdates = [...bmap.keys()].sort();

  const underwater = A.drawdownSeries(points.map(p => p.value));
  const eps = drawdownEpisodes(points, { minDepth });
  const ranked = [...eps].sort((a, b) => a.depthPct - b.depthPct).slice(0, limit).map((e, i) => {
    const bp = closeOnOrBefore(bmap, bdates, e.peakDate, 5);
    const bt = closeOnOrBefore(bmap, bdates, e.troughDate, 5);
    const path = points.slice(e._p, (e._r ?? points.length - 1) + 1).map(p => +(p.value / points[e._p].value * 100).toFixed(3));
    const { _p, _t, _r, ...rest } = e;
    return {
      rank: i + 1, ...rest,
      benchmarkDepthPct: bp && bt ? r2((bt.value / bp.value - 1) * 100, 3) : null,
      path: downsample(path, 40),
    };
  });

  const current = underwater[underwater.length - 1];
  const recovered = eps.filter(e => !e.ongoing);
  const longest = [...eps].sort((a, b) => b.totalDays - a.totalDays)[0] ?? null;

  return ok({
    underwater: points.map((p, i) => ({ date: p.date, pct: r2(underwater[i] * 100, 3) })),
    episodes: ranked,
    stats: {
      currentPct: r2(current * 100, 3),
      ongoing: eps.some(e => e.ongoing),
      maxPct: eps.length ? Math.min(...eps.map(e => e.depthPct)) : 0,
      count: eps.length,
      longestDays: longest?.totalDays ?? null,
      longestFrom: longest?.peakDate ?? null,
      averageRecoveryDays: recovered.length ? Math.round(recovered.reduce((a, e) => a + e.daysToRecover, 0) / recovered.length) : null,
      minDepthPct: minDepth * 100,
    },
    benchmark: bench ? { symbol: bench.symbol, label: bench.label } : null,
  }, {
    source: 'Stored daily bars',
    basis: RECONSTRUCTED_BASIS,
    coverage: coverageFor(pp),
    asOf: parse(points[points.length - 1].date),
    note: `Episodes shallower than ${(minDepth * 100).toFixed(0)}% are not listed.`,
  });
}

// ─── Joined daily returns (for capture, beta, rolling) ────────

/** Portfolio and benchmark daily returns over the SAME pairs of dates. */
export function joinedReturns(points, bmap) {
  const pairs = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const ba = bmap.get(a.date), bb = bmap.get(b.date);
    if (ba == null || bb == null) continue;
    pairs.push({ date: b.date, p: b.value / a.value - 1, b: bb / ba - 1 });
  }
  return pairs;
}

export const MIN_OVERLAP = 120;

// ─── B-17: capture ratios ─────────────────────────────────────

export function captureStats(prices, { benchmark = GBP_BENCHMARK, cacheKey = null, points: given = null, window = 'max' } = {}) {
  const bench = benchmarkInfo(benchmark);
  if (!bench) return refuse(`${benchmark} is not in the benchmark list.`);
  const pp = given ? { points: given, excluded: [] } : portfolioPoints(prices, { cacheKey });
  let points = pp.points;
  if (window !== 'max') {
    const loc = locateStart(points, window.toUpperCase());
    if (!loc.ok) return refuse(loc.reason, { basis: 'reconstructed' });
    points = points.slice(loc.index);
  }
  const pairs = joinedReturns(points, benchmarkMap(bench.symbol));
  if (pairs.length < MIN_OVERLAP) {
    return refuse(`Capture ratios need ${MIN_OVERLAP}+ days where both the portfolio and ${bench.symbol} have a close; found ${pairs.length}.`,
      { basis: 'reconstructed', coverage: coverageFor(pp) });
  }
  const pr = pairs.map(x => x.p), br = pairs.map(x => x.b);
  const cap = A.captureRatios(pr, br);
  const ba = A.betaAlpha(pr, br);
  const upDays = pairs.filter(x => x.b > 0).length, downDays = pairs.filter(x => x.b < 0).length;
  return ok({
    upCapture: r2(cap.upCapture * 100, 1),
    downCapture: r2(cap.downCapture * 100, 1),
    spread: r2(cap.captureSpread * 100, 1),
    upDays, downDays, observations: pairs.length,
    beta: r2(ba.beta, 3), alphaPct: r2(ba.alpha * 100, 2), r2: r2(ba.r2, 3),
    trackingErrorPct: r2(A.trackingError(pr, br) * 100, 2),
    informationRatio: r2(A.informationRatio(pr, br), 3),
    scatter: pairs.slice(-250).map(x => ({ date: x.date, p: r2(x.p * 100, 3), b: r2(x.b * 100, 3) })),
    benchmark: { symbol: bench.symbol, label: bench.label },
    from: pairs[0].date, to: pairs[pairs.length - 1].date,
  }, {
    source: `Stored daily bars, joined on date with ${bench.symbol}`,
    basis: RECONSTRUCTED_BASIS,
    coverage: coverageFor(pp),
  });
}

// ─── PF-06 / B-16: risk-adjusted metrics and rolling series ───

export const RISK_FREE = 0.04;

export function riskAdjusted(prices, { benchmark = GBP_BENCHMARK, window = '1Y', cacheKey = null, points: given = null, rollingWindow = 63 } = {}) {
  const bench = benchmarkInfo(benchmark);
  if (!bench) return refuse(`${benchmark} is not in the benchmark list.`);
  const pp = given ? { points: given, excluded: [] } : portfolioPoints(prices, { cacheKey });
  let points = pp.points;
  const win = String(window).toUpperCase();
  if (win !== 'MAX') {
    const loc = locateStart(points, win);
    if (!loc.ok) return refuse(loc.reason, { basis: 'reconstructed', coverage: coverageFor(pp) });
    points = points.slice(loc.index);
  }
  const values = points.map(p => p.value);
  const rets = A.toReturns(values);
  if (rets.length < 126) {
    return refuse(`Risk-adjusted figures need at least 126 daily returns (about six months) in the window; found ${rets.length}.`,
      { basis: 'reconstructed', coverage: coverageFor(pp) });
  }
  const days = (parse(points[points.length - 1].date) - parse(points[0].date)) / DAY;
  const total = values[values.length - 1] / values[0] - 1;
  const cagr = days > 0 ? Math.pow(1 + total, 365 / days) - 1 : null;
  const dd = A.maxDrawdown(values, points.map(p => p.date));
  const vol = A.annualisedVol(rets);
  const bmap = benchmarkMap(bench.symbol);
  const pairs = joinedReturns(points, bmap);
  const enough = pairs.length >= MIN_OVERLAP;
  const ba = enough ? A.betaAlpha(pairs.map(x => x.p), pairs.map(x => x.b)) : null;
  const bVol = enough ? A.annualisedVol(pairs.map(x => x.b)) : null;

  // Rolling series, stepped so a multi-year window stays a few hundred points.
  const rolling = [];
  const step = Math.max(1, Math.floor(rets.length / 250));
  for (let i = rollingWindow; i <= rets.length; i += step) {
    const w = rets.slice(i - rollingWindow, i);
    const date = points[i].date;
    let beta = null;
    if (enough) {
      const wp = pairs.filter(x => x.date > points[i - rollingWindow].date && x.date <= date);
      if (wp.length >= Math.floor(rollingWindow * 0.8)) beta = r2(A.betaAlpha(wp.map(x => x.p), wp.map(x => x.b)).beta, 3);
    }
    rolling.push({ date, vol: r2(A.annualisedVol(w) * 100, 2), sharpe: r2(A.sharpe(w, RISK_FREE), 3), beta });
  }

  return ok({
    window: win,
    from: points[0].date, to: points[points.length - 1].date, observations: rets.length,
    cagrPct: r2(cagr * 100, 2),
    totalPct: r2(total * 100, 2),
    volPct: r2(vol * 100, 2),
    benchmarkVolPct: bVol != null ? r2(bVol * 100, 2) : null,
    sharpe: r2(A.sharpe(rets, RISK_FREE), 3),
    sortino: r2(A.sortino(rets, RISK_FREE), 3),
    calmar: r2(A.calmar(values), 3),
    maxDrawdownPct: r2(dd.maxDrawdown * 100, 2),
    maxDrawdownWindow: dd.peakDate && dd.troughDate ? `${dd.peakDate} to ${dd.troughDate}` : null,
    beta: ba ? r2(ba.beta, 3) : null,
    alphaPct: ba ? r2(ba.alpha * 100, 2) : null,
    betaReason: enough ? null : `Beta needs ${MIN_OVERLAP}+ days joined on date with ${bench.symbol}; found ${pairs.length}.`,
    riskFreePct: RISK_FREE * 100,
    rolling, rollingWindow,
    benchmark: { symbol: bench.symbol, label: bench.label },
  }, {
    source: 'Stored daily bars; analytics.js primitives',
    basis: RECONSTRUCTED_BASIS,
    coverage: coverageFor(pp),
    note: `Sharpe and Sortino use a ${RISK_FREE * 100}% annual risk-free rate. Annualised with 252 trading days.`,
  });
}

// ─── B-18: value bridge from the flow ledger ──────────────────

/**
 * Start + deposits - withdrawals + market movement = now, from the ledger the
 * user maintains. The movement term is the residual, so the bridge sums
 * exactly by construction; the check below is what proves the inputs were
 * read correctly. With no ledger there is no bridge — inventing a deposit
 * history from holdings would be the fabrication this app exists to avoid.
 */
export function valueBridge({ currentValue, flows, fees = null, asOf = Date.now() }) {
  if (!flows?.length) {
    return refuse('No cash flows recorded. A bridge from money paid in to what it is worth now needs the dated deposits and withdrawals in the Performance ledger.',
      { source: 'cash_flows ledger' });
  }
  if (!(currentValue > 0)) return refuse('The portfolio has no current value to bridge to.');
  const deposits = flows.filter(f => f.amount > 0).reduce((a, f) => a + f.amount, 0);
  const withdrawals = flows.filter(f => f.amount < 0).reduce((a, f) => a + f.amount, 0);
  const net = deposits + withdrawals;
  const movement = currentValue - net;
  const steps = [
    { key: 'start', label: 'Start', value: 0, kind: 'total' },
    { key: 'deposits', label: 'Paid in', value: r2(deposits), kind: 'step' },
    { key: 'withdrawals', label: 'Taken out', value: r2(withdrawals), kind: 'step' },
    { key: 'movement', label: 'Market movement', value: r2(movement), kind: 'step' },
    { key: 'now', label: 'Now', value: r2(currentValue), kind: 'total' },
  ];
  const sum = steps.filter(s => s.kind === 'step').reduce((a, s) => a + s.value, 0);
  const sorted = [...flows].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return ok({
    steps,
    reconciles: Math.abs(sum - r2(currentValue)) < 0.015,
    deposits: r2(deposits), withdrawals: r2(withdrawals), net: r2(net), movement: r2(movement),
    movementPctOfNet: net > 0 ? r2(movement / net * 100) : null,
    firstFlow: sorted[0]?.date ?? null, flowCount: flows.length,
    markers: sorted.map(f => ({ date: f.date, amount: f.amount, kind: f.kind })),
    feesRecorded: fees,
    income: { available: false, reason: 'Income is not tracked: there is no record of dividends received, so it sits inside market movement.' },
  }, {
    source: 'cash_flows ledger you maintain; current total from live prices',
    basis: 'Treats the first recorded flow as the start. Value held before the ledger begins is not known and would be counted as movement.',
    asOf,
    note: fees != null ? `Trading fees recorded on transactions (£${fees.toFixed(2)}) are already inside market movement, not a separate step.` : null,
  });
}

export function tradingFeesRecorded() {
  const r = all('SELECT COALESCE(SUM(fees), 0) f, COUNT(*) n FROM transactions');
  return r[0]?.n ? +r[0].f.toFixed(2) : null;
}

// ─── B-19: contribution over time ─────────────────────────────

/**
 * Per-holding contribution to each calendar month's return, from the same
 * reconstruction. Within a month, contribution = the holding's value at the
 * previous month-end / the book's value then × its return over the month, so
 * the contributions sum to the month's return exactly (single-period, no
 * linking needed). Months are not compounded together here: each bar is its
 * own month.
 */
export function contributionOverTime(byHolding, { months = 12 } = {}) {
  const series = byHolding?.series ?? [];
  const symbols = byHolding?.symbols ?? [];
  if (series.length < 22 || !symbols.length) {
    return refuse('Contribution over time needs at least a month of reconstructed history.', { basis: 'reconstructed' });
  }
  const ends = [];
  for (let i = 0; i < series.length; i++) {
    const m = series[i].date.slice(0, 7);
    if (i === series.length - 1 || series[i + 1].date.slice(0, 7) !== m) ends.push(i);
  }
  const buckets = [];
  for (let k = 1; k < ends.length; k++) {
    const a = series[ends[k - 1]], b = series[ends[k]];
    const V0 = symbols.reduce((s, x) => s + (a[x] ?? 0), 0), V1 = symbols.reduce((s, x) => s + (b[x] ?? 0), 0);
    if (!(V0 > 0)) continue;
    const parts = symbols.map(x => {
      const v0 = a[x] ?? 0, v1 = b[x] ?? 0;
      return { symbol: x, contributionPct: v0 > 0 ? r2((v0 / V0) * (v1 / v0 - 1) * 100, 6) : 0, gbp: r2(v1 - v0) };
    });
    buckets.push({
      month: b.date.slice(0, 7), from: a.date, to: b.date,
      returnPct: r2((V1 / V0 - 1) * 100, 6), gbp: r2(V1 - V0),
      parts, partial: k === ends.length - 1,
    });
  }
  const kept = buckets.slice(-months);
  return ok({ months: kept, symbols, reconciles: kept.every(m => Math.abs(m.parts.reduce((s, p) => s + p.contributionPct, 0) - m.returnPct) < 1e-4) }, {
    source: 'Stored daily bars at current share counts',
    basis: RECONSTRUCTED_BASIS,
    note: 'The latest month is partial.',
  });
}
