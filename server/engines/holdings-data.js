// Meridian — per-holding reads for the Holdings, Overview and Analysis pages.
//
// Nothing here is a new model. Every figure is a position, a stored bar, a
// published expense ratio or a user-entered target, assembled in one read so
// a table of twenty rows does not cost twenty round trips, and every row says
// what it is missing rather than showing a blank that looks like zero.

import { all, getBars } from '../db.js';
import { WRAPPERS, TRADING_DAYS } from '../config.js';
import { reconstructHistoryByHolding } from './portfolio.js';
import { getComposition, listCompositions } from './rebuild/exposure.js';
import { venueOf } from './lookthrough.js';
import { classify } from '../sources/instruments.js';
import { getNews } from '../sources/news.js';
import { benchmarkInfo, benchmarkMap, locateStart } from './series.js';
import { latestFor } from './memory.js';
import { ok, refuse, r2 } from './contract.js';

const DAY = 86400_000;
const parse = s => Date.parse(`${String(s).slice(0, 10)}T00:00:00Z`);

// ─── R1-07: per-holding returns over several windows ──────────

export const RETURN_WINDOWS = ['1D', '1W', '1M', '3M', 'YTD', '1Y'];

/**
 * Returns and contributions per holding over each window, from the same
 * reconstruction the portfolio series uses, so the parts reconcile to the
 * whole:
 *
 *   portfolio return R = V1/V0 - 1 = sum_i (v_i0 / V0) * r_i
 *
 * with v_i0 the holding's value at the window start. Contribution is that
 * prior weight times the holding's return, and the contributions sum to R
 * exactly (asserted in the tests). Holdings the reconstruction cannot replay
 * appear with nulls and a reason, and are named in `coverage.missing`.
 */
