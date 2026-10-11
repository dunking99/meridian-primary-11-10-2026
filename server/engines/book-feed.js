// Meridian — dated events, news and briefing items, each joined to what you hold.
//
// Three engines already know the facts: the calendar knows earnings and
// dividend dates, the news scorer knows which holdings a story names, and the
// briefing knows what is new since last read. None of them states how much of
// the book a line touches. This file adds that stake and nothing else.

import { all } from '../db.js';
import { buildCalendar, lastRefresh } from './calendar.js';
import { getNews, titleSignature, jaccard } from '../sources/news.js';
import { hasGeminiKey } from '../sources/ai.js';
import { ok, refuse, r2 } from './contract.js';

export const MACRO_NOTICE = 'Macro releases aren\'t included. There is no free structured source.';

// ─── B-61: calendar with stake ────────────────────────────────

export function bookCalendar(valued, { days = 30, beyondDays = 30, now = new Date() } = {}) {
  const cal = buildCalendar({ days: days + beyondDays, now });
  const weight = new Map((valued.positions ?? []).map(p => [p.symbol, p.weight ?? null]));
  const value = new Map((valued.positions ?? []).map(p => [p.symbol, p.value ?? null]));
  const withStake = cal.events.map(e => ({
    ...e,
    category: e.type === 'earnings' ? 'earnings' : e.type.startsWith('dividend') ? 'dividends' : 'account',
    stakePct: e.symbol ? (weight.get(e.symbol) ?? null) : null,
    stakeGBP: e.symbol ? (value.get(e.symbol) ?? null) : null,
    // Income amounts need an income record, which does not exist yet.
    amount: null,
    amountReason: e.type.startsWith('dividend') ? 'Dividend amounts are not tracked yet.' : null,
  }));
  const inWindow = withStake.filter(e => e.daysAway <= days);
  const beyond = withStake.filter(e => e.daysAway > days).slice(0, 4);
  const noDate = cal.unresolved.map(u => ({
    symbol: u.symbol,
    reason: u.reason === 'never looked up' ? 'dates never looked up yet' : 'no date published',
    stakePct: weight.get(u.symbol) ?? null,
    held: weight.has(u.symbol),
  }));
  const refresh = lastRefresh();
  return ok({
    days, events: inWindow, beyond, noDate,
    counts: {
      all: inWindow.length,
      earnings: inWindow.filter(e => e.category === 'earnings').length,
      dividends: inWindow.filter(e => e.category === 'dividends').length,
      macro: 0,
    },
    macroNotice: MACRO_NOTICE,
    lastRefresh: refresh,
  }, {
    source: 'Yahoo calendarEvents for held and watched symbols (cached, refreshed daily in the 5-8am window and on adding a holding); ISA date fixed in statute',
    basis: 'Stake is the holding\'s share of the whole book at today\'s prices.',
    coverage: {
      share: null,
      missing: noDate.map(n => ({ symbol: n.symbol, reason: n.reason })),
      note: noDate.length ? `${noDate.length} symbol${noDate.length === 1 ? '' : 's'} with no date published or not yet looked up — listed, never given a date.` : null,
    },
    asOf: refresh?.at ?? Date.now(),
  });
}

// ─── B-62 / B-63: news touching the book ──────────────────────

function direction(sentiment) {
  if (sentiment == null) return 'unscored';
  if (sentiment > 0.15) return 'helps';
  if (sentiment < -0.15) return 'hurts';
  return 'neutral';
}

