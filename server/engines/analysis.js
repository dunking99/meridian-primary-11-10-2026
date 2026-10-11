// Meridian — thin adapters that put the existing analysis engines behind the
// panel contract. No engine is rewritten here: stress, correlation, X-ray,
// scorecard, rebalance, Monte Carlo and the risk profile each keep their own
// maths and tests. What this adds is the envelope (available / reason / source /
// basis / coverage), a few derived arrays the new views draw (a crisis path, a
// per-class impact, an overlap matrix), and — for the scorecard — the removal
// of the overall figure, which the project's rules do not allow on screen.

import { getBars } from '../db.js';
import { SCENARIOS, FACTORS } from '../config.js';
import * as A from './analytics.js';
import { runAllScenarios, shockTest } from './stress.js';
import { correlationReport } from './correlation.js';
import { correlationPairs, scorecard } from './portfolio-analysis.js';
import { xray } from './xray.js';
import { listCompositions, pairOverlap } from './rebuild/exposure.js';
import { rebalance, directContribution } from './rebalance.js';
import { simulate } from './montecarlo.js';
import { riskProfile } from './analyst.js';
import { instrumentLabel } from './holdings-data.js';
import { ok, refuse, r2 } from './contract.js';

const DAY = 86400_000;
const parse = s => Date.parse(`${String(s).slice(0, 10)}T00:00:00Z`);

// ─── AN-01 / AN-21: scenarios and crisis replay ───────────────

/**
 * The replayed path of today's book through one historical window: each
 * holding follows its own closes where it has them in the window, otherwise
 * the proxy's path scaled by the beta the stress engine estimated (and the
 * line is flagged as estimated). Values are indexed to 100 at the window start.
 */
function scenarioPath(scenario, lines, proxy) {
  const proxyBars = getBars(proxy, scenario.from, scenario.to).map(b => ({ date: b.date, v: b.close })).filter(b => b.v > 0);
  if (proxyBars.length < 2) return null;
  const p0 = proxyBars[0].v;
  const total = lines.reduce((a, l) => a + l.valueBefore, 0);
  const own = {};
  for (const l of lines) {
    if (l.method !== 'actual') continue;
    const bars = getBars(l.symbol, scenario.from, scenario.to).filter(b => b.close > 0);
    if (bars.length > 1) own[l.symbol] = { map: new Map(bars.map(b => [b.date, b.close])), first: bars[0].close, last: bars[0].close };
  }
  return proxyBars.map(pb => {
    let v = 0;
    for (const l of lines) {
      const o = own[l.symbol];
      let ratio;
      if (o) {
        const c = o.map.get(pb.date);
        if (c != null) o.last = c;
        ratio = o.last / o.first;
      } else {
        ratio = 1 + (l.beta ?? 1) * (pb.v / p0 - 1);
      }
      v += l.valueBefore * ratio;
    }
    return { date: pb.date, portfolio: r2(v / total * 100, 3), proxy: r2(pb.v / p0 * 100, 3) };
  });
}

/** Days after the window until the proxy regained its level at the window start. */
function proxyRecovery(scenario, proxy) {
  const start = getBars(proxy, scenario.from, scenario.from)[0]?.close ?? getBars(proxy, scenario.from, scenario.to)[0]?.close;
  if (!start) return null;
  const after = getBars(proxy, scenario.to, '2100-01-01');
  const hit = after.find(b => b.close >= start);
  return hit ? { date: hit.date, days: Math.round((parse(hit.date) - parse(scenario.to)) / DAY) } : { date: null, days: null, notYet: true };
}