export function holdingReturns(prices, valued, { windows = RETURN_WINDOWS, benchmark = null, lookback = 2600, newsHours = 48 } = {}) {
  const rec = reconstructHistoryByHolding(prices, lookback);
  const positions = valued.positions ?? [];
  if (!positions.length) return refuse('No holdings.', { source: 'holdings table' });

  const series = rec.series ?? [];
  const symbols = rec.symbols ?? [];
  const points = series.map(r => ({ date: r.date, value: symbols.reduce((a, s) => a + (r[s] ?? 0), 0) }));

  const bench = benchmark ? benchmarkInfo(benchmark) : null;
  const bmap = bench ? benchmarkMap(bench.symbol) : null;
  const bdates = bmap ? [...bmap.keys()].sort() : [];
  const benchOn = d => {
    let lo = 0, hi = bdates.length - 1, f = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (bdates[m] <= d) { f = m; lo = m + 1; } else hi = m - 1; }
    return f >= 0 && (parse(d) - parse(bdates[f])) / DAY <= 5 ? bmap.get(bdates[f]) : null;
  };

  const windowMeta = {};
  const portfolioByWindow = {};
  for (const w of windows) {
    if (points.length < 2) { windowMeta[w] = { available: false, reason: rec.note ?? 'No reconstructable history.' }; continue; }
    const loc = w === '1D'
      ? { ok: true, index: points.length - 2 }
      : locateStart(points, w);
    if (!loc.ok) { windowMeta[w] = { available: false, reason: loc.reason }; continue; }
    const s = series[loc.index], e = series[series.length - 1];
    const V0 = points[loc.index].value, V1 = points[points.length - 1].value;
    const bs = bmap ? benchOn(s.date) : null, be = bmap ? benchOn(e.date) : null;
    windowMeta[w] = {
      available: true, from: s.date, to: e.date, startIndex: loc.index,
      bars: series.length - 1 - loc.index,
      benchmarkPct: bs && be ? r2((be / bs - 1) * 100, 4) : null,
    };
    portfolioByWindow[w] = { pct: r2((V1 / V0 - 1) * 100, 6), V0, V1 };
  }

  // Linked stories: a mover's "reason" line only exists when a real stored
  // story names that holding. No story, no line.
  const since = Date.now() - newsHours * 3600_000;
  const storyFor = sym => {
    try {
      const n = getNews({ symbol: sym, since, limit: 1, sort: 'smart' })[0];
      return n ? { title: n.title, url: n.url, source: n.source, published: n.published, relevance: n.relevance, scored: n.scored } : null;
    } catch { return null; }
  };

  // "Unusual for its own history": the memory layer's z-score of the latest
  // daily return against the instrument's own trailing year.
  let mem = {};
  try { mem = latestFor(positions.map(p => p.symbol)); } catch { mem = {}; }

  const rows = positions.map(p => {
    const inRec = symbols.includes(p.symbol);
    const m = mem[p.symbol];
    const reason = !p.hasPrice ? 'No live price, so it is not in the valuation.'
      : !inRec ? 'Fewer than 30 stored daily bars, so it cannot be replayed over these windows.' : null;
    const byWindow = {};
    for (const w of windows) {
      const m = windowMeta[w];
      if (!m?.available || !inRec) { byWindow[w] = { returnPct: null, contributionPct: null, relativePp: null, reason: reason ?? m?.reason }; continue; }
      const v0 = series[m.startIndex][p.symbol], v1 = series[series.length - 1][p.symbol];
      const V0 = portfolioByWindow[w].V0;
      if (!(v0 > 0)) { byWindow[w] = { returnPct: null, contributionPct: null, relativePp: null, reason: 'No value at the window start.' }; continue; }
      const r = v1 / v0 - 1;
      byWindow[w] = {
        returnPct: r2(r * 100, 4),
        contributionPct: r2((v0 / V0) * r * 100, 6),
        priorWeightPct: r2(v0 / V0 * 100, 3),
        gbp: r2(v1 - v0),
        relativePp: m.benchmarkPct != null ? r2(r * 100 - m.benchmarkPct, 4) : null,
      };
    }
    const closes = inRec ? series.slice(-66).map(r => r[p.symbol]).filter(v => v > 0) : [];
    return {
      symbol: p.symbol, name: p.name, weight: p.weight, value: p.value,
      hasPrice: p.hasPrice, included: inRec && p.hasPrice, reason,
      live: { dayPct: p.dayChangePct ?? null, dayGBP: p.dayChangeGBP ?? null },
      unusual: m ? { z: r2(m.ret_z ?? null, 2), date: m.date, ret1dPct: m.ret_1d != null ? r2(m.ret_1d * 100, 3) : null } : null,
      windows: byWindow,
      spark: closes.slice(-22),
      story: storyFor(p.symbol),
    };
  });

  const missing = rows.filter(r => !r.included).map(r => ({ symbol: r.symbol, reason: r.reason }));
  return ok({
    windows: Object.fromEntries(windows.map(w => [w, { ...windowMeta[w], portfolioPct: portfolioByWindow[w]?.pct ?? null }])),
    rows,
    benchmark: bench ? { symbol: bench.symbol, label: bench.label } : null,
  }, {
    source: 'Stored daily bars at current share counts; linked stories from the local news feed',
    basis: 'Reconstructed at today\'s quantities. "1D" here is the last two stored closes; the live day move from the price feed is carried separately as `live`.',
    coverage: {
      share: positions.length ? r2(rows.filter(r => r.included).reduce((a, r) => a + (r.weight ?? 0), 0) / 100, 4) : null,
      missing,
      note: missing.length ? `${missing.map(m => m.symbol).join(', ')} not measurable over these windows.` : null,
    },
    asOf: points.length ? parse(points[points.length - 1].date) : Date.now(),
  });
}

// ─── B-20: enriched holdings in one call ──────────────────────

function range52(bars, price) {
  const last = bars.slice(-TRADING_DAYS);
  const pts = last.map(b => ({ date: b.date, v: b.adj_close ?? b.close })).filter(x => Number.isFinite(x.v));
  if (pts.length < 30) return { available: false, reason: `Only ${pts.length} stored closes in the last year.` };
  let lo = pts[0], hi = pts[0];
  for (const x of pts) { if (x.v < lo.v) lo = x; if (x.v > hi.v) hi = x; }
  const span = hi.v - lo.v;
  return {
    available: true,
    low: r2(lo.v, 4), lowDate: lo.date, high: r2(hi.v, 4), highDate: hi.date,
    observations: pts.length,
    positionPct: price != null && span > 0 ? r2((price - lo.v) / span * 100, 1) : null,
    aboveRange: price != null && price > hi.v,
    belowRange: price != null && price < lo.v,
  };
}

