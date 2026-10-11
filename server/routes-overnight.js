// Meridian — routes for the Portfolio Overview / Holdings / Performance /
// Analysis pages.
//
// Kept in their own file and merged into server/index.js's route table, so
// the new surface is readable in one place. Every route returns the panel
// contract ({ available, reason, asOf, source, basis, coverage, data }) and is
// safe on an empty database: a refusal, never a 500.

import { all, getSnapshots } from './db.js';
import { GBP_BENCHMARK, BENCHMARKS } from './config.js';
import * as pf from './engines/portfolio.js';
import * as performance from './engines/performance.js';
import * as mandateModel from './engines/rebuild/mandate.js';
import * as regimeModel from './engines/rebuild/regime.js';
import { buildBriefing } from './engines/briefing.js';
import * as series from './engines/series.js';
import * as hd from './engines/holdings-data.js';
import * as comp from './engines/composition.js';
import * as feed from './engines/book-feed.js';
import * as goal from './engines/goal.js';
import * as an from './engines/analysis.js';
import { buildOverview } from './engines/overview.js';
import { ok, refuse } from './engines/contract.js';

/**
 * Which data-version part a write touches. Hooks on the page declare the parts
 * they depend on, so a price tick refetches price-dependent panels and leaves
 * the calendar and news alone.
 */
export function versionPartFor(method, path) {
  if (method === 'GET') return null;
  if (path.startsWith('/holdings') || path.startsWith('/cash') || path.startsWith('/transactions') || path.startsWith('/import/apply')) return 'book';
  if (path.startsWith('/performance/flows')) return 'flows';
  if (path.startsWith('/goal')) return 'goal';
  if (path.startsWith('/sync') || path.startsWith('/integrity/repair')) return 'bars';
  if (path.startsWith('/calendar')) return 'calendar';
  if (path.startsWith('/news')) return 'news';
  if (path.startsWith('/watchlist') || path.startsWith('/alerts') || path.startsWith('/signals')) return 'watch';
  if (path.startsWith('/briefing')) return 'briefing';
  if (path.startsWith('/rebuild/mandate')) return 'book';
  if (path.startsWith('/rebuild/compositions')) return 'bars';
  return null;
}