export function scenarioLab(valued) {
  const priced = (valued.positions ?? []).filter(p => (p.value ?? 0) > 0);
  if (!priced.length) return refuse('No priced holdings to replay.', { source: 'stress.js' });
  const positions = priced.map(p => ({ symbol: p.symbol, value: p.value }));
  const all = runAllScenarios(positions, getBars);
  const byClass = new Map(priced.map(p => [p.symbol, instrumentLabel(p)]));
  const ccy = new Map(priced.map(p => [p.symbol, p.currency]));

  const scenarios = (all.results ?? []).map(r => {
    const def = SCENARIOS.find(s => s.id === r.scenario);
    const classes = {};
    for (const l of r.lines) {
      const k = byClass.get(l.symbol) ?? 'Unclassified';
      const c = classes[k] ?? { label: k, before: 0, pnl: 0 };
      c.before += l.valueBefore; c.pnl += l.pnl; classes[k] = c;
    }
    const held = r.lines.filter(l => l.pnl >= 0).map(l => l.symbol);
    // The stress engine treats a window with no stored proxy bars as a 0%
    // proxy move, so with no holding history either, its "0%" is not a
    // measurement. Such a window is reported as unmeasurable, not as no loss.
    const proxyBars = def ? getBars(FACTORS.usEquity, def.from, def.to).length : 0;
    const unmeasurable = r.coverage.actual === 0 && proxyBars < 2;
    return {
      unmeasurable,
      reason: unmeasurable ? `No stored bars for ${FACTORS.usEquity} or any holding between ${def?.from} and ${def?.to}, so this window cannot be replayed.` : null,
      id: r.scenario, label: r.label, window: r.window, note: r.note,
      from: def?.from, to: def?.to,
      portfolioPct: r.portfolioReturn, proxyPct: r.benchmarkReturn, relativePp: r.relativeToBenchmark,
      pnlGBP: r.pnl, valueAfter: r.valueAfter,
      lines: r.lines,
      coverage: r.coverage,
      estimatedShare: r2(r.lines.filter(l => l.method !== 'actual').reduce((a, l) => a + l.weight, 0) * 100, 1),
      perClass: Object.values(classes).map(c => ({ label: c.label, pnlGBP: r2(c.pnl), pct: c.before ? r2(c.pnl / c.before * 100, 2) : null })),
      heldUp: held,
      path: def ? scenarioPath(def, r.lines, FACTORS.usEquity) : null,
      recovery: def ? proxyRecovery(def, FACTORS.usEquity) : null,
    };
  });

  // Each holding's beta to the proxy, exactly as shockTest uses it, so a
  // slider can apply any market move client-side on the same linear model
  // (one position at a time: pnl / (value x shock) is its beta).
  const betas = positions.map(p => {
    const r = shockTest([p], [0.1], getBars)[0];
    return { symbol: p.symbol, value: p.value, beta: r && p.value ? r2(r.pnl / (p.value * 0.1), 4) : null, class: byClass.get(p.symbol) ?? 'Unclassified' };
  });

  const foreign = priced.filter(p => p.currency && p.currency !== 'GBP');
  const foreignValue = foreign.reduce((a, p) => a + p.value, 0);
  const measured = scenarios.filter(s => !s.unmeasurable);
  const worst = [...measured].sort((a, b) => a.portfolioPct - b.portfolioPct)[0] ?? null;
  if (!measured.length) {
    return refuse('None of the six crisis windows can be replayed: there are no stored bars for the proxy or any holding in any of them.', { source: 'stress.js', data: { scenarios } });
  }

  return ok({
    scenarios,
    worst: worst ? { id: worst.id, label: worst.label, pnlGBP: worst.pnlGBP, pct: worst.portfolioPct, recovery: worst.recovery } : null,
    averagePct: r2(measured.reduce((a, s) => a + s.portfolioPct, 0) / measured.length, 2),
    measuredCount: measured.length,
    proxy: FACTORS.usEquity,
    betas,
    total: r2(positions.reduce((a, p) => a + p.value, 0)),
    currency: {
      foreignSharePct: valued.total ? r2(foreignValue / valued.total * 100, 2) : null,
      byCurrency: Object.entries(foreign.reduce((m, p) => ({ ...m, [p.currency]: (m[p.currency] ?? 0) + p.value }), {}))
        .map(([c, v]) => ({ currency: c, gbp: r2(v), pct: valued.total ? r2(v / valued.total * 100, 2) : null })),
      // A 10% rise in sterling divides a foreign-priced value by 1.1.
      gbpUp10GBP: r2(-foreignValue * (1 - 1 / 1.1)),
      gbpDown10GBP: r2(foreignValue * (1 / 0.9 - 1)),
      basis: 'Trading currency of each holding\'s quote, not the currencies its underlying companies earn in. Hedged share classes are not identified.',
    },
  }, {
    source: 'stress.js replay of six historical windows (config.js SCENARIOS) against stored bars',
    basis: `Holdings with stored bars in a window use their own closes; the rest follow ${FACTORS.usEquity} scaled by an estimated beta (or beta 1 when too little overlap) and are flagged.`,
    coverage: { share: null, missing: [], note: 'Each scenario states how many holdings were replayed from their own history and how many were estimated.' },
  });
}