export function instrumentLabel(p) {
  const inst = classify(p.symbol);
  if (inst.type !== 'unknown') return inst.label;
  const comp = getComposition(p.symbol);
  if (comp?.category) return comp.category;
  return p.assetClass || 'Unclassified';
}

export function enrichedHoldings(valued, { priceFeed = {} } = {}) {
  const positions = valued.positions ?? [];
  if (!positions.length) {
    return refuse('No holdings yet. Add a position or import a statement to begin.', {
      source: 'holdings table', data: { rows: [], totals: { cash: valued.cash ?? 0, total: valued.total ?? 0, positions: 0 } },
    });
  }
  const txs = all('SELECT symbol, date, side, qty, price, fees FROM transactions ORDER BY date DESC');
  const since7 = Date.now() - 7 * DAY;
  const newsCounts = {};
  try {
    for (const p of positions) newsCounts[p.symbol] = getNews({ symbol: p.symbol, since: since7, limit: 50, sort: 'newest' }).length;
  } catch { /* news table optional */ }

  const rows = positions.map(p => {
    const bars = getBars(p.symbol);
    const closes = bars.map(b => b.adj_close ?? b.close).filter(Number.isFinite);
    const comp = getComposition(p.symbol);
    const ter = comp?.expenseRatio ?? null;          // stored in percent
    const venue = venueOf(p.symbol);
    const q = priceFeed[p.symbol];
    const missing = [];
    if (!p.hasPrice) missing.push('price');
    if (closes.length < 30) missing.push('history');
    if (ter == null) missing.push('expense ratio');
    if (p.targetPct == null) missing.push('target');
    return {
      id: p.id, symbol: p.symbol, name: p.name, exchange: p.exchange,
      type: instrumentLabel(p),
      qty: p.qty, avgCost: p.avgPrice, price: p.price, currency: p.currency,
      priceSource: p.priceSource, priceAsOf: p.priceAsOf,
      marketState: q?.marketState ?? null,
      value: p.value, cost: p.cost, weight: p.weight,
      pnl: p.hasPrice ? p.pnl : null, pnlPct: p.hasPrice ? p.pnlPct : null,
      dayPct: p.dayChangePct, dayGBP: p.dayChangeGBP,
      targetPct: p.targetPct ?? null,
      driftPp: p.targetPct != null && p.hasPrice ? r2(p.weight - p.targetPct, 2) : null,
      range52: range52(bars, p.price),
      closes30: closes.slice(-22),
      closes90: closes.slice(-66),
      trend30Pct: closes.length >= 22 ? r2((closes[closes.length - 1] / closes[closes.length - 22] - 1) * 100, 2) : null,
      expenseRatioPct: ter,
      feeDragGBP: ter != null && p.hasPrice ? r2(p.value * ter / 100) : null,
      newsCount7d: newsCounts[p.symbol] ?? null,
      sector: p.sector, geography: p.geography, assetClass: p.assetClass,
      region: venue.known ? venue.region : null, regionBasis: venue.known ? venue.source : venue.reason,
      wrapper: p.wrapper, account: p.account,
      transactions: txs.filter(t => t.symbol === p.symbol).slice(0, 12),
      coverage: { bars: closes.length, hasPrice: p.hasPrice, missing },
    };
  });

  const totalFee = rows.filter(r => r.feeDragGBP != null).reduce((a, r) => a + r.feeDragGBP, 0);
  const feeCovered = rows.filter(r => r.feeDragGBP != null).reduce((a, r) => a + (r.value ?? 0), 0);
  const up = positions.filter(p => (p.dayChangePct ?? 0) > 0).length;
  const down = positions.filter(p => (p.dayChangePct ?? 0) < 0).length;
  const flat = positions.filter(p => p.dayChangePct === 0).length;
  const noMove = positions.filter(p => p.dayChangePct == null).length;

  return ok({
    rows,
    totals: {
      value: valued.invested, cost: valued.cost, cash: valued.cash, total: valued.total,
      pnl: valued.pnl, pnlPct: valued.pnlPct,
      dayGBP: valued.dayChange, dayPct: valued.dayChangePct,
      positions: positions.length,
      up, down, flat, noMove,
      upWeight: r2(positions.filter(p => (p.dayChangePct ?? 0) > 0).reduce((a, p) => a + p.weight, 0), 2),
      downWeight: r2(positions.filter(p => (p.dayChangePct ?? 0) < 0).reduce((a, p) => a + p.weight, 0), 2),
      feeDragGBP: rows.some(r => r.feeDragGBP != null) ? r2(totalFee) : null,
      feeCoveragePct: valued.invested ? r2(feeCovered / valued.invested * 100, 1) : null,
    },
    excluded: valued.excluded ?? [],
    partial: !!valued.partial,
  }, {
    source: 'holdings table, live prices, stored bars, stored fund compositions, local news feed',
    basis: 'Live valuation at the latest polled prices; ranges and trends from stored daily closes.',
    coverage: {
      share: null,
      missing: (valued.excluded ?? []).map(e => ({ symbol: e.symbol, reason: e.reason })),
      note: valued.partial ? 'Unpriced holdings are listed but valued at nothing and excluded from totals.' : null,
    },
  });
}

