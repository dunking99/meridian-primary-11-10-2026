// Meridian — one read for the Overview page.
//
// Each block is built inside its own guard: one engine failing costs that
// block (available:false with the reason) and nothing else, and the response
// is never a 500. The blocks reuse the same functions the individual routes
// call, so a figure on the Overview and the same figure on Holdings or
// Performance cannot disagree.

import { GBP_BENCHMARK } from '../config.js';
import { reconstructedReturn } from './portfolio-analysis.js';
import { listFlows } from './performance.js';
import { loadMandate } from './rebuild/mandate.js';
import { buildBriefing } from './briefing.js';
import { portfolioPoints, performanceSeries, periodReturns, riskAdjusted, RECONSTRUCTED_BASIS } from './series.js';
import { holdingReturns, cashReport, accountsReport, watchlistStrip, concentrationReport } from './holdings-data.js';
import { compositionTree } from './composition.js';
import { bookCalendar, bookNews, briefingDigest } from './book-feed.js';
import { scorecardView, riskView } from './analysis.js';
import { loadGoal } from './goal.js';
import { ok, refuse, r2 } from './contract.js';

function guarded(name, fn, failBlock) {
  try {
    if (failBlock === name) throw new Error(`forced failure in ${name} (test hook)`);
    return fn();
  } catch (e) {
    return refuse(`This block failed to build: ${e?.message ?? e}`);
  }
}

export function heroBlock(valued, prices, { points, lastFetch, benchmark = GBP_BENCHMARK }) {
  const pos = valued.positions ?? [];
  if (!pos.length && !valued.cash) {
    return refuse('No holdings or cash recorded yet. Add a position, import a statement or record cash to begin.', { source: 'holdings table' });
  }
  const up = pos.filter(p => (p.dayChangePct ?? 0) > 0).length;
  const down = pos.filter(p => (p.dayChangePct ?? 0) < 0).length;
  const flat = pos.filter(p => p.dayChangePct === 0).length;
  const unknown = pos.filter(p => p.dayChangePct == null).length;
  const bq = prices[benchmark];
  let peak = null;
  if (points.length) {
    let pk = points[0];
    for (const p of points) if (p.value > pk.value) pk = p;
    const last = points[points.length - 1];
    peak = { value: r2(pk.value), date: pk.date, distancePct: r2((last.value / pk.value - 1) * 100, 2), basis: 'reconstructed, invested holdings only' };
  }
  // A sentence is only emitted when every number in it exists.
  const parts = [];
  if (valued.total > 0) parts.push(`The book is worth £${Math.round(valued.total).toLocaleString('en-GB')}`);
  if (valued.dayChangePct != null && pos.some(p => p.dayChangePct != null)) {
    parts.push(`${valued.dayChange >= 0 ? 'up' : 'down'} ${Math.abs(valued.dayChangePct).toFixed(2)}% today`);
  }
  const sentence = parts.length ? parts.join(', ') + '.' : null;
  return ok({
    total: valued.total, invested: valued.invested, cash: valued.cash, cost: valued.cost,
    pnl: valued.pnl, pnlPct: valued.pnlPct,
    dayChange: valued.dayChange, dayChangePct: valued.dayChangePct,
    positions: pos.length, up, down, flat, unknown,
    partial: !!valued.partial, excluded: valued.excluded ?? [],
    benchmarkDay: bq?.changePct != null ? { symbol: benchmark, pct: bq.changePct } : { symbol: benchmark, pct: null, reason: `No live quote for ${benchmark}.` },
    peak,
    spark: points.slice(-40).map(p => ({ date: p.date, value: r2(p.value) })),
    sentence,
    lastFetch,
  }, {
    source: 'Live prices (previous-close day change) and the holdings table',
    basis: 'Live valuation. Day change is measured against the previous close.',
    coverage: { share: null, missing: (valued.excluded ?? []).map(e => ({ symbol: e.symbol, reason: e.reason })) },
    asOf: lastFetch ?? Date.now(),
  });
}

