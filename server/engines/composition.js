// Meridian — composition hierarchy and label quality.
//
// The Portfolio page's breakdowns are flat lists, one per field. A sunburst or
// treemap needs a tree: class > group > holding. The rule that matters is the
// same one every breakdown here keeps — nothing is dropped or spread. A
// holding with no sector is an explicit "Unclassified" node carrying its full
// weight, and the weights of every level sum to one, which the tests assert.

import { venueOf, decomposePosition } from './lookthrough.js';
import { listCompositions } from './rebuild/exposure.js';
import { instrumentLabel } from './holdings-data.js';
import { ok, refuse, r2 } from './contract.js';

export const LENSES = {
  class:    { label: 'Instrument type', basis: 'Instrument type from the symbol classifier, then the fund\'s published category, then the asset class you entered.' },
  sector:   { label: 'Sector', basis: 'Sector as entered on each holding.' },
  region:   { label: 'Region (listing venue)', basis: 'Where the underlying instruments are listed, looked through stored fund compositions. Listing venue is not revenue. Undisclosed fund holdings are an explicit node, never assigned a region.' },
  typed:    { label: 'Region (as entered)', basis: 'Geography as entered on each holding. May disagree with the listing-venue lens.' },
  wrapper:  { label: 'Wrapper', basis: 'Tax wrapper as entered on each holding.' },
  account:  { label: 'Account', basis: 'Account as entered on each holding.' },
  currency: { label: 'Currency', basis: 'Trading currency of the quote — not economic currency exposure. Hedged share classes are not identified.' },
};

const UNCLASSIFIED = 'Unclassified';
const clean = v => (typeof v === 'string' && v.trim() ? v.trim() : UNCLASSIFIED);

function groupsFor(p, lens, comps) {
  switch (lens) {
    case 'sector': return [{ label: clean(p.sector === 'Unclassified' ? null : p.sector), share: 1 }];
    case 'typed': return [{ label: clean(p.geography === 'Unclassified' ? null : p.geography), share: 1 }];
    case 'wrapper': return [{ label: clean(p.wrapper), share: 1 }];
    case 'account': return [{ label: clean(p.account), share: 1 }];
    case 'currency': return [{ label: clean(p.currency), share: 1 }];
    case 'region': {
      const d = decomposePosition(p, comps[p.symbol]);
      const out = Object.entries(d.byRegion).map(([label, share]) => ({ label, share }));
      const seen = out.reduce((a, g) => a + g.share, 0);
      if (seen < 0.9999) out.push({ label: 'Not disclosed', share: 1 - seen, unseen: true });
      return out;
    }
    default: return [];
  }
}

/**
 * The tree for one lens. `includeCash` adds cash as its own top-level node so
 * the weights describe the whole book; without it they describe what is
 * invested, and the response says which.
 */
export function compositionTree(valued, { lens = 'sector', includeCash = true } = {}) {
  if (!LENSES[lens]) return refuse(`Unknown lens ${lens}. Use one of ${Object.keys(LENSES).join(', ')}.`);
  const positions = (valued.positions ?? []).filter(p => (p.value ?? 0) > 0);
  const cash = includeCash ? (valued.cash ?? 0) : 0;
  const denom = positions.reduce((a, p) => a + p.value, 0) + cash;
  if (!(denom > 0)) {
    return refuse(valued.positions?.length ? 'No holding has a price, so there is nothing to weigh.' : 'No holdings.', {
      source: 'holdings table',
      coverage: { share: null, missing: (valued.excluded ?? []).map(e => ({ symbol: e.symbol, reason: e.reason })) },
    });
  }
  const comps = lens === 'region' ? listCompositions(positions.map(p => p.symbol)) : {};
  const classNodes = new Map();

  for (const p of positions) {
    const cls = clean(instrumentLabel(p));
    const top = classNodes.get(cls) ?? { id: `c:${cls}`, label: cls, value: 0, children: new Map() };
    top.value += p.value;
    if (lens === 'class') {
      top.children.set(p.symbol, { id: `h:${p.symbol}`, label: p.symbol, name: p.name, symbol: p.symbol, value: p.value, leaf: true });
    } else {
      for (const g of groupsFor(p, lens, comps)) {
        const node = top.children.get(g.label) ?? { id: `g:${cls}:${g.label}`, label: g.label, value: 0, children: [], unseen: !!g.unseen };
        const v = p.value * g.share;
        node.value += v;
        node.children.push({ id: `h:${p.symbol}:${g.label}`, label: p.symbol, name: p.name, symbol: p.symbol, value: v, share: g.share, leaf: true });
        top.children.set(g.label, node);
      }
    }
    classNodes.set(cls, top);
  }
  if (cash > 0) {
    classNodes.set('Cash', { id: 'c:Cash', label: 'Cash', value: cash, cash: true, children: new Map([['Cash', { id: 'h:CASH', label: 'Cash', value: cash, leaf: true, cash: true }]]) });
  }

  const finish = n => {
    const kids = n.children instanceof Map ? [...n.children.values()] : (n.children ?? []);
    const out = { ...n, value: r2(n.value), weight: r2(n.value / denom, 6) };
    if (kids.length) out.children = kids.map(finish).sort((a, b) => b.value - a.value);
    else delete out.children;
    return out;
  };
  const roots = [...classNodes.values()].map(finish).sort((a, b) => b.value - a.value);

  // Flat group totals across classes, for a donut or bars that ignore class.
  const flat = {};
  const walk = (n, depth) => {
    if (lens === 'class' ? depth === 0 : depth === 1) flat[n.label] = (flat[n.label] ?? 0) + n.value;
    (n.children ?? []).forEach(c => walk(c, depth + 1));
  };
  roots.forEach(r => { if (r.cash) flat.Cash = (flat.Cash ?? 0) + r.value; else walk(r, 0); });
  const groups = Object.entries(flat).map(([label, value]) => ({ label, value: r2(value), weight: r2(value / denom, 6), count: countIn(roots, label, lens) }))
    .sort((a, b) => b.value - a.value);

  return ok({
    lens, lensLabel: LENSES[lens].label, includeCash,
    total: r2(denom),
    tree: roots,
    groups,
    unclassifiedWeight: r2(groups.filter(g => g.label === UNCLASSIFIED).reduce((a, g) => a + g.weight, 0), 6),
  }, {
    source: 'holdings table and live prices' + (lens === 'region' ? '; stored fund compositions' : ''),
    basis: LENSES[lens].basis + (includeCash ? ' Weights are of the whole book including cash.' : ' Weights are of invested value; cash is excluded.'),
    coverage: {
      share: null,
      missing: (valued.excluded ?? []).map(e => ({ symbol: e.symbol, reason: e.reason })),
      note: (valued.excluded ?? []).length ? 'Unpriced holdings carry no weight and are listed here.' : null,
    },
  });
}

