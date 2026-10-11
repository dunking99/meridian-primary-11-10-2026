// Component gallery (dev only, #/gallery).
//
// Each component is rendered alone in six states from RECORDED API responses
// (scripts/record-gallery-fixtures.mjs against the seeded populated / thin /
// empty worlds). The view receives exactly what its hook would hand it: the
// gallery runs the component's own pure `select` over the recorded responses,
// never a fetch — which is also the proof that views do not fetch.
import React, { useEffect, useMemo, useState } from "react";
import { TokenProvider, FONT } from "../shared/theme.jsx";
import { PageProvider, usePage } from "../shared/layout.jsx";
import { envelopeToState } from "../shared/useApi.js";
import { PanelBoundary, PanelCrash } from "../shared/ui.jsx";
import { PAGES } from "../registry-all.js";
import fixtures from "./fixtures.json";

const STATES = ["populated", "thin", "empty", "stale", "error", "refused"];
const EXTRAS = {
  lens: "class", setLens: () => {}, includeCash: true, setIncludeCash: () => {},
  prefs: { window: "1M", rank: "return", unit: "pct" }, setWindow: () => {}, setRank: () => {}, setUnit: () => {},
  days: 30, setDays: () => {}, filter: "all", setFilter: () => {},
  basisMode: "reconstructed", setBasisMode: () => {},
  rangeFor: { "1W": "1M", "1M": "1M", "3M": "3M", "6M": "6M", YTD: "YTD", "1Y": "1Y", "3Y": "3Y", "5Y": "5Y", ITD: "MAX", MAX: "MAX" },
  read: [], markRead: () => {}, snooze: () => {}, save: () => {}, saving: false, add: () => {}, alert: () => {}, msg: null,
  saveGoal: () => {}, clear: () => {}, errors: null,
  group: "position", setGroup: () => {}, mode: "today", setMode: () => {}, view: "map", setView: () => {}, unit: "pct", setUnit: () => {}, span: "30D", setSpan: () => {},
  extra: [], setExtra: () => {}, grouping: "sector", setGrouping: () => {}, lookback: 252, setLookback: () => {}, window: "1Y", setWindow: () => {},
  edit: () => {}, remove: () => {}, undo: () => {}, pending: null, setTarget: () => {}, saved: [], saveView: () => {}, dropView: () => {},
};
const REFUSAL_SWAP = { "/performance/series?range=1Y&benchmark=%5EFTSE&basis=reconstructed": "/performance/series?range=5Y&benchmark=%5EFTSE&basis=reconstructed" };

function resultsFor(def, world, page, { swapRefusal = false } = {}) {
  const props = def.gallery?.props ?? {};
  const paths = def.spec.endpoints(props, page);
  const names = def.spec.names ?? Object.keys(paths);
  const results = {};
  for (const n of names) {
    let path = paths[n];
    if (!path) { results[n] = { status: "loading", data: null, refetch: () => {} }; continue; }
    if (swapRefusal && n === "main" && REFUSAL_SWAP[path]) path = REFUSAL_SWAP[path];
    const body = fixtures.worlds[world]?.[path];
    if (body === undefined) { results[n] = { status: "error", reason: `No recorded fixture for ${path}.`, data: null, refetch: () => {} }; continue; }
    const adapt = def.spec.adapt?.[n];
    results[n] = { ...envelopeToState(adapt ? adapt(body) : body), stale: false, refetch: () => {} };
  }
  return { results, props };
}

function stateProps(def, state, page) {
  if (state === "error") {
    const { props } = resultsFor(def, "populated", page);
    const names = def.spec.names ?? Object.keys(def.spec.endpoints(props, page));
    const results = Object.fromEntries(names.map(n => [n, { status: "error", reason: "Could not reach the Meridian API.", data: null, refetch: () => {} }]));
    return { out: def.spec.select(results, props, page), props };
  }
  if (state === "refused") {
    for (const w of ["empty", "thin", "populated"]) {
      const { results, props } = resultsFor(def, w, page);
      if (results.main?.status === "refused") return { out: def.spec.select(results, props, page), props, from: w };
    }
    const { results, props } = resultsFor(def, "populated", page, { swapRefusal: true });
    if (results.main?.status === "refused") return { out: def.spec.select(results, props, page), props, from: "populated (5Y range)" };
    return { none: true };
  }
  const world = state === "stale" ? "populated" : state;
  const { results, props } = resultsFor(def, world, page);
  let out = def.spec.select(results, props, page);
  if (state === "stale") out = { ...out, stale: true, asOf: Date.now() - 3 * 86400_000 };
  return { out, props, from: world };
}