export function bookNews(valued, { hours = 72, limit = 12, minRelevance = 35 } = {}) {
  const positions = valued.positions ?? [];
  if (!positions.length) return refuse('No holdings, so no story can touch the book.', { source: 'local news feed' });
  const weight = new Map(positions.map(p => [p.symbol, p.weight ?? 0]));
  const held = positions.map(p => p.symbol);
  const watched = all('SELECT DISTINCT symbol FROM watchlist').map(r => r.symbol);
  const since = Date.now() - hours * 3600_000;
  const pool = getNews({ limit: limit * 6, since, sort: 'smart', held, watched, minRelevance });

  const stories = [];
  const sigs = [];
  for (const s of pool) {
    const syms = Array.isArray(s.symbols) ? s.symbols : [];
    const hits = syms.filter(x => weight.has(x));
    if (!hits.length) continue;
    // Second dedupe on top of the ingest one: two feeds' wordings of the same
    // wire story are one development, not two.
    const sig = titleSignature(s.title);
    if (sigs.some(x => jaccard(sig, x) >= 0.6)) continue;
    sigs.push(sig);
    stories.push({
      guid: s.guid, title: s.title, url: s.url, source: s.source, published: s.published,
      holdings: hits.map(h => ({ symbol: h, weight: r2(weight.get(h), 2) })),
      touchedPct: r2(hits.reduce((a, h) => a + (weight.get(h) ?? 0), 0), 2),
      direction: direction(s.sentiment),
      sentiment: s.sentiment ?? null,
      scored: !!s.scored,
      relevance: s.relevance ?? null,
      why: s.why ?? null,
      category: s.category ?? null,
      alsoReported: s.alsoReported ?? 0,
    });
    if (stories.length >= limit) break;
  }

  const touchedSymbols = new Set(stories.flatMap(s => s.holdings.map(h => h.symbol)));
  const touchedTotal = [...touchedSymbols].reduce((a, s) => a + (weight.get(s) ?? 0), 0);
  // Sentiment exposure by weight: which share of the book had positive,
  // negative, neutral or no coverage in the window.
  const bySym = {};
  for (const s of stories) for (const h of s.holdings) (bySym[h.symbol] ??= []).push(s.sentiment);
  const exposure = { positive: 0, negative: 0, neutral: 0, noCoverage: 0 };
  for (const p of positions) {
    const xs = (bySym[p.symbol] ?? []).filter(v => v != null);
    const w = p.weight ?? 0;
    if (!bySym[p.symbol]) exposure.noCoverage += w;
    else if (!xs.length) exposure.neutral += w;
    else { const m = xs.reduce((a, b) => a + b, 0) / xs.length; if (m > 0.15) exposure.positive += w; else if (m < -0.15) exposure.negative += w; else exposure.neutral += w; }
  }
  const ai = hasGeminiKey();
  return ok({
    stories, hours,
    touchedPct: r2(touchedTotal, 2),
    exposure: Object.fromEntries(Object.entries(exposure).map(([k, v]) => [k, r2(v, 2)])),
    aiScoring: ai,
    unscoredShown: stories.filter(s => !s.scored).length,
  }, {
    source: 'Local RSS feed; symbols from the AI scorer where scored, keyword tagging otherwise',
    basis: ai
      ? 'Helps / hurts come from the scored story sentiment against the holding it names. Headline and link only.'
      : 'No AI key is set, so sentiment is the lexicon fallback — a filter aid, not a judgement.',
    note: stories.length ? null : `No stored story in the last ${hours} hours names a holding. That is a normal state.`,
  });
}

// ─── Briefing digest ──────────────────────────────────────────

export function briefingDigest(briefing, { top = 5 } = {}) {
  if (!briefing) return refuse('Briefing unavailable.');
  const items = (briefing.headline ?? []).slice(0, top).map(i => ({
    fp: i.fp, kind: i.kind, section: i.section, symbol: i.symbol, title: i.title, detail: i.detail,
    direction: i.direction, weight: i.weight, materiality: i.materiality, isNew: i.isNew,
    url: i.meta?.url ?? null, source: i.source, alertId: i.meta?.alertId ?? null,
  }));
  return ok({
    verdict: briefing.verdict,
    items,
    counts: briefing.counts,
    fingerprints: briefing.fingerprints,
    generatedAt: briefing.generatedAt,
    lastRead: briefing.lastRead,
    sections: (briefing.sections ?? []).map(s => ({ key: s.key, title: s.title, count: s.count, newCount: s.newCount, available: s.available, reason: s.reason, coverage: s.coverage })),
    failures: briefing.failures ?? [],
  }, {
    source: 'Briefing engine: alerts, holding moves, news, risk flags, calendar, signals, regime, correlation',
    basis: 'Materiality = 100 x strength x stake x kind weight. "New" means new since you last marked the briefing read.',
    note: briefing.verdict?.tone === 'quiet' ? 'Nothing notable is a normal answer.' : null,
    asOf: briefing.generatedAt,
  });
}