// ─── B-23: allocation against targets ────────────────────────

export function targetsReport(valued) {
  const positions = valued.positions ?? [];
  if (!positions.length) return refuse('No holdings.', { source: 'holdings table' });
  const withT = positions.filter(p => p.targetPct != null);
  const without = positions.filter(p => p.targetPct == null);
  const targetSum = withT.reduce((a, p) => a + p.targetPct, 0);
  const rows = positions.map(p => ({
    symbol: p.symbol, name: p.name, type: instrumentLabel(p), sector: p.sector,
    weight: p.weight, targetPct: p.targetPct ?? null,
    driftPp: p.targetPct != null ? r2(p.weight - p.targetPct, 2) : null,
    // The pound move that would close the gap at today's total. A size, not a
    // recommendation: the trade list lives in Rebalance.
    gapGBP: p.targetPct != null ? r2((p.targetPct - p.weight) / 100 * valued.total) : null,
    status: p.targetPct == null ? 'no target' : Math.abs(p.weight - p.targetPct) <= 2 ? 'within 2pp'
      : p.weight > p.targetPct ? 'over' : 'under',
  }));
  const byClass = {};
  for (const r of rows) {
    const c = byClass[r.type] ?? { label: r.type, weight: 0, targetPct: 0, targeted: 0, count: 0 };
    c.weight += r.weight ?? 0; c.count++;
    if (r.targetPct != null) { c.targetPct += r.targetPct; c.targeted++; }
    byClass[r.type] = c;
  }
  if (!withT.length) {
    return refuse('No targets set. Set a target weight on a holding (Edit position) to see drift against it.',
      { source: 'holdings.target_pct', data: { rows, byClass: Object.values(byClass) } });
  }
  return ok({
    rows: rows.sort((a, b) => Math.abs(b.driftPp ?? 0) - Math.abs(a.driftPp ?? 0)),
    byClass: Object.values(byClass).map(c => ({ ...c, weight: r2(c.weight, 2), targetPct: c.targeted ? r2(c.targetPct, 2) : null, driftPp: c.targeted === c.count ? r2(c.weight - c.targetPct, 2) : null })),
    targetSumPct: r2(targetSum, 2),
    untargeted: without.map(p => p.symbol),
    maxDriftPp: r2(Math.max(0, ...rows.filter(r => r.driftPp != null).map(r => Math.abs(r.driftPp))), 2),
  }, {
    source: 'holdings.target_pct (entered by you); weights from live prices',
    basis: targetSum !== 100 ? `Targets sum to ${r2(targetSum, 2)}%, not 100% — cash and untargeted holdings make up the rest.` : 'Targets sum to 100%.',
    coverage: { share: r2(withT.reduce((a, p) => a + p.weight, 0) / 100, 4), missing: without.map(p => ({ symbol: p.symbol, reason: 'no target set' })) },
  });
}