export function overnightRoutes(ctx) {
  const { state, versions, refreshPrices } = ctx;
  const valued = () => pf.valuePortfolio(state.prices);
  const cacheKey = () => `${versions.book}.${versions.bars}.${versions.prices}`;
  const bench = q => q.benchmark || GBP_BENCHMARK;
  const mandate = () => { try { return mandateModel.loadMandate(); } catch { return null; } };

  const routes = {
    'GET /data-version': () => ({ dataVersion: ctx.dataVersion(), versions: { ...versions }, lastFetch: state.lastFetch }),

    // ── performance ───────────────────────────────────────────
    'GET /performance/benchmarks': () => ok({ benchmarks: BENCHMARKS, default: GBP_BENCHMARK }, { source: 'server/config.js BENCHMARKS' }),
    'GET /performance/series': q => series.performanceSeries(state.prices, { benchmark: bench(q), range: q.range || '1Y', basis: q.basis === 'recorded' ? 'recorded' : 'reconstructed', cacheKey: cacheKey(), from: q.from || null, to: q.to || null }),
    'GET /performance/contribution': q => series.contributionOverTime(pf.reconstructHistoryByHolding(state.prices, 800), { months: Math.min(Number(q.months) || 12, 60) }),
    'GET /performance/periods': q => series.periodReturns(state.prices, { benchmark: bench(q), cacheKey: cacheKey() }),
    'GET /performance/calendar': q => series.calendarReturns(state.prices, { benchmark: bench(q), cacheKey: cacheKey() }),
    'GET /performance/drawdowns': q => series.drawdowns(state.prices, { benchmark: bench(q), cacheKey: cacheKey(), minDepth: q.minDepth ? Number(q.minDepth) / 100 : 0.01 }),
    'GET /performance/risk': q => series.riskAdjusted(state.prices, { benchmark: bench(q), window: q.window || '1Y', cacheKey: cacheKey() }),
    'GET /performance/capture': q => series.captureStats(state.prices, { benchmark: bench(q), window: q.window || 'max', cacheKey: cacheKey() }),
    'GET /performance/bridge': () => {
      const v = valued();
      const rep = performance.performanceReport(v.total, getSnapshots());
      const b = series.valueBridge({ currentValue: v.total, flows: performance.listFlows(), fees: series.tradingFeesRecorded() });
      const timing = {
        moneyWeighted: rep.moneyWeighted, timeWeighted: rep.timeWeighted, timing: rep.timing, versusBenchmark: rep.versusBenchmark,
      };
      return b.available ? { ...b, data: { ...b.data, ...timing } } : { ...b, data: timing };
    },
    'GET /performance/summary': q => {
      const v = valued();
      const rep = performance.performanceReport(v.total, getSnapshots(), { benchmark: bench(q) });
      const periods = series.periodReturns(state.prices, { benchmark: bench(q), cacheKey: cacheKey() });
      const risk1y = series.riskAdjusted(state.prices, { benchmark: bench(q), window: '1Y', cacheKey: cacheKey() });
      const dd = series.drawdowns(state.prices, { benchmark: bench(q), cacheKey: cacheKey() });
      const cal = series.calendarReturns(state.prices, { benchmark: bench(q), cacheKey: cacheKey() });
      return ok({ performance: rep, periods, risk: risk1y, drawdowns: dd.available ? { stats: dd.data.stats } : dd, calendar: cal.available ? { months: cal.data.months } : cal }, {
        source: 'performance.js (ledger + snapshots) and the reconstructed series',
        basis: 'Money- and time-weighted returns come from the ledger and snapshots; everything else from the reconstruction.',
      });
    },

    // ── holdings ──────────────────────────────────────────────
    'GET /portfolio/returns': q => hd.holdingReturns(state.prices, valued(), {
      windows: q.windows ? String(q.windows).split(',').filter(w => hd.RETURN_WINDOWS.includes(w)) : hd.RETURN_WINDOWS,
      benchmark: bench(q),
    }),
    'GET /portfolio/composition': q => comp.compositionTree(valued(), { lens: q.lens || 'sector', includeCash: q.includeCash !== '0' }),
    'GET /portfolio/labels/check': () => comp.labelCheck(all('SELECT * FROM holdings ORDER BY symbol')),
    'GET /portfolio/holdings/enriched': () => hd.enrichedHoldings(valued(), { priceFeed: state.prices }),
    'GET /portfolio/targets': () => hd.targetsReport(valued()),
    'GET /portfolio/cash': () => {
      const m = mandate();
      return hd.cashReport(valued(), state.prices, { lastFetch: state.lastFetch, mandate: m });
    },
    'GET /portfolio/accounts': () => hd.accountsReport(valued(), state.prices),
    'GET /portfolio/concentration': () => hd.concentrationReport(valued(), { mandate: mandate() }),
    'GET /watchlist/strip': () => hd.watchlistStrip(state.prices),

    // ── feeds joined to the book ──────────────────────────────
    'GET /calendar/book': q => feed.bookCalendar(valued(), { days: Math.min(Number(q.days) || 30, 120) }),
    'GET /news/book': q => feed.bookNews(valued(), { hours: Math.min(Number(q.hours) || 72, 336), limit: Math.min(Number(q.limit) || 12, 40) }),
    'GET /briefing/digest': q => feed.briefingDigest(buildBriefing(state.prices, { recentlyFired: state.fired }), { top: Math.min(Number(q.top) || 5, 20) }),

    // ── goal (replaces the invented-input POST /goal) ─────────
    'GET /goal': () => {
      const g = goal.loadGoal();
      const pts = series.portfolioPoints(state.prices, { cacheKey: cacheKey() }).points;
      return goal.evaluateGoal(g, { returns: goal.returnsFromPoints(pts), initial: valued().total });
    },
    'POST /goal': body => {
      const saved = goal.saveGoal(body ?? {});
      if (!saved.ok) return refuse(saved.errors.join(' '), { source: 'settings: user_goal', data: { errors: saved.errors } });
      const pts = series.portfolioPoints(state.prices, { cacheKey: cacheKey() }).points;
      return goal.evaluateGoal(saved.goal, { returns: goal.returnsFromPoints(pts), initial: valued().total });
    },
    'DELETE /goal': () => goal.clearGoal(),

    // ── analysis ──────────────────────────────────────────────
    'GET /analysis/scenarios': () => an.scenarioLab(valued()),
    'POST /analysis/shock': body => an.customShock(valued(), body?.shocks ?? body?.shock ?? []),
    'GET /analysis/correlation': q => an.correlationView(valued(), { window: q.window || '1y' }),
    'GET /analysis/overlap': () => an.overlapView(valued()),
    'GET /analysis/scorecard': () => {
      const m = mandate();
      let regime = null;
      try { regime = regimeModel.readRegime(state.prices, m); } catch { regime = null; }
      return an.scorecardView(valued(), { mandate: m, regime });
    },
    'GET /analysis/rebalance': q => an.rebalanceView(valued(), {
      mode: q.mode === 'newmoney' ? 'newmoney' : 'full',
      contribution: Math.max(0, Number(q.contribution) || 0),
      tolerance: q.tolerance ? Number(q.tolerance) / 100 : 0.02,
    }),
    'GET /analysis/montecarlo': q => an.monteCarloView(series.portfolioPoints(state.prices, { cacheKey: cacheKey() }).points, {
      initial: valued().total, years: Number(q.years) || 10, monthly: Number(q.monthly) || 0,
    }),
    'GET /analysis/risk': () => an.riskView(state.prices),

    // ── the Overview in one read ──────────────────────────────
    'GET /overview': q => buildOverview({
      prices: state.prices, valued: valued(), lastFetch: state.lastFetch, cacheKey: cacheKey(),
      recentlyFired: state.fired, dataVersion: ctx.dataVersion(),
    }, { benchmark: bench(q), only: q.blocks ? String(q.blocks).split(',') : null }),
  };

  // Test-only: re-read the fixture price file now instead of waiting for the
  // 60-second poll. Registered only when the server was started against a
  // fixture, so it cannot exist on a real install.
  if (process.env.MERIDIAN_PRICE_FIXTURE) {
    routes['POST /dev/prices/refresh'] = async () => { await refreshPrices(); return { ok: true, dataVersion: ctx.dataVersion() }; };
  }
  return routes;
}