export function dayContributionBlock(valued, { lastFetch, marketState = null, prices = {} }) {
  const pos = valued.positions ?? [];
  if (!pos.length) return refuse('No holdings.');
  const rows = pos.filter(p => p.dayChangeGBP != null).map(p => ({
    symbol: p.symbol, name: p.name, gbp: p.dayChangeGBP, pct: p.dayChangePct, weight: p.weight,
    price: p.price, prev: prices[p.symbol]?.prev ?? null,
    dayLow: prices[p.symbol]?.dayLow ?? null, dayHigh: prices[p.symbol]?.dayHigh ?? null,
  })).sort((a, b) => b.gbp - a.gbp);
  const excluded = pos.filter(p => p.dayChangeGBP == null).map(p => ({ symbol: p.symbol, reason: p.hasPrice ? 'No day change in the quote.' : 'No price.' }));
  const net = +rows.reduce((a, r) => a + r.gbp, 0).toFixed(2);
  return ok({
    rows, net, headline: valued.dayChange, reconciles: Math.abs(net - valued.dayChange) < 0.005,
    excluded,
    zeroDay: rows.length > 0 && rows.every(r => r.gbp === 0),
    marketState,
  }, {
    source: 'Live quotes: each holding\'s change against its previous close',
    basis: 'Pound change = today\'s value x pct / (100 + pct). The bars sum to the headline day change exactly.',
    coverage: { share: null, missing: excluded },
    asOf: lastFetch ?? Date.now(),
  });
}

export function topHoldingsBlock(valued, { n = 8, risk = null }) {
  const pos = (valued.positions ?? []).filter(p => p.hasPrice);
  if (!pos.length) return refuse('No priced holdings.');
  const riskBy = new Map((risk?.available ? risk.data.riskContributions : []).map(r => [r.symbol, r.pctOfRisk]));
  let cum = 0;
  const rows = pos.slice(0, n).map(p => {
    cum += p.weight;
    return {
      symbol: p.symbol, name: p.name, weight: p.weight, cumulative: r2(cum, 2), value: p.value, price: p.price, currency: p.currency,
      dayPct: p.dayChangePct, dayGBP: p.dayChangeGBP, pnl: p.pnl, pnlPct: p.pnlPct, targetPct: p.targetPct ?? null,
      riskSharePct: riskBy.has(p.symbol) ? riskBy.get(p.symbol) : null,
    };
  });
  return ok({
    rows, total: pos.length, n,
    topWeight: r2(cum, 2),
    topValue: r2(rows.reduce((a, r) => a + r.value, 0)),
    topDayGBP: r2(rows.reduce((a, r) => a + (r.dayGBP ?? 0), 0)),
    topPnl: r2(rows.reduce((a, r) => a + (r.pnl ?? 0), 0)),
    topRiskShare: rows.every(r => r.riskSharePct != null) ? r2(rows.reduce((a, r) => a + r.riskSharePct, 0), 2) : null,
    riskReason: risk?.available ? null : (risk?.reason ?? 'Risk contributions unavailable.'),
  }, {
    source: 'Live valuation; risk share from the risk engine\'s Euler contributions',
    basis: 'Cash is excluded from the ranking. Weight is of the whole book including cash.',
  });
}

export function statTilesBlock(valued, { points, periods, riskAdj, mandate }) {
  if (!(valued.positions ?? []).length && !valued.cash) {
    return refuse('No holdings or cash recorded yet, so there is nothing to summarise.', { source: 'holdings table' });
  }
  if (!(valued.positions ?? []).some(p => p.hasPrice) && !valued.cash) {
    return refuse('No holding has a live price yet, so no figure can be given.', { source: 'live prices' });
  }
  const tr = reconstructedReturn({ series: points, excluded: [] });
  const flows = listFlows();
  const deposited = flows.filter(f => f.amount > 0).reduce((a, f) => a + f.amount, 0);
  const withdrawn = flows.filter(f => f.amount < 0).reduce((a, f) => a + f.amount, 0);
  const ytd = periods?.available ? periods.data.rows.find(r => r.period === 'YTD') : null;
  return ok({
    totalReturn: tr.available
      ? { available: true, pct: tr.totalPct, annualisedPct: tr.annualisedPct, from: tr.from, years: tr.years, basis: 'reconstructed' }
      : { available: false, reason: tr.reason },
    netGain: {
      available: true, pnl: valued.pnl, pnlPct: valued.pnlPct, cost: valued.cost,
      deposited: flows.length ? r2(deposited + withdrawn) : null,
      gainOnDeposited: flows.length ? r2(valued.total - (deposited + withdrawn)) : null,
      depositedReason: flows.length ? null : 'Deposits are not recorded, so gain is shown against cost, not money paid in.',
    },
    ytd: ytd?.available
      ? { available: true, pct: ytd.portfolio, benchmarkPct: ytd.benchmark, excessPp: ytd.excessPp, from: ytd.from }
      : { available: false, reason: ytd?.reason ?? periods?.reason ?? 'No history.' },
    income: { available: false, reason: 'Income isn\'t tracked yet. It needs a record of dividends received.' },
    cash: {
      available: true, gbp: valued.cash, pct: valued.total ? r2(valued.cash / valued.total * 100, 2) : null,
      bufferPct: mandate?.cashBufferPct ?? null,
      bufferSource: mandate ? `Mandate (${mandate.riskLabel})` : null,
    },
    risk: riskAdj?.available
      ? { available: true, beta: riskAdj.data.beta, volPct: riskAdj.data.volPct, benchmarkVolPct: riskAdj.data.benchmarkVolPct, betaReason: riskAdj.data.betaReason, window: riskAdj.data.window, benchmark: riskAdj.data.benchmark }
      : { available: false, reason: riskAdj?.reason ?? 'No history.' },
  }, {
    source: 'Reconstructed series, cash-flow ledger, mandate, live valuation',
    basis: RECONSTRUCTED_BASIS,
  });
}