export function customShock(valued, shocks) {
  const positions = (valued.positions ?? []).filter(p => (p.value ?? 0) > 0).map(p => ({ symbol: p.symbol, value: p.value }));
  if (!positions.length) return refuse('No priced holdings.');
  const clean = (Array.isArray(shocks) ? shocks : [shocks]).map(Number).filter(x => Number.isFinite(x) && x > -1 && x < 1);
  if (!clean.length) return refuse('Give a market move between -100% and +100%.');
  return ok({ results: shockTest(positions, clean, getBars), proxy: FACTORS.usEquity }, {
    source: 'stress.js shockTest',
    basis: `Beta-based: each holding moves by its estimated beta to ${FACTORS.usEquity} times the shock. Relationships that break in a crisis are not modelled — this is a linear approximation.`,
  });
}

// ─── AN-03: correlation ───────────────────────────────────────

export function correlationView(valued, { window = '1y' } = {}) {
  const positions = (valued.positions ?? []).filter(p => (p.value ?? 0) > 0);
  const rep = correlationReport(positions, { window });
  if (!rep.available) return refuse(rep.reason, { source: 'correlation.js' });
  const pairs = correlationPairs(positions, { minObs: 60, limit: 5 });
  return ok({ ...rep, pairs }, {
    source: 'correlation.js on stored daily bars',
    basis: 'Daily returns joined on date. Insufficient overlap is null, never 0.',
    coverage: {
      share: rep.coverage?.holdings ? r2(rep.coverage.measurable / rep.coverage.holdings, 4) : null,
      missing: (rep.unassessable ?? []).map(s => ({ symbol: s, reason: 'not enough overlapping history with any other holding' })),
    },
  });
}

// ─── AN-04: look-through and overlap ──────────────────────────

export function overlapView(valued) {
  const positions = (valued.positions ?? []).filter(p => (p.value ?? 0) > 0);
  if (!positions.length) return refuse('No priced holdings.');
  const x = xray(positions, { top: 15 });
  const comps = listCompositions(positions.map(p => p.symbol));
  const funds = positions.filter(p => comps[p.symbol]?.holdings?.length);
  const matrix = [];
  for (let i = 0; i < funds.length; i++) {
    for (let j = i + 1; j < funds.length; j++) {
      const o = pairOverlap(funds[i].symbol, funds[j].symbol, { compositions: comps, minObs: 60 });
      matrix.push({
        a: funds[i].symbol, b: funds[j].symbol,
        overlapFloorPct: o.evidence?.holdings?.atLeast != null ? r2(o.evidence.holdings.atLeast * 100, 1) : null,
        correlation: o.evidence?.correlation?.available ? r2(o.evidence.correlation.correlation, 3) : null,
        verdict: o.verdict, explain: o.explain,
        combinedWeight: r2((funds[i].weight ?? 0) + (funds[j].weight ?? 0), 2),
      });
    }
  }
  return ok({ xray: x, funds: funds.map(f => f.symbol), matrix }, {
    source: 'Stored fund compositions (Yahoo top holdings) and stored bars',
    basis: 'Every look-through weight is a floor: funds publish roughly their top ten holdings, and disclosed weights are never scaled up.',
    coverage: {
      share: x.coverage?.seen ?? null,
      missing: (x.unseenPositions ?? []).map(u => ({ symbol: u.symbol, reason: u.note })),
    },
  });
}

// ─── AN-05 / OV-06: scorecard without a total ─────────────────

export function scorecardView(valued, { mandate = null, regime = null } = {}) {
  const sc = scorecard(valued.positions ?? [], { mandate, regime });
  if (!sc.available) return refuse(sc.reason ?? 'No axis could be measured.', { source: 'portfolio-analysis.js scorecard' });
  // D-03: the engine computes a blended overall; it is deliberately not sent.
  const { overall, overallBasis, ...rest } = sc;
  void overall; void overallBasis;
  return ok(rest, {
    source: 'portfolio-analysis.js scorecard — the same five components the Rebuild diligence stage uses',
    basis: 'Each axis is a value-weighted average over holdings that produced a reading; cash excluded. There is no overall grade.',
    coverage: {
      share: sc.scoredShare != null ? r2(sc.scoredShare / 100, 4) : null,
      missing: [...new Set(sc.axes.flatMap(a => (a.missing ?? []).map(m => m.symbol)))].map(s => ({ symbol: s, reason: 'missing from at least one axis' })),
    },
    asOf: Date.parse(sc.computedAt),
  });
}

