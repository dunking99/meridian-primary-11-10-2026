// Meridian — the user's goal, and how the portfolio's own history bears on it.
//
// The route this replaces called a Gaussian model with inputs nobody entered:
// a £100,000 target, 7% a year and 15% volatility. Every one of those numbers
// was a guess dressed as a result. Here nothing is defaulted:
//
//   - target, date and monthly contribution are what the user saved, or there
//     is no goal and the answer says so;
//   - returns are the portfolio's own reconstructed daily returns, resampled
//     in blocks (as /montecarlo does), never an assumed mean and spread;
//   - too little history is a refusal, not a smaller sample quietly used.
//
// The output is a described sample of what this book's past would produce
// over the horizon if replayed in random blocks — not a forecast.

import { getSetting, setSetting, run } from '../db.js';
import { goalProbability } from './montecarlo.js';
import * as A from './analytics.js';
import { ok, refuse, r2 } from './contract.js';

const KEY = 'user_goal';
export const MIN_RETURNS = 252;
export const METHOD =
  'Block bootstrap: 21-day blocks of this portfolio\'s own reconstructed daily returns, resampled into '
  + '4,000 paths, with your monthly contribution added at each month end. No return or volatility is assumed. '
  + 'It is a described sample of what this book\'s past would produce if replayed in random order — not a forecast.';

export function loadGoal() {
  const g = getSetting(KEY, null);
  return g && typeof g === 'object' && g.target > 0 ? g : null;
}

export function clearGoal() {
  run('DELETE FROM settings WHERE key = ?', KEY);
  return { ok: true };
}

/** Validate and persist. Every field is required; nothing is filled in. */
export function saveGoal({ target, targetDate, monthly, label = null } = {}, { now = Date.now() } = {}) {
  const t = Number(target), m = Number(monthly);
  const d = Date.parse(`${String(targetDate ?? '').slice(0, 10)}T00:00:00Z`);
  const errors = [];
  if (!(t > 0)) errors.push('A target amount above zero is required.');
  if (!Number.isFinite(d)) errors.push('A target date (YYYY-MM-DD) is required.');
  else if (d <= now + 30 * 86400_000) errors.push('The target date must be at least a month away.');
  if (monthly === undefined || monthly === null || monthly === '' || !Number.isFinite(m) || m < 0) {
    errors.push('A monthly contribution is required — enter 0 if there is none.');
  }
  if (errors.length) return { ok: false, errors };
  const existing = loadGoal();
  const goal = {
    target: +t.toFixed(2), targetDate: new Date(d).toISOString().slice(0, 10), monthly: +m.toFixed(2),
    label: label ? String(label).slice(0, 80) : null,
    createdAt: existing?.createdAt ?? now, updatedAt: now,
  };
  setSetting(KEY, goal);
  return { ok: true, goal };
}

/**
 * Evaluate a goal against a return series.
 *
 * `returns` are daily fractional returns from the portfolio's own history;
 * `initial` is today's value. Separated from the route so it can be tested
 * against a series whose answer is known in closed form.
 */
export function evaluateGoal(goal, { returns, initial, now = Date.now(), paths = 4000, seed = 12345 } = {}) {
  if (!goal) {
    return refuse('No goal set', { source: 'settings: user_goal' });
  }
  const clean = (returns ?? []).filter(Number.isFinite);
  if (clean.length < MIN_RETURNS) {
    return refuse(`The simulation resamples the portfolio's own daily returns and needs at least ${MIN_RETURNS} of them (about a year); the reconstruction has ${clean.length}.`,
      { source: 'Reconstructed portfolio history', data: { goal } });
  }
  if (!(initial >= 0)) return refuse('The portfolio has no current value to start from.', { data: { goal } });

  const years = (Date.parse(`${goal.targetDate}T00:00:00Z`) - now) / (365.25 * 86400_000);
  if (!(years > 1 / 12)) return refuse('The target date has passed or is under a month away. Edit the goal.', { data: { goal } });

  const res = goalProbability({
    target: goal.target, initial, monthly: goal.monthly, years,
    returns: clean, mode: 'blockBootstrap', paths, seed, inflation: 0,
  });
  if (res.error) return refuse(res.error, { data: { goal } });

  const bands = (res.simulation?.bands ?? []).map(b => ({ year: b.year, p5: b.p5, p25: b.p25, p50: b.p50, p75: b.p75, p95: b.p95 }));
  return ok({
    goal,
    years: r2(years, 2),
    initial: r2(initial),
    probabilityPct: res.probability,
    median: res.median,
    medianShortfall: res.shortfallMedian > 0 ? res.shortfallMedian : 0,
    medianSurplus: res.surplusMedian,
    requiredMonthlyForFiftyPct: res.requiredMonthlyForFiftyPct,
    contributed: res.simulation?.contributed ?? null,
    outcomes: res.simulation?.outcomes ?? null,
    bands,
    progressPct: goal.target > 0 ? r2(initial / goal.target * 100, 2) : null,
    returnsUsed: clean.length,
    historyAnnualisedPct: r2((Math.pow(clean.reduce((a, r) => a * (1 + r), 1), 252 / clean.length) - 1) * 100, 2),
    historyVolPct: r2(A.annualisedVol(clean) * 100, 2),
    pathsSimulated: res.pathsSimulated,
    method: METHOD,
  }, {
    source: 'Your saved goal; the portfolio\'s own reconstructed daily returns',
    basis: 'Reconstructed history (fixed weights, cash excluded) resampled in blocks. Nominal pounds; inflation not applied.',
    note: 'A described sample, not a forecast. The required monthly amount is solved on 300 paths per step, so it carries simulation noise.',
  });
}

/** Daily returns of the reconstructed portfolio, for the simulation. */
export function returnsFromPoints(points) {
  return A.toReturns(points.map(p => p.value));
}