// ─── B-24: cash breakdown ─────────────────────────────────────

function fxRate(ccy, prices) {
  if (ccy === 'GBP') return { rate: 1, pair: null };
  const gbpusd = prices['GBPUSD=X']?.price, eurusd = prices['EURUSD=X']?.price, usdjpy = prices['USDJPY=X']?.price;
  if (ccy === 'USD' && gbpusd) return { rate: 1 / gbpusd, pair: 'GBPUSD=X' };
  if (ccy === 'EUR' && gbpusd && eurusd) return { rate: eurusd / gbpusd, pair: 'EURUSD=X / GBPUSD=X' };
  if (ccy === 'JPY' && gbpusd && usdjpy) return { rate: 1 / usdjpy / gbpusd, pair: 'USDJPY=X / GBPUSD=X' };
  return { rate: null, pair: null };
}

export function cashReport(valued, prices, { lastFetch = null, mandate = null } = {}) {
  const rows = (valued.cashAccounts ?? []).map(c => {
    const fx = fxRate(c.currency, prices);
    const gbp = fx.rate != null ? c.amount * fx.rate : null;
    return {
      id: c.id, account: c.account, wrapper: c.wrapper, currency: c.currency,
      amount: c.amount, gbp: r2(gbp),
      fxRate: fx.rate != null ? r2(fx.rate, 6) : null, fxPair: fx.pair,
      fxAsOf: c.currency === 'GBP' ? null : lastFetch,
      fxStale: c.currency !== 'GBP' && (lastFetch == null || Date.now() - lastFetch > 30 * 60_000),
      fxMissing: fx.rate == null,
      updatedAt: c.updated_at,
      ageDays: c.updated_at ? Math.floor((Date.now() - c.updated_at) / DAY) : null,
    };
  });
  if (!rows.length) {
    return refuse('No cash balances recorded. Add one with the Cash tile (balances are entered by hand; nothing syncs them).',
      { source: 'cash table', data: { rows: [] } });
  }
  const group = key => {
    const m = {};
    for (const r of rows) { m[r[key]] = (m[r[key]] ?? 0) + (r.gbp ?? 0); }
    return Object.entries(m).map(([label, gbp]) => ({ label, gbp: r2(gbp), pct: valued.cash ? r2(gbp / valued.cash * 100, 2) : null }))
      .sort((a, b) => b.gbp - a.gbp);
  };
  const bufferPct = mandate?.cashBufferPct ?? null;
  const buffer = bufferPct != null ? valued.total * bufferPct / 100 : null;
  const oldest = Math.max(...rows.map(r => r.ageDays ?? 0));
  return ok({
    rows,
    total: valued.cash,
    shareOfBookPct: valued.total ? r2(valued.cash / valued.total * 100, 2) : null,
    byCurrency: group('currency'), byAccount: group('account'), byWrapper: group('wrapper'),
    buffer: bufferPct != null ? {
      pct: bufferPct, gbp: r2(buffer),
      deployable: r2(Math.max(0, valued.cash - buffer)),
      shortfall: valued.cash < buffer ? r2(buffer - valued.cash) : 0,
      source: `Mandate cash buffer (${mandate.riskLabel ?? 'current mandate'})`,
    } : null,
    oldestEditDays: oldest,
    fxMissing: rows.filter(r => r.fxMissing).map(r => r.currency),
  }, {
    source: 'cash table (entered by hand); FX from the live price feed',
    basis: 'Balances are only as current as their last edit — there is no sync.',
    note: oldest > 30 ? `The oldest balance was last edited ${oldest} days ago.` : null,
  });
}

// ─── Accounts (OV-22) ─────────────────────────────────────────

