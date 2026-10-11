// Holdings-page hooks. Most panels read the one enriched-holdings call
// (B-20); the page filters (HD-05, in the URL) are applied here in `select`
// so every panel shows the same subset. Writes go through the existing
// holdings routes and bump the data version, so every panel refreshes.
import { useCallback, useEffect, useRef, useState } from "react";
import { useSpec, primary, applyFilters } from "../../shared/layout.jsx";
import { useLocalPref } from "../../shared/ui.jsx";
import { EP } from "../../shared/endpoints.js";
import { send } from "../../shared/api.js";
import { refreshVersions } from "../../shared/dataVersion.js";

const ENR_DEPS = ["prices", "book", "bars", "news"];
const rowsOf = r => r.data?.rows ?? [];

/** Spec factory: enriched rows (filtered) plus optional extra endpoints. */
function enrichedSpec({ extra = {}, extraDeps = {}, select, filtered = true } = {}) {
  return {
    names: ["main", ...Object.keys(extra)],
    endpoints: (props, page) => ({ main: EP.enriched, ...Object.fromEntries(Object.entries(extra).map(([k, f]) => [k, typeof f === "function" ? f(props, page) : f])) }),
    deps: { main: ENR_DEPS, ...extraDeps },
    staleAfterMs: 10 * 60_000,
    select: (results, props, page) => {
      const all = rowsOf(results.main);
      const rows = filtered ? applyFilters(all, page.filters) : all;
      return { ...primary(results), data: results.main.data, all, rows, filtered: rows.length !== all.length, ...(select ? select(results, rows, props, page, all) : {}) };
    },
  };
}

// ─── HD-04 key info strip ─────────────────────────────────────
export const keyInfoSpec = enrichedSpec({
  filtered: false,
  select: (r, rows) => {
    const priced = rows.filter(x => x.pnlPct != null);
    const byPct = [...priced].sort((a, b) => b.pnlPct - a.pnlPct);
    const byDay = rows.filter(x => x.dayPct != null).sort((a, b) => b.dayPct - a.dayPct);
    return { best: byPct[0] ?? null, worst: byPct[byPct.length - 1] ?? null, bestDay: byDay[0] ?? null, worstDay: byDay[byDay.length - 1] ?? null };
  },
});
export const useKeyInfo = (props, page) => useSpec(keyInfoSpec, props, page);

// ─── HD-09 weight ribbon ──────────────────────────────────────
export const ribbonSpec = enrichedSpec({
  select: (r, rows, props, page, all, group = "position") => {
    const total = all.reduce((a, x) => a + (x.value ?? 0), 0) + (r.main.data?.totals?.cash ?? 0);
    const keyOf = x => group === "position" ? x.symbol : group === "class" ? x.type : group === "sector" ? (x.sector ?? "Unclassified") : (x.region ?? "Listing unknown");
    const g = {};
    for (const x of rows) {
      const k = keyOf(x);
      const e = g[k] ?? { key: k, label: k, value: 0, target: 0, hasTarget: false, untargeted: [], members: [] };
      e.value += x.value ?? 0; e.members.push(x.symbol);
      if (x.targetPct != null) { e.target += x.targetPct; e.hasTarget = true; } else e.untargeted.push(x.symbol);
      g[k] = e;
    }
    const segs = Object.values(g).sort((a, b) => b.value - a.value).map(e => ({ ...e, share: total ? e.value / total : 0, targetShare: e.hasTarget ? e.target / 100 : null, driftPp: e.hasTarget && e.untargeted.length === 0 ? (e.value / total * 100 - e.target) : null }));
    return { segs, total, cashShare: total ? (r.main.data?.totals?.cash ?? 0) / total : 0 };
  },
});
export function useRibbon(props, page) {
  const [group, setGroup] = useLocalPref("ribbon_group", "position");
  const spec = { ...ribbonSpec, select: (res, p, pg) => ribbonSpec.select(res, p, pg) };
  const base = useSpec(spec, props, page);
  // Re-run the grouping locally (no refetch) when the group changes.
  const regrouped = base.status === "ready" ? ribbonGroup(base, group) : base;
  return { ...regrouped, group, setGroup };
}
function ribbonGroup(base, group) {
  const total = base.all.reduce((a, x) => a + (x.value ?? 0), 0) + (base.data?.totals?.cash ?? 0);
  const keyOf = x => group === "position" ? x.symbol : group === "class" ? x.type : group === "sector" ? (x.sector ?? "Unclassified") : (x.region ?? "Listing unknown");
  const g = {};
  for (const x of base.rows) {
    const k = keyOf(x);
    const e = g[k] ?? { key: k, label: k, value: 0, target: 0, hasTarget: false, untargeted: [], members: [] };
    e.value += x.value ?? 0; e.members.push(x.symbol);
    if (x.targetPct != null) { e.target += x.targetPct; e.hasTarget = true; } else e.untargeted.push(x.symbol);
    g[k] = e;
  }
  const segs = Object.values(g).sort((a, b) => b.value - a.value).map(e => ({ ...e, share: total ? e.value / total : 0, targetShare: e.hasTarget ? e.target / 100 : null, driftPp: e.hasTarget && !e.untargeted.length ? e.value / total * 100 - e.target : null }));
  return { ...base, segs, total, cashShare: total ? (base.data?.totals?.cash ?? 0) / total : 0 };
}

