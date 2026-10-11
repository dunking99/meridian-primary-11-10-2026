// Layout as data, the page context, and the component contract.
//
// A layout file is plain data: rows of { component, span, size?, props? }.
// The renderer looks each name up in a registry; a name with no
// implementation renders an explained placeholder, never an error and never
// sample data. Swapping one layout for another changes only the data file.
//
// A component is a spec (which endpoints, which data-version parts, and a pure
// `select` that turns responses into the view's props) plus a view. The hook
// that runs the spec lives beside the spec and knows nothing about the view;
// the view only draws what it is handed. The gallery calls the same `select`
// on recorded responses, which is the proof that views do not fetch.

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useT, FONT } from "./theme.jsx";
import { useApi } from "./useApi.js";
import { Placeholder, PanelBoundary, PanelCrash } from "./ui.jsx";

// ─── Page context: selection, period, benchmark, navigation ──

const PageCtx = createContext(null);

/** Filters live in the hash query (#/portfolio/holdings?account=ISA&q=gold) so a view is linkable. */
function readHashFilters() {
  try {
    const q = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
    return Object.fromEntries([...q.entries()].filter(([k]) => FILTER_KEYS.includes(k)));
  } catch { return {}; }
}
export const FILTER_KEYS = ["type", "sector", "region", "wrapper", "account", "currency", "move", "q"];

/** Apply page filters to enriched-holdings rows. Every filter combines (AND). */
export function applyFilters(rows, filters = {}) {
  return rows.filter(r => FILTER_KEYS.every(k => {
    const v = filters[k];
    if (v == null || v === "") return true;
    if (k === "q") { const s = v.toLowerCase(); return r.symbol.toLowerCase().includes(s) || String(r.name ?? "").toLowerCase().includes(s); }
    if (k === "move") return v === "up" ? (r.dayPct ?? 0) > 0 : v === "down" ? (r.dayPct ?? 0) < 0 : r.dayPct === 0;
    const field = k === "type" ? r.type : k === "region" ? (r.region ?? "Listing unknown") : r[k];
    return String(field ?? "Unclassified") === v;
  }));
}

export function PageProvider({ children, onOpenHolding, onNavigate, initial = {} }) {
  const [selected, setSelected] = useState(null);
  const [filters, setFiltersState] = useState(readHashFilters);
  const setFilters = f => setFiltersState(prev => {
    const next = typeof f === "function" ? f(prev) : f;
    const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v != null && v !== ""));
    try {
      const base = window.location.hash.split("?")[0];
      const qs = new URLSearchParams(clean).toString();
      window.history.replaceState(null, "", qs ? `${base}?${qs}` : base);
    } catch { /* ignore */ }
    return clean;
  });
  const [period, setPeriod] = useState(initial.period ?? "1Y");
  const [benchmark, setBenchmark] = useState(initial.benchmark ?? "^FTSE");
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const value = useMemo(() => ({ selected, setSelected, period, setPeriod, benchmark, setBenchmark, filters, setFilters, onOpenHolding: onOpenHolding ?? (() => {}), onNavigate: onNavigate ?? (() => {}) }),
    [selected, period, benchmark, filters, onOpenHolding, onNavigate]);  // eslint-disable-line react-hooks/exhaustive-deps
  return <PageCtx.Provider value={value}>{children}</PageCtx.Provider>;
}

const NULL_CTX = { selected: null, setSelected: () => {}, period: "1Y", setPeriod: () => {}, benchmark: "^FTSE", setBenchmark: () => {}, filters: {}, setFilters: () => {}, onOpenHolding: () => {}, onNavigate: () => {} };
export const usePage = () => useContext(PageCtx) ?? NULL_CTX;

// ─── Component contract ───────────────────────────────────────

/**
 * Run a spec: one useApi per named endpoint (a fixed set per spec, so the
 * rules of hooks hold), then the spec's pure select.
 * spec = { endpoints: (props, page) => ({ main: path, ... }), deps: { main: [...] }, staleAfterMs, select(results, props, page) }
 */
export function useSpec(spec, props = {}, page = NULL_CTX) {
  const paths = spec.endpoints(props, page);
  const names = spec.names ?? Object.keys(paths);
  const results = {};
  for (const n of names) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results[n] = useApi(paths[n], { deps: spec.deps?.[n] ?? spec.deps?.main ?? ["prices", "book"], staleAfterMs: spec.staleAfterMs ?? null, enabled: !!paths[n], adapt: spec.adapt?.[n] ?? null });
  }
  return spec.select(results, props, page);
}

/** Merge the non-ready states of several results into the contract shape. */
export function primary(results, key = "main") {
  const r = results[key];
  return { status: r.status, reason: r.reason, asOf: r.asOf, source: r.source, basis: r.basis, coverage: r.coverage, note: r.note, stale: r.stale, refetch: r.refetch };
}

export const sizeFromSpan = span => (span <= 4 ? "s" : span <= 7 ? "m" : "l");

// ─── Renderer ─────────────────────────────────────────────────

function Bound({ def, item, page }) {
  const data = def.useData(item.props ?? {}, page);
  const View = def.View;
  return <View {...data} size={item.size ?? sizeFromSpan(item.span ?? 12)} props={item.props ?? {}} page={page} />;
}

export function LayoutPage({ layout, registry, extra = {} }) {
  const t = useT();
  const page = usePage();
  const reg = { ...registry, ...extra };
  return (
    <div style={{ maxWidth: layout.maxWidth ?? 1180, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT.sans }} data-layout={layout.name}>
      <style>{`.mlayout-row{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px;align-items:start}
        @media (max-width: 1100px){.mlayout-row > *{grid-column: span 12 !important}}`}</style>
      {layout.rows.map(row => (
        <div key={row.id} className="mlayout-row" data-row={row.id}>
          {row.items.map((item, k) => {
            const def = reg[item.component];
            return (
              <div key={`${item.component}-${k}`} style={{ gridColumn: `span ${item.span ?? 12}`, minWidth: 0 }} data-slot={item.component}>
                {!def ? (
                  <Placeholder title={item.component} reason={item.placeholder ?? `${item.component} is named in the layout but has no implementation yet.`} unblocks={item.unblocks} />
                ) : def.placeholder ? (
                  <Placeholder title={def.title} reason={def.placeholder.reason} unblocks={def.placeholder.unblocks} />
                ) : (
                  <PanelBoundary name={def.title ?? item.component} Fallback={PanelCrash}>
                    <Bound def={def} item={item} page={page} />
                  </PanelBoundary>
                )}
              </div>
            );
          })}
        </div>
      ))}
      {layout.note && <div style={{ fontSize: 10, color: t.textFaint, fontFamily: FONT.mono }}>Layout: {layout.name} — {layout.note}</div>}
    </div>
  );
}