export function accountsReport(valued, prices = {}, { taxYear = null } = {}) {
  const positions = valued.positions ?? [];
  if (!positions.length && !(valued.cashAccounts ?? []).length) return refuse('No holdings or cash recorded.');
  const acc = {};
  const add = (account, wrapper, value, kind) => {
    const k = `${account}|${wrapper}`;
    const a = acc[k] ?? { account, wrapper, invested: 0, cash: 0, holdings: 0 };
    if (kind === 'cash') a.cash += value; else { a.invested += value; a.holdings++; }
    acc[k] = a;
  };
  for (const p of positions) add(p.account, p.wrapper, p.value ?? 0, 'holding');
  for (const c of valued.cashAccounts ?? []) {
    const fx = fxRate(c.currency, prices);
    add(c.account, c.wrapper ?? 'ISA', fx.rate != null ? c.amount * fx.rate : 0, 'cash');
  }
  const rows = Object.values(acc).map(a => ({
    ...a, invested: r2(a.invested), cash: r2(a.cash), total: r2(a.invested + a.cash),
    pct: valued.total ? r2((a.invested + a.cash) / valued.total * 100, 2) : null,
    wrapperLabel: WRAPPERS[a.wrapper]?.label ?? a.wrapper,
  })).sort((a, b) => b.total - a.total);
  const byWrapper = {};
  for (const r of rows) byWrapper[r.wrapper] = (byWrapper[r.wrapper] ?? 0) + r.total;
  const now = new Date();
  const tyStart = now.getUTCMonth() > 3 || (now.getUTCMonth() === 3 && now.getUTCDate() >= 6) ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const ty = taxYear ?? `${tyStart}/${String(tyStart + 1).slice(2)}`;
  return ok({
    rows,
    byWrapper: Object.entries(byWrapper).map(([wrapper, total]) => ({ wrapper, label: WRAPPERS[wrapper]?.label ?? wrapper, total: r2(total), pct: valued.total ? r2(total / valued.total * 100, 2) : null })),
    allowance: {
      available: false,
      taxYear: ty,
      isaLimit: WRAPPERS.ISA.annualLimit,
      reason: 'Allowance can\'t be worked out yet: contributions aren\'t recorded per account (the cash-flow ledger has no wrapper column).',
    },
  }, {
    source: 'holdings.account / holdings.wrapper and the cash table',
    basis: 'Cash in other currencies is converted at the live FX rate; a currency with no rate counts as nothing here and is named in the cash panel.',
    note: `ISA allowance constant £${WRAPPERS.ISA.annualLimit.toLocaleString('en-GB')} applies to tax year ${ty}. SIPP tax relief is not modelled.`,
  });
}

// ─── Watchlist strip (OV-21) ──────────────────────────────────

export function watchlistStrip(prices) {
  const rows = all('SELECT * FROM watchlist ORDER BY tier, symbol');
  if (!rows.length) return refuse('Nothing on the watchlist. Add symbols on the Watchlist page.', { source: 'watchlist table', data: { rows: [] } });
  const alerts = all("SELECT symbol, COUNT(*) n FROM alerts WHERE status = 'active' GROUP BY symbol");
  const aMap = Object.fromEntries(alerts.map(a => [a.symbol, a.n]));
  return ok({
    rows: rows.map(w => {
      const q = prices[w.symbol];
      const closes = getBars(w.symbol).slice(-22).map(b => b.adj_close ?? b.close).filter(Number.isFinite);
      return {
        id: w.id, symbol: w.symbol, tier: w.tier, note: w.note, target: w.target,
        price: q?.price ?? null, currency: q?.currency ?? null, dayPct: q?.changePct ?? null,
        name: q?.name ?? w.symbol,
        priceReason: q?.price == null ? 'No live quote for this symbol.' : null,
        spark: closes,
        activeAlerts: aMap[w.symbol] ?? 0,
        toTargetPct: w.target != null && q?.price ? r2((w.target / q.price - 1) * 100, 2) : null,
      };
    }),
  }, { source: 'watchlist table; live prices; stored bars' });
}

// ─── B-51: concentration arrays ───────────────────────────────