// ─── HD-06 treemap ────────────────────────────────────────────
export const treemapSpec = enrichedSpec({
  extra: { returns: (p, page) => EP.returns(page.benchmark) },
  extraDeps: { returns: ["prices", "book", "bars"] },
  select: (r) => ({ returns: r.returns?.data?.rows ?? [], returnsReason: r.returns?.status === "refused" ? r.returns.reason : null }),
});
export function useTreemap(props, page) {
  const [mode, setMode] = useLocalPref("treemap_mode", "today");
  const [group, setGroup] = useLocalPref("treemap_group", "class");
  return { ...useSpec(treemapSpec, props, page), mode, setMode, group, setGroup };
}

// ─── HD-07 geography ──────────────────────────────────────────
export const geoSpec = enrichedSpec({
  filtered: false,
  extra: { region: EP.composition("region", false) },
  extraDeps: { region: ["prices", "book", "bars"] },
  select: (r, rows) => {
    const reg = r.region?.data;
    const shares = {};
    let unseen = 0;
    for (const g of reg?.groups ?? []) { if (g.label === "Not disclosed") unseen += g.weight; else shares[g.label] = g.weight; }
    const invested = rows.reduce((a, x) => a + (x.value ?? 0), 0);
    const listingUK = invested ? rows.filter(x => x.region === "UK").reduce((a, x) => a + x.value, 0) / invested : null;
    const listingUnknown = invested ? rows.filter(x => !x.region).reduce((a, x) => a + x.value, 0) / invested : null;
    return { region: reg, regionState: primary({ main: r.region ?? r.main }), shares, unseen, listingUK, listingUnknown, lookUK: shares.UK ?? 0 };
  },
});
export function useGeography(props, page) {
  const [view, setView] = useLocalPref("geo_view", "map");
  return { ...useSpec(geoSpec, props, page), view, setView };
}