function countIn(roots, label, lens) {
  const syms = new Set();
  const walk = (n, depth, inGroup) => {
    const hit = inGroup || (lens === 'class' ? depth === 0 && n.label === label : depth === 1 && n.label === label) || (n.cash && label === 'Cash');
    if (n.leaf && hit) syms.add(n.symbol ?? n.label);
    (n.children ?? []).forEach(c => walk(c, depth + 1, hit));
  };
  roots.forEach(r => walk(r, 0, false));
  return syms.size;
}

// ─── R1-09: label quality (report only, never rewrites) ───────

const SYNONYMS = {
  'uk': 'united kingdom', 'u.k.': 'united kingdom', 'gb': 'united kingdom', 'great britain': 'united kingdom', 'britain': 'united kingdom', 'england': 'united kingdom',
  'us': 'united states', 'u.s.': 'united states', 'usa': 'united states', 'america': 'united states', 'united states of america': 'united states',
  'eu': 'europe', 'emerging markets': 'em', 'emerging': 'em',
  'tech': 'technology', 'information technology': 'technology', 'it': 'technology',
  'financial': 'financials', 'finance': 'financials', 'health care': 'healthcare', 'health': 'healthcare',
  'equities': 'equity', 'stock': 'equity', 'stocks': 'equity', 'shares': 'equity',
  'bond': 'bonds', 'fixed income': 'bonds',
};

export function normaliseLabel(s) {
  const base = String(s ?? '').trim().toLowerCase().replace(/[\s_-]+/g, ' ').replace(/[.,]$/g, '');
  return SYNONYMS[base] ?? base;
}

export function labelCheck(holdingsRows) {
  const fields = { sector: 'sector', geography: 'geography', asset_class: 'asset class' };
  const report = {};
  let issues = 0;
  for (const [col, label] of Object.entries(fields)) {
    const raw = holdingsRows.map(h => ({ symbol: h.symbol, value: h[col] }));
    const unclassified = raw.filter(r => r.value == null || !String(r.value).trim() || String(r.value).trim().toLowerCase() === 'unclassified');
    const spacing = raw.filter(r => typeof r.value === 'string' && r.value !== r.value.trim() || /\s{2,}/.test(r.value ?? ''));
    const byNorm = new Map();
    for (const r of raw) {
      if (r.value == null || !String(r.value).trim()) continue;
      const k = normaliseLabel(r.value);
      const g = byNorm.get(k) ?? { canonical: k, spellings: new Map() };
      const sp = String(r.value);
      g.spellings.set(sp, [...(g.spellings.get(sp) ?? []), r.symbol]);
      byNorm.set(k, g);
    }
    const nearDuplicates = [...byNorm.values()].filter(g => g.spellings.size > 1).map(g => ({
      normalisedAs: g.canonical,
      spellings: [...g.spellings.entries()].map(([spelling, symbols]) => ({ spelling, symbols })),
    }));
    issues += nearDuplicates.length + spacing.length;
    report[col] = {
      label,
      distinct: new Set(raw.map(r => r.value).filter(Boolean)).size,
      nearDuplicates,
      whitespace: spacing.map(r => ({ symbol: r.symbol, value: r.value })),
      unclassified: { count: unclassified.length, symbols: unclassified.map(r => r.symbol) },
    };
  }
  return ok({ fields: report, issues, holdings: holdingsRows.length }, {
    source: 'holdings table (read only)',
    basis: 'Labels are compared after trimming, lower-casing and a small synonym table (UK / United Kingdom / Britain, US / USA, Tech / Technology…). Nothing is rewritten.',
  });
}