function Cell({ def, state, size }) {
  const page = usePage();
  const r = useMemo(() => stateProps(def, state, page), [def, state, page]);
  const View = def.View;
  if (r.none) return <div style={{ fontSize: 11, opacity: 0.7, padding: 12 }}>No refusal can be produced for this component from recorded data — its engine always answers (for example the calendar always has the ISA date).</div>;
  return (
    <PanelBoundary name={def.title} Fallback={PanelCrash}>
      <View {...EXTRAS} {...r.out} size={size} props={r.props} page={page} />
    </PanelBoundary>
  );
}

export default function Gallery({ themes, theme }) {
  const [themeName, setThemeName] = useState(theme?.name ?? "dark");
  const [size, setSize] = useState("m");
  const all = Object.entries(PAGES).flatMap(([pg, reg]) => Object.entries(reg).filter(([, def]) => !def.galleryHidden).map(([id, def]) => ({ pg, id, def })));
  const initial = (() => { try { return new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("c"); } catch { return null; } })();
  const [sel, setSel] = useState(initial && all.some(a => a.id === initial) ? initial : all[0]?.id);
  useEffect(() => { try { window.history.replaceState(null, "", `#/gallery?c=${sel}`); } catch { /* ignore */ } }, [sel]);
  const t = themes[themeName];
  const cur = all.find(a => a.id === sel);
  const btn = on => ({ background: on ? t.text : "transparent", color: on ? t.surface : t.textSecondary, border: `1px solid ${t.border}`, borderRadius: 3, padding: "3px 9px", fontSize: 11, cursor: "pointer", fontFamily: FONT.mono });
  return (
    <TokenProvider tokens={t}>
      <PageProvider onOpenHolding={() => {}} onNavigate={() => {}}>
        <div style={{ display: "flex", minHeight: "100vh", background: t.appBg, color: t.textSecondary, fontFamily: FONT.sans }}>
          <nav aria-label="Components" style={{ width: 230, borderRight: `1px solid ${t.border}`, padding: 12, background: t.chromeBg, flexShrink: 0 }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 12, color: t.text, marginBottom: 4 }}>COMPONENT GALLERY</div>
            <div style={{ fontSize: 10, color: t.textFaint, marginBottom: 10 }}>Recorded {new Date(fixtures.recordedAt).toLocaleString("en-GB")} from seeded test worlds. <a href="#/portfolio/overview" style={{ color: t.info }}>Back to app</a></div>
            {Object.keys(PAGES).map(pg => (
              <div key={pg}>
                <div style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 1.2, color: t.textMuted, margin: "8px 0 3px" }}>{pg.toUpperCase()}</div>
                {all.filter(a => a.pg === pg).map(a => (
                  <button key={a.id} onClick={() => setSel(a.id)} aria-current={a.id === sel ? "true" : undefined}
                    style={{ display: "block", width: "100%", textAlign: "left", background: a.id === sel ? t.surfaceInset : "transparent", border: "none", color: a.id === sel ? t.text : t.textSecondary, padding: "3px 6px", fontSize: 11.5, cursor: "pointer", borderRadius: 3 }}>
                    <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: t.textFaint, marginRight: 6 }}>{a.def.checklist}</span>{a.def.title}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <main style={{ flex: 1, padding: 16, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontFamily: FONT.serif, fontSize: 22, color: t.text }}>{cur?.def.title} <span style={{ fontFamily: FONT.mono, fontSize: 12, color: t.textFaint }}>{cur?.def.checklist}</span></h1>
              <span style={{ flex: 1 }} />
              {Object.keys(themes).map(n => <button key={n} onClick={() => setThemeName(n)} style={btn(themeName === n)}>{n}</button>)}
              {["s", "m", "l"].map(z => <button key={z} onClick={() => setSize(z)} style={btn(size === z)}>size {z}</button>)}
            </div>
            {cur && (
              <div style={{ display: "grid", gridTemplateColumns: size === "l" ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 14 }}>
                {STATES.map(s => (
                  <div key={s} data-state={s} style={{ minWidth: 0, maxWidth: size === "s" ? 420 : undefined }}>
                    <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.3, color: t.textMuted, marginBottom: 4 }}>{s.toUpperCase()}</div>
                    <Cell def={cur.def} state={s} size={size} />
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </PageProvider>
    </TokenProvider>
  );
}