export function concentrationReport(valued, { mandate = null, lookThrough = null } = {}) {
  const positions = (valued.positions ?? []).filter(p => (p.value ?? 0) > 0);
  if (!positions.length) return refuse('No priced holdings.', { source: 'holdings table' });
  const invested = positions.reduce((a, p) => a + p.value, 0);
  const w = positions.map(p => ({ symbol: p.symbol, name: p.name, weight: p.value / valued.total, sector: p.sector })).sort((a, b) => b.weight - a.weight);
  const hhi = w.reduce((a, x) => a + x.weight ** 2, 0);
  let cum = 0;
  const pareto = w.map((x, i) => { cum += x.weight; return { rank: i + 1, symbol: x.symbol, name: x.name, weightPct: r2(x.weight * 100, 2), cumulativePct: r2(cum * 100, 2) }; });
  // Lorenz: holdings ascending, cumulative share of holdings vs cumulative weight.
  const asc = [...w].sort((a, b) => a.weight - b.weight);
  let c2 = 0;
  const investedShare = asc.reduce((a, x) => a + x.weight, 0);
  const lorenz = [{ x: 0, y: 0 }, ...asc.map((x, i) => { c2 += x.weight; return { x: r2((i + 1) / asc.length, 4), y: r2(c2 / investedShare, 4) }; })];
  const gini = (() => { let area = 0; for (let i = 1; i < lorenz.length; i++) area += (lorenz[i].x - lorenz[i - 1].x) * (lorenz[i].y + lorenz[i - 1].y) / 2; return r2(1 - 2 * area, 4); })();
  const topN = n => r2(w.slice(0, n).reduce((a, x) => a + x.weight, 0) * 100, 2);
  const sectors = {};
  for (const x of w) sectors[x.sector] = (sectors[x.sector] ?? 0) + x.weight;
  const maxSector = Object.entries(sectors).sort((a, b) => b[1] - a[1])[0];
  const caps = mandate ? { maxPositionPct: mandate.maxPositionPct, maxSectorPct: mandate.maxSectorPct, maxPositions: mandate.maxPositions, source: `Mandate: ${mandate.riskLabel ?? ''} ${mandate.horizonLabel ?? ''}`.trim() } : null;
  const breaches = [];
  if (caps) {
    for (const x of w) if (x.weight * 100 > caps.maxPositionPct) breaches.push({ kind: 'position', symbol: x.symbol, actualPct: r2(x.weight * 100, 2), capPct: caps.maxPositionPct });
    for (const [s, v] of Object.entries(sectors)) {
      if (s !== 'Unclassified' && v * 100 > caps.maxSectorPct) breaches.push({ kind: 'sector', label: s, actualPct: r2(v * 100, 2), capPct: caps.maxSectorPct });
    }
    if (positions.length > caps.maxPositions) breaches.push({ kind: 'count', actual: positions.length, cap: caps.maxPositions });
  }
  return ok({
    largest: { symbol: w[0].symbol, pct: r2(w[0].weight * 100, 2) },
    top1: topN(1), top3: topN(3), top5: topN(5), top10: topN(10),
    hhi: r2(hhi, 4),
    effectiveHoldings: hhi ? r2(1 / (hhi / (investedShare ** 2)), 2) : null,
    positionCount: positions.length,
    gini,
    pareto, lorenz,
    largestSector: maxSector ? { label: maxSector[0], pct: r2(maxSector[1] * 100, 2) } : null,
    caps, breaches,
    lookThroughUS: lookThrough ?? null,
    cashPct: valued.total ? r2(valued.cash / valued.total * 100, 2) : null,
  }, {
    source: 'Live position weights; caps from the saved mandate',
    basis: 'Weights are of the whole book including cash; effective holdings are computed over invested value only.',
    coverage: { share: valued.total ? r2(invested / valued.total, 4) : null, missing: (valued.excluded ?? []).map(e => ({ symbol: e.symbol, reason: e.reason })) },
    note: caps ? null : 'No mandate caps available, so no breach can be judged.',
  });
}