// ─── HD-01 table (+ edits, deferred delete with undo) ─────────
export const tableSpec = enrichedSpec({});
export function useHoldingsTable(props, page) {
  const out = useSpec(tableSpec, props, page);
  const [pending, setPending] = useState(null);     // { row, timer }
  const [msg, setMsg] = useState(null);
  const timer = useRef(null);
  const edit = useCallback(async (id, patch) => {
    try { await send("PUT", "/holdings", { id, ...patch }); setMsg("Saved."); await refreshVersions(); }
    catch (e) { setMsg(`Could not save: ${e.message}`); }
  }, []);
  // Deletion waits for the undo window to pass before anything is sent, so
  // "undo" never has to re-create a row.
  const remove = useCallback(row => {
    clearTimeout(timer.current);
    setPending({ row });
    timer.current = setTimeout(async () => {
      try { await send("DELETE", `/holdings?id=${row.id}`); setMsg(`${row.symbol} deleted.`); await refreshVersions(); }
      catch (e) { setMsg(`Could not delete: ${e.message}`); }
      setPending(null);
    }, 8000);
  }, []);
  const undo = useCallback(() => { clearTimeout(timer.current); setPending(null); setMsg("Deletion cancelled."); }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const rows = pending ? out.rows.filter(r => r.id !== pending.row.id) : out.rows;
  return { ...out, rows, edit, remove, undo, pending, msg };
}

// ─── HD-05 filters ────────────────────────────────────────────
export const filtersSpec = enrichedSpec({
  filtered: false,
  select: (r, rows) => {
    const opts = k => {
      const m = {};
      for (const x of rows) { const v = k === "type" ? x.type : k === "region" ? (x.region ?? "Listing unknown") : (x[k] ?? "Unclassified"); m[v] = (m[v] ?? 0) + 1; }
      return Object.entries(m).sort((a, b) => b[1] - a[1]);
    };
    return { options: Object.fromEntries(["type", "sector", "region", "wrapper", "account", "currency"].map(k => [k, opts(k)])), hasTransactions: rows.some(x => x.transactions?.length) };
  },
});
export function useFilters(props, page) {
  const [saved, setSaved] = useLocalPref("holdings_saved_views", []);
  const out = useSpec(filtersSpec, props, page);
  return { ...out, saved, saveView: name => setSaved(v => [...v.filter(x => x.name !== name), { name, filters: page.filters }].slice(-8)), dropView: name => setSaved(v => v.filter(x => x.name !== name)) };
}

// ─── HD-10 winners / losers ───────────────────────────────────
export const winnersSpec = enrichedSpec({});
export function useWinnersLosers(props, page) {
  const [unit, setUnit] = useLocalPref("winners_unit", "pct");
  return { ...useSpec(winnersSpec, props, page), unit, setUnit };
}

// ─── HD-11 52-week range, HD-15 trend, HD-22 up/down ─────────
export const rangeSpec = enrichedSpec({});
export const useRange52 = (props, page) => useSpec(rangeSpec, props, page);
export const trendSpec = enrichedSpec({});
export function useTrend(props, page) {
  const [span, setSpan] = useLocalPref("trend_span", "30D");
  return { ...useSpec(trendSpec, props, page), span, setSpan };
}
export const upDownSpec = enrichedSpec({ filtered: false });
export const useUpDown = (props, page) => useSpec(upDownSpec, props, page);

// ─── HD-12 allocation against target ─────────────────────────
export const targetsSpec = {
  names: ["main", "enriched"],
  endpoints: () => ({ main: EP.targets, enriched: EP.enriched }),
  deps: { main: ["prices", "book"], enriched: ENR_DEPS },
  staleAfterMs: 10 * 60_000,
  select: ({ main, enriched }) => ({ ...primary({ main }), data: main.data, rows: main.data?.rows ?? [], enriched: rowsOf(enriched) }),
};
export function useTargets(props, page) {
  const out = useSpec(targetsSpec, props, page);
  const [msg, setMsg] = useState(null);
  const setTarget = useCallback(async (id, targetPct) => {
    const v = targetPct === "" || targetPct == null ? null : Number(targetPct);
    if (v != null && !(v >= 0 && v <= 100)) { setMsg("A target is a percentage between 0 and 100."); return; }
    try { await send("PUT", "/holdings", { id, targetPct: v }); setMsg("Target saved."); await refreshVersions(); }
    catch (e) { setMsg(`Could not save: ${e.message}`); }
  }, []);
  return { ...out, setTarget, msg };
}

// ─── HD-20 position inspector ─────────────────────────────────
export const inspectorSpec = {
  names: ["main", "history", "enriched", "risk"],
  endpoints: (props, page) => {
    const sym = props.symbol ?? (page.selected && !String(page.selected).includes(":") ? page.selected : null);
    return {
      main: sym ? `/portfolio/holding?symbol=${encodeURIComponent(sym)}` : null,
      history: sym ? `/history?symbol=${encodeURIComponent(sym)}` : null,
      enriched: EP.enriched,
      risk: EP.riskProfile,
    };
  },
  deps: { main: ["prices", "book", "bars", "news"], history: ["bars"], enriched: ENR_DEPS, risk: ["book", "bars"] },
  adapt: {
    main: body => body?.error ? { available: false, reason: body.error } : { available: true, asOf: Date.now(), source: "/portfolio/holding (one read for the panel)", data: body },
    history: body => ({ available: (body?.data?.length ?? 0) > 1, reason: "No stored price history for this holding.", source: "Stored daily bars", data: { bars: body?.data ?? [] } }),
  },
  select: ({ main, history, enriched, risk }, props, page) => {
    const sym = main.data?.symbol ?? null;
    const row = rowsOf(enriched).find(x => x.symbol === sym) ?? null;
    const rs = risk.data?.riskContributions?.find(x => x.symbol === sym) ?? null;
    return {
      ...primary({ main }), status: main.status === "loading" && !sym ? "idle" : main.status,
      data: main.data, row, bars: history.data?.bars ?? [], historyState: history.status,
      riskShare: rs?.pctOfRisk ?? null, riskReason: risk.status === "refused" ? risk.reason : null,
      symbol: sym,
    };
  },
};
export const useInspector = (props, page) => useSpec(inspectorSpec, props, page);