/**
 * The whole page in one read. `ctx` carries server state and the functions
 * that need it; `failBlock` names a block to force to fail (tests only — the
 * route never passes it).
 */
export const BLOCKS = ['hero', 'stats', 'series', 'periods', 'health', 'leaders', 'day', 'composition', 'top', 'calendar', 'news', 'briefing', 'concentration', 'watchlist', 'accounts', 'cash', 'goal'];

export function buildOverview(ctx, { benchmark = GBP_BENCHMARK, failBlock = null, only = null } = {}) {
  const { prices, valued, lastFetch, cacheKey, recentlyFired = [], dataVersion = null } = ctx;
  // Shared inputs are computed lazily, so a request for one block (the page's
  // panels each ask for their own) does not pay for the others.
  const memo = {};
  const lazy = (k, fn) => () => (k in memo ? memo[k] : (memo[k] = fn()));
  const points = lazy('points', () => guarded('series-points', () => portfolioPoints(prices, { cacheKey }), failBlock)?.points ?? []);
  const mandate = lazy('mandate', () => { try { return loadMandate(); } catch { return null; } });
  const periods = lazy('periods', () => guarded('periods', () => periodReturns(prices, { benchmark, cacheKey }), failBlock));
  const riskAdj = lazy('riskAdj', () => guarded('riskAdj', () => riskAdjusted(prices, { benchmark, window: '1Y', cacheKey }), failBlock));
  const risk = lazy('risk', () => guarded('risk', () => riskView(prices), failBlock));

  const builders = {
    hero: () => guarded('hero', () => heroBlock(valued, prices, { points: points(), lastFetch, benchmark }), failBlock),
    stats: () => guarded('stats', () => statTilesBlock(valued, { points: points(), periods: periods(), riskAdj: riskAdj(), mandate: mandate() }), failBlock),
    series: () => guarded('series', () => performanceSeries(prices, { benchmark, range: '1Y', cacheKey }), failBlock),
    periods: () => periods(),
    health: () => guarded('health', () => scorecardView(valued, { mandate: mandate() }), failBlock),
    leaders: () => guarded('leaders', () => holdingReturns(prices, valued, { benchmark }), failBlock),
    day: () => guarded('day', () => dayContributionBlock(valued, { lastFetch, marketState: prices[GBP_BENCHMARK]?.marketState ?? null, prices }), failBlock),
    composition: () => guarded('composition', () => compositionTree(valued, { lens: 'class', includeCash: true }), failBlock),
    top: () => guarded('top', () => topHoldingsBlock(valued, { n: 8, risk: risk() }), failBlock),
    calendar: () => guarded('calendar', () => bookCalendar(valued, { days: 30 }), failBlock),
    news: () => guarded('news', () => bookNews(valued, { hours: 72 }), failBlock),
    briefing: () => guarded('briefing', () => briefingDigest(buildBriefing(prices, { recentlyFired })), failBlock),
    concentration: () => guarded('concentration', () => concentrationReport(valued, { mandate: mandate() }), failBlock),
    watchlist: () => guarded('watchlist', () => watchlistStrip(prices), failBlock),
    accounts: () => guarded('accounts', () => accountsReport(valued, prices), failBlock),
    cash: () => guarded('cash', () => cashReport(valued, prices, { lastFetch, mandate: mandate() }), failBlock),
    goal: () => guarded('goal', () => {
      const g = loadGoal();
      return g ? ok({ goal: g }, { source: 'settings: user_goal', note: 'Evaluated on request at /goal.' })
        : refuse('No goal set. Set a target and date to see progress.', { source: 'settings: user_goal' });
    }, failBlock),
  };
  const wanted = only?.length ? BLOCKS.filter(b => only.includes(b)) : BLOCKS;
  const blocks = Object.fromEntries(wanted.map(b => [b, builders[b]()]));

  return {
    available: true,
    asOf: Date.now(),
    source: 'Aggregate of the Portfolio engines',
    dataVersion,
    benchmark,
    blocks,
    failed: Object.entries(blocks).filter(([, b]) => b?.available === false && String(b.reason).startsWith('This block failed')).map(([k]) => k),
  };
}