// ─── AN-08: rebalance ─────────────────────────────────────────

export function rebalanceView(valued, { mode = 'full', contribution = 0, tolerance = 0.02 } = {}) {
  const priced = (valued.positions ?? []).filter(p => p.hasPrice);
  const targets = Object.fromEntries(priced.filter(p => p.targetPct != null).map(p => [p.symbol, p.targetPct / 100]));
  if (!Object.keys(targets).length) {
    return refuse('No targets set. Rebalancing moves the book back towards targets you have set; with none there is nothing to move towards.', { source: 'rebalance.js' });
  }
  const holdings = priced.map(p => ({ symbol: p.symbol, qty: p.qty, price: p.price, avgPrice: p.avgPrice, wrapper: p.wrapper, account: p.account, currency: p.currency }));
  if (mode === 'newmoney') {
    if (!(contribution > 0)) return refuse('New-money mode needs an amount to direct.', { source: 'rebalance.js directContribution' });
    const r = directContribution(holdings, targets, contribution, {});
    if (r.error) return refuse(r.error);
    return ok({ mode, ...r }, { source: 'rebalance.js directContribution', basis: 'Directs new money only; never sells. Advisory — nothing is written to your holdings.' });
  }
  const r = rebalance(holdings, targets, { contribution, cash: valued.cash, tolerance, minTradeValue: 50 });
  if (r.error) return refuse(r.error);
  return ok({ mode, ...r }, {
    source: 'rebalance.js (wrapper-aware: prefers ISA/SIPP sells, estimates CGT on GIA)',
    basis: `Acts only on holdings more than ${(tolerance * 100).toFixed(0)}pp from target. Advisory — nothing is written to your holdings, and there is no broker export.`,
  });
}

// ─── AN-13: goal-free Monte Carlo ─────────────────────────────

export function monteCarloView(points, { initial, years = 10, monthly = 0, paths = 3000 } = {}) {
  const returns = A.toReturns(points.map(p => p.value));
  if (returns.length < 252) {
    return refuse(`Projection resamples the portfolio's own daily returns and needs at least 252 (a year); the reconstruction has ${returns.length}.`, { source: 'montecarlo.js' });
  }
  const y = Math.min(Math.max(Number(years) || 10, 1), 40);
  const m = Math.max(0, Number(monthly) || 0);
  const sim = simulate({ initial, monthly: m, years: y, returns, mode: 'blockBootstrap', paths: Math.min(paths, 5000), inflation: 0.025, seed: 12345 });
  if (sim.error) return refuse(sim.error);
  const { finals, ...rest } = sim;
  void finals;
  return ok({ ...rest, years: y, monthly: m, initial: r2(initial), returnsUsed: returns.length }, {
    source: 'montecarlo.js block bootstrap over the reconstructed daily returns',
    basis: 'Resamples 21-day blocks of this book\'s own past; no return or volatility is assumed. Real terms use 2.5% inflation. A described sample, not a forecast.',
  });
}

// ─── AN-12 / AN-15: risk figures and contributions ────────────

export function riskView(prices, { lookback = 750 } = {}) {
  const r = riskProfile(prices, { lookback });
  if (r.error) return refuse(r.error, { source: 'analyst.js riskProfile' });
  const sumPct = r.riskContributions.reduce((a, x) => a + x.pctOfRisk, 0);
  return ok({ ...r, riskContributionSumPct: r2(sumPct, 2) }, {
    source: 'analyst.js riskProfile over stored bars',
    basis: `Daily returns over up to ${lookback} bars, holdings weighted by today's value. VaR historical, parametric and Cornish-Fisher. Beta here is the Risk page's figure against ^GSPC, aligned by position rather than joined on date; the Performance page's beta is date-joined and is the one to trust where they differ.`,
    coverage: {
      share: r.coverage?.total ? r2(r.coverage.analysed / r.coverage.total, 4) : null,
      missing: (r.coverage?.excluded ?? []).map(s => ({ symbol: s, reason: 'fewer than 30 stored bars' })),
    },
    asOf: Date.parse(r.asOf),
  });
}
