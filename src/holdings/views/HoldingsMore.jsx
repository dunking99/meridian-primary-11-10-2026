// Holdings views: geography (HD-07), filters (HD-05), full table (HD-01),
// winners / losers (HD-10), 52-week range (HD-11), allocation vs target
// (HD-12), trend (HD-15).
import React, { useMemo, useState } from "react";
import { useT, FONT, soft, signColour, cat, hatch } from "../../shared/theme.jsx";
import { Frame, StateView, ProvenanceFooter, Segmented, Muted, StaleBadge, Chip, SrOnly, NoData, CoverageBar, useReducedMotion } from "../../shared/ui.jsx";
import { DivergingBars, BarList, Waterfall, RangeTrack } from "../../shared/charts/bars.jsx";
import { Treemap } from "../../shared/charts/shapes.jsx";
import { Sparkline } from "../../shared/charts/line.jsx";
import { WorldMap, Globe, DistanceBubbles, REGIONS } from "../../shared/charts/geo.jsx";
import { DataTable } from "../../shared/table.jsx";
import { gbp, gbpCompact, pct, price, pp, num, date } from "../../shared/format.js";

// ─── HD-07 ────────────────────────────────────────────────────
function DotGrid({ share, colour }) {
  const t = useT();
  const n = Math.round((share ?? 0) * 100);
  return <div aria-hidden style={{ display: "grid", gridTemplateColumns: "repeat(10, 5px)", gap: 1.5 }}>{Array.from({ length: 100 }, (_, i) => <span key={i} style={{ width: 5, height: 5, borderRadius: 1, background: i < n ? colour : t.surfaceInset }} />)}</div>;
}

export function GeographyView({ status, reason, asOf, source, basis, coverage, stale, region, regionState, shares = {}, unseen = 0, listingUK, listingUnknown, lookUK, view, setView, size = "m", page, refetch }) {
  const t = useT();
  const reduced = useReducedMotion();
  const sel = page?.filters?.region ?? null;
  const pick = r => page?.setFilters?.(f => ({ ...f, region: f.region === r ? null : r }));
  const seen = 1 - unseen;
  const ordered = REGIONS.map(r => ({ r, s: shares[r] ?? 0 })).sort((a, b) => b.s - a.s);
  const summary = `Look-through by listing venue: ${ordered.filter(x => x.s > 0).map(x => `${x.r} ${(x.s * 100).toFixed(1)}%`).join(", ")}; ${(unseen * 100).toFixed(1)}% not disclosed.`;
  const st = regionState?.status === "ready" ? status : regionState?.status ?? status;
  return (
    <Frame id="geography" index={3} label="Geographic exposure" title={<>Where the equity book <em style={{ fontWeight: 400 }}>lives</em></>}
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Geography view" value={view} onChange={setView} options={[{ value: "map", label: "Map" }, { value: "globe", label: "Globe" }, { value: "bars", label: "Bars" }, { value: "cards", label: "Cards" }, { value: "bubbles", label: "Distance" }]} /></>}
      footer={<ProvenanceFooter source={regionState?.source ?? source} asOf={asOf} basis={regionState?.basis ?? basis} coverage={regionState?.coverage ?? coverage} method="Each fund decomposed by the listing venue of its disclosed holdings (ticker suffix); single equities by their own listing. Undisclosed holdings are a separate share, never given a region. Map geometry is bundled and schematic." />}>
      <StateView status={st} reason={regionState?.reason ?? reason} onRetry={refetch} height={220}>
        {region && (
          <>
            <CoverageBar share={seen} label="Placed by listing venue" note={unseen > 0 ? `${(unseen * 100).toFixed(1)}% of invested value sits in undisclosed fund holdings and is shown as unknown. Every regional figure is a floor.` : null} />
            <div style={{ marginTop: 8 }}>
              {view === "map" && <WorldMap shares={shares} selected={sel} onSelect={pick} summary={summary} />}
              {view === "globe" && <div style={{ display: "flex", justifyContent: "center" }}><Globe shares={shares} selected={sel} size={size === "s" ? 220 : 300} summary={summary} autoSpin={!reduced} /></div>}
              {view === "bubbles" && <div style={{ display: "flex", justifyContent: "center" }}><DistanceBubbles shares={shares} summary={summary} /></div>}
              {view === "cards" && (
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${size === "s" ? 2 : 3}, minmax(0,1fr))`, gap: 6 }}>
                  {ordered.map(({ r, s }, i) => (
                    <button key={r} onClick={() => pick(r)} aria-pressed={sel === r} style={{ textAlign: "left", background: sel === r ? t.surfaceInset : "transparent", border: `1px solid ${t.border}`, borderRadius: 6, padding: 8, cursor: "pointer", color: "inherit" }}>
                      <div style={{ fontSize: 11.5, color: t.text }}>{r}</div>
                      <div style={{ fontFamily: FONT.mono, fontSize: 15, color: t.text, margin: "2px 0 4px" }}>{s > 0 ? `≥${(s * 100).toFixed(1)}%` : "—"}</div>
                      <DotGrid share={s} colour={cat(t, i)} />
                    </button>
                  ))}
                </div>
              )}
            </div>
            {(view === "bars" || view === "map" || view === "globe") && (
              <div role="list" aria-label="Regions (click to filter the table)" style={{ marginTop: 8 }}>
                {ordered.map(({ r, s }) => (
                  <button key={r} role="listitem" onClick={() => pick(r)} aria-pressed={sel === r}
                    style={{ display: "grid", gridTemplateColumns: "150px 1fr 60px", gap: 8, alignItems: "center", width: "100%", background: sel === r ? t.surfaceInset : "transparent", border: "none", padding: "3px 0", cursor: "pointer", color: "inherit", textAlign: "left" }}>
                    <span style={{ fontSize: 11.5, color: t.textSecondary }}>{r}</span>
                    <span style={{ height: 8, background: t.surfaceInset, borderRadius: 3, position: "relative" }}><span style={{ position: "absolute", inset: 0, width: `${s * 100}%`, background: t.info, borderRadius: 3 }} /></span>
                    <span style={{ fontFamily: FONT.mono, fontSize: 11, textAlign: "right" }}>{(s * 100).toFixed(1)}%</span>
                  </button>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 60px", gap: 8, alignItems: "center", padding: "3px 0" }}>
                  <span style={{ fontSize: 11.5, color: t.textFaint }}>Not disclosed</span><span style={{ height: 8, background: hatch(t), borderRadius: 3, width: `${unseen * 100}%` }} /><span style={{ fontFamily: FONT.mono, fontSize: 11, textAlign: "right", color: t.textFaint }}>{(unseen * 100).toFixed(1)}%</span>
                </div>
              </div>
            )}
            <div style={{ marginTop: 8, padding: 8, borderRadius: 5, background: t.surfaceInset, fontSize: 11, color: t.textSecondary, lineHeight: 1.5 }}>
              <b style={{ color: t.text }}>Home-bias check.</b> By where each holding is itself listed, {listingUK != null ? `${(listingUK * 100).toFixed(1)}%` : "——"} is UK{listingUnknown ? ` (${(listingUnknown * 100).toFixed(1)}% of holdings have no recognised listing)` : ""}. Looking through the funds, at least {(lookUK * 100).toFixed(1)}% is UK-listed underneath. A London-listed global tracker counts as UK on the first basis and mostly not on the second.
            </div>
            {sel && <Muted size={10.5} style={{ marginTop: 4 }}>Table filtered to holdings listed in {sel}. <button onClick={() => pick(sel)} style={{ background: "transparent", border: "none", color: t.info, cursor: "pointer", fontSize: 10.5 }}>clear</button></Muted>}
            <SrOnly>{summary}</SrOnly>
          </>
        )}
      </StateView>
    </Frame>
  );
}

// ─── HD-05 ────────────────────────────────────────────────────
const FILTER_LABELS = { type: "Type", sector: "Sector", region: "Listing", wrapper: "Wrapper", account: "Account", currency: "Currency" };
export function FiltersView({ status, reason, options = {}, saved = [], saveView, dropView, size = "m", page, refetch }) {
  const t = useT();
  const f = page?.filters ?? {};
  const active = Object.entries(f).filter(([, v]) => v);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(null);
  return (
    <Frame id="filters" label="Filters & views">
      <StateView status={status} reason={reason} onRetry={refetch} height={40}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <input aria-label="Search holdings" value={f.q ?? ""} onChange={e => page.setFilters(x => ({ ...x, q: e.target.value }))} placeholder="Search ticker or name…"
            style={{ background: t.surfaceInset, color: t.text, border: `1px solid ${t.border}`, borderRadius: 3, fontSize: 11.5, padding: "4px 8px", width: 180 }} />
          {Object.entries(FILTER_LABELS).map(([k, l]) => (
            <span key={k} style={{ position: "relative" }}>
              <Chip onClick={() => setOpen(o => o === k ? null : k)} active={!!f[k]}>{l}{f[k] ? `: ${f[k]}` : " ▾"}</Chip>
              {open === k && (
                <div role="menu" style={{ position: "absolute", zIndex: 40, top: "calc(100% + 4px)", left: 0, background: t.tooltipBg, border: `1px solid ${t.borderStrong}`, borderRadius: 5, padding: 5, minWidth: 160 }}>
                  {(options[k] ?? []).map(([v, n]) => (
                    <button key={v} role="menuitemradio" aria-checked={f[k] === v} onClick={() => { page.setFilters(x => ({ ...x, [k]: x[k] === v ? null : v })); setOpen(null); }}
                      style={{ display: "flex", justifyContent: "space-between", width: "100%", background: f[k] === v ? t.surfaceInset : "transparent", border: "none", color: t.textSecondary, fontSize: 11.5, padding: "3px 6px", cursor: "pointer" }}>
                      <span>{v}</span><span style={{ fontFamily: FONT.mono, color: t.textFaint }}>{n}</span>
                    </button>
                  ))}
                </div>
              )}
            </span>
          ))}
          {f.move && <Chip active onClick={() => page.setFilters(x => ({ ...x, move: null }))}>today: {f.move} ✕</Chip>}
          {active.length > 0 && <button onClick={() => page.setFilters({})} style={{ background: "transparent", border: "none", color: t.info, cursor: "pointer", fontSize: 11 }}>Clear all</button>}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: t.textMuted, letterSpacing: 1 }}>SAVED VIEWS</span>
          {saved.map(v => <span key={v.name} style={{ display: "inline-flex" }}><Chip onClick={() => page.setFilters(v.filters)}>{v.name}</Chip><button onClick={() => dropView(v.name)} aria-label={`Delete view ${v.name}`} style={{ background: "transparent", border: "none", color: t.textFaint, cursor: "pointer", fontSize: 10 }}>✕</button></span>)}
          <form onSubmit={e => { e.preventDefault(); if (name.trim()) { saveView(name.trim()); setName(""); } }} style={{ display: "inline-flex", gap: 4 }}>
            <input aria-label="Name this view" value={name} onChange={e => setName(e.target.value)} placeholder="Save current filters as…" style={{ background: t.surfaceInset, color: t.text, border: `1px solid ${t.border}`, borderRadius: 3, fontSize: 10.5, padding: "2px 6px", width: 170 }} />
            <button type="submit" disabled={!active.length} style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.textSecondary, borderRadius: 3, fontSize: 10.5, cursor: active.length ? "pointer" : "default" }}>Save</button>
          </form>
          <Muted size={10}>Filters live in the address bar, so a filtered view can be bookmarked. Income and tax-lot views appear once income and lot records exist.</Muted>
        </div>
      </StateView>
    </Frame>
  );
}

// ─── HD-01 ────────────────────────────────────────────────────
const VIEWS = {
  general: ["symbol", "qty", "avgCost", "price", "day", "value", "weight", "gain"],
  returns: ["symbol", "day", "trend", "range52", "gain", "weight", "drift"],
  fundamentals: ["symbol", "type", "sector", "region", "ter", "fee", "news"],
};

function EditCell({ value, onSave, width = 70, label }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value ?? "");
  if (!editing) return <span onDoubleClick={() => { setV(value ?? ""); setEditing(true); }} title="Double-click to edit" style={{ cursor: "text" }}>{value ?? "——"}</span>;
  return <input aria-label={label} autoFocus value={v} onChange={e => setV(e.target.value)} onClick={e => e.stopPropagation()}
    onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter") { onSave(v); setEditing(false); } if (e.key === "Escape") setEditing(false); }} onBlur={() => setEditing(false)}
    style={{ width, background: t.surfaceInset, color: t.text, border: `1px solid ${t.focusRing}`, fontFamily: FONT.mono, fontSize: 11, padding: "1px 4px" }} />;
}

export function HoldingsTableView({ status, data: d, reason, asOf, source, basis, coverage, stale, rows = [], filtered, edit, remove, undo, pending, msg, size = "m", page, refetch }) {
  const t = useT();
  const [view, setView] = useState("general");
  const [form, setForm] = useState("table");
  const [groupKey, setGroupKey] = useState("none");
  const [expanded, setExpanded] = useState(null);
  const [checked, setChecked] = useState([]);
  const cols = useMemo(() => {
    const all = [
      { key: "select", label: "", width: "28px", sortable: false, render: r => <input type="checkbox" aria-label={`Select ${r.symbol}`} checked={checked.includes(r.id)} onClick={e => e.stopPropagation()} onChange={e => setChecked(c => e.target.checked ? [...c, r.id] : c.filter(x => x !== r.id))} />, csv: () => "" },
      { key: "symbol", label: "Holding", width: "minmax(170px, 2fr)", sortValue: r => r.symbol, render: r => <span><span style={{ fontWeight: 700 }}>{r.symbol}</span> <span style={{ fontSize: 9, color: t.textFaint, border: `1px solid ${t.border}`, borderRadius: 3, padding: "0 3px" }}>{r.type}</span><div style={{ fontFamily: FONT.sans, fontSize: 10, color: t.textFaint, overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div></span>, csv: r => r.symbol },
      { key: "qty", label: "Qty", align: "right", optional: true, sortValue: r => r.qty, render: r => <EditCell label={`Quantity of ${r.symbol}`} value={r.qty} onSave={v => edit(r.id, { qty: Number(v) })} />, csv: r => r.qty },
      { key: "avgCost", label: "Avg cost", align: "right", optional: true, sortValue: r => r.avgCost, render: r => <EditCell label={`Average cost of ${r.symbol}`} value={r.avgCost} onSave={v => edit(r.id, { avgPrice: Number(v) })} />, csv: r => r.avgCost },
      { key: "price", label: "Price", align: "right", optional: true, sortValue: r => r.price, render: r => r.price == null ? <NoData reason="No live price — not valued" /> : <span>{price(r.price, r.currency)}{r.marketState && r.marketState !== "REGULAR" ? <span title={`Market ${r.marketState.toLowerCase()}: last session's price`} style={{ color: t.warning }}> ◷</span> : ""}</span>, csv: r => r.price },
      { key: "day", label: "Day", align: "right", sortValue: r => r.dayPct, render: r => r.dayPct == null ? <NoData reason="No day change in the quote" /> : <span style={{ color: signColour(t, r.dayPct) }}>{pct(r.dayPct)}</span>, csv: r => r.dayPct },
      { key: "value", label: "Value", align: "right", sortValue: r => r.value, render: r => r.price == null ? <NoData reason="Unpriced" /> : gbp(r.value), csv: r => r.value },
      { key: "weight", label: "Weight", align: "right", sortValue: r => r.weight, render: r => pct(r.weight, { dp: 1, sign: false }), csv: r => r.weight },
      { key: "gain", label: "Total gain", align: "right", sortValue: r => r.pnlPct, render: r => r.pnl == null ? <NoData reason="Unpriced" /> : <span style={{ color: signColour(t, r.pnl) }}>{pct(r.pnlPct, { dp: 1 })}<div style={{ fontSize: 9.5 }}>{gbpCompact(r.pnl, { sign: true })}</div></span>, csv: r => r.pnl },
      { key: "range52", label: "52-week", optional: true, width: "minmax(110px, 1.2fr)", sortValue: r => r.range52?.positionPct, render: r => r.range52?.available ? <RangeTrack compact low={r.range52.low} high={r.range52.high} value={r.price} lowDate={r.range52.lowDate} highDate={r.range52.highDate} /> : <NoData reason={r.range52?.reason ?? "No range"} />, csv: r => r.range52?.positionPct },
      { key: "trend", label: "30D", optional: true, sortValue: r => r.trend30Pct, render: r => r.closes30?.length > 1 ? <Sparkline values={r.closes30} width={70} height={18} /> : <NoData reason="No stored closes for the last 30 days" />, csv: r => r.trend30Pct },
      { key: "drift", label: "Target · drift", align: "right", optional: true, sortValue: r => r.driftPp, render: r => <span><EditCell label={`Target for ${r.symbol}`} value={r.targetPct} onSave={v => edit(r.id, { targetPct: v === "" ? null : Number(v) })} width={50} />{r.driftPp != null && <div style={{ fontSize: 9.5, color: Math.abs(r.driftPp) > 2 ? t.warning : t.textFaint }}>{pp(r.driftPp)}</div>}</span>, csv: r => r.targetPct },
      { key: "type", label: "Type", optional: true, defaultHidden: true, sortValue: r => r.type },
      { key: "sector", label: "Sector", optional: true, defaultHidden: true, sortValue: r => r.sector },
      { key: "region", label: "Listed", optional: true, defaultHidden: true, sortValue: r => r.region, render: r => r.region ?? <NoData reason={r.regionBasis} /> },
      { key: "ter", label: "TER", align: "right", optional: true, defaultHidden: true, sortValue: r => r.expenseRatioPct, render: r => r.expenseRatioPct == null ? <NoData reason="No published expense ratio — not treated as free" /> : `${r.expenseRatioPct}%` },
      { key: "fee", label: "Fee drag", align: "right", optional: true, defaultHidden: true, sortValue: r => r.feeDragGBP, render: r => r.feeDragGBP == null ? <NoData reason="No expense ratio" /> : `${gbp(r.feeDragGBP)}/yr` },
      { key: "news", label: "News 7d", align: "right", optional: true, defaultHidden: true, sortValue: r => r.newsCount7d, render: r => r.newsCount7d ? <span style={{ padding: "0 5px", borderRadius: 8, background: t.infoSoft, color: t.info }}>{r.newsCount7d}</span> : "0" },
      { key: "actions", label: "", width: "56px", sortable: false, render: r => <span style={{ display: "flex", gap: 4 }}>
        <button onClick={e => { e.stopPropagation(); setExpanded(x => x === r.id ? null : r.id); }} aria-label={`Expand ${r.symbol}`} aria-expanded={expanded === r.id} style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer" }}>{expanded === r.id ? "▾" : "▸"}</button>
        <button onClick={e => { e.stopPropagation(); remove(r); }} aria-label={`Delete ${r.symbol}`} style={{ background: "transparent", border: "none", color: t.textFaint, cursor: "pointer" }}>✕</button></span>, csv: () => "" },
    ];
    const keep = ["select", ...VIEWS[view], "actions"];
    return all.filter(c => keep.includes(c.key) || (view === "general" && c.optional)).map(c => ({ ...c, defaultHidden: view === "general" ? c.defaultHidden : false }));
  }, [view, checked, expanded, edit, remove, t]);
  const totals = d?.totals;
  const exp = rows.find(r => r.id === expanded);
  const shown = rows.filter(r => r.price != null || true);
  return (
    <Frame id="holdings-table" index={4} label="Full holdings" title="The ledger"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Column set" value={view} onChange={setView} options={[{ value: "general", label: "General" }, { value: "returns", label: "Returns" }, { value: "fundamentals", label: "Fundamentals" }]} />
        <Segmented label="Group" value={groupKey} onChange={setGroupKey} options={[{ value: "none", label: "No groups" }, { value: "type", label: "Class" }, { value: "sector", label: "Sector" }, { value: "wrapper", label: "Wrapper" }]} />
        <Segmented label="Table or map" value={form} onChange={setForm} options={[{ value: "table", label: "Table" }, { value: "map", label: "Map" }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} note="Double-click a quantity, average cost or target to edit it. Deleting waits 8 seconds for undo before anything is written." />}>
      {pending && <div role="status" style={{ display: "flex", gap: 10, alignItems: "center", background: t.warningSoft, color: t.warning, borderRadius: 4, padding: "5px 9px", marginBottom: 6, fontSize: 11.5 }}>{pending.row.symbol} will be deleted in 8 seconds. <button onClick={undo} autoFocus style={{ background: "transparent", border: `1px solid ${t.warning}`, color: t.warning, borderRadius: 3, cursor: "pointer" }}>Undo</button></div>}
      {msg && !pending && <div role="status" style={{ fontSize: 10.5, color: t.textMuted, marginBottom: 4 }}>{msg}</div>}
      {checked.length > 0 && <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 4 }}>{checked.length} selected · {gbp(rows.filter(r => checked.includes(r.id)).reduce((a, r) => a + (r.value ?? 0), 0))} · {pct(rows.filter(r => checked.includes(r.id)).reduce((a, r) => a + (r.weight ?? 0), 0), { dp: 1, sign: false })} of the book <button onClick={() => setChecked([])} style={{ background: "transparent", border: "none", color: t.info, cursor: "pointer", fontSize: 11 }}>clear</button></div>}
      <StateView status={status} reason={reason} onRetry={refetch} height={200}>
        {form === "map" ? (
          <Treemap items={rows.filter(r => r.value > 0).map(r => ({ key: r.symbol, label: r.symbol, sub: r.name, value: r.value, share: r.weight, colourValue: r.dayPct, group: r.type }))} grouped height={300} legendLabel="Today" summary={`Treemap of the ${rows.length} rows shown`} onSelect={r => page?.setSelected?.(r.key)} />
        ) : (
          <DataTable id={`holdings-${view}`} caption={`Holdings table, ${rows.length} rows${filtered ? " (filtered)" : ""}`} columns={cols} rows={shown}
            groupBy={groupKey === "none" ? null : r => r[groupKey] ?? "Unclassified"} groupFooter={rs => `${gbp(rs.reduce((a, r) => a + (r.value ?? 0), 0))} · ${pct(rs.reduce((a, r) => a + (r.weight ?? 0), 0), { dp: 1, sign: false })}`}
            selectedKey={rows.find(r => r.symbol === page?.selected)?.id ?? null} onSelect={k => page?.setSelected?.(rows.find(r => r.id === k)?.symbol ?? null)} rowKey={r => r.id}
            onOpen={r => page?.setSelected?.(r.symbol)} initialSort={{ key: "value", dir: -1 }}
            rowTone={r => r.price == null ? soft(t.warning, 8) : null} />
        )}
        {exp && (
          <div style={{ marginTop: 8, padding: 10, background: t.surfaceInset, borderRadius: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><b style={{ color: t.text, fontFamily: FONT.mono }}>{exp.symbol}</b><button onClick={() => page?.onOpenHolding?.(exp.symbol)} style={{ background: "transparent", border: "none", color: t.info, cursor: "pointer", fontSize: 11 }}>Open full panel →</button></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 6 }}>
              <div>{exp.closes90?.length > 1 ? <Sparkline values={exp.closes90} width={320} height={70} label={`${exp.symbol} last ${exp.closes90.length} closes`} /> : <Muted>No stored series.</Muted>}<Muted size={10}>Last {exp.closes90?.length ?? 0} stored closes</Muted></div>
              <div>{exp.transactions?.length ? exp.transactions.map((x, i) => <div key={i} style={{ fontFamily: FONT.mono, fontSize: 10.5, color: t.textSecondary }}>{x.date} {x.side} {x.qty} @ {x.price}{x.fees ? ` (fees £${x.fees})` : ""}</div>) : <Muted>No transactions recorded; history before the log is not known.</Muted>}</div>
            </div>
          </div>
        )}
        {totals && (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 6, fontFamily: FONT.mono, fontSize: 11, color: t.textSecondary }}>
            <span>{rows.length} of {totals.positions} positions{filtered ? " (filtered)" : ""}</span>
            <span>{gbp(rows.reduce((a, r) => a + (r.value ?? 0), 0))}</span>
            <span style={{ color: signColour(t, rows.reduce((a, r) => a + (r.dayGBP ?? 0), 0)) }}>{gbp(rows.reduce((a, r) => a + (r.dayGBP ?? 0), 0), { sign: true })} today</span>
            <span>{pct(rows.reduce((a, r) => a + (r.weight ?? 0), 0), { dp: 1, sign: false })} of the book</span>
            {d.partial && <span style={{ color: t.warning }}>unpriced rows are valued at nothing and excluded from totals</span>}
          </div>
        )}
      </StateView>
    </Frame>
  );
}

// ─── HD-10 ────────────────────────────────────────────────────
export function WinnersView({ status, reason, asOf, source, basis, coverage, stale, rows = [], unit, setUnit, size = "m", page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("lists");
  const priced = rows.filter(r => r.pnl != null);
  const m = r => unit === "gbp" ? r.pnl : r.pnlPct;
  const sorted = [...priced].sort((a, b) => m(b) - m(a));
  const fmt = v => unit === "gbp" ? gbp(v, { sign: true }) : pct(v, { dp: 1 });
  const summary = `Top by unrealised gain: ${sorted.slice(0, 3).map(r => `${r.symbol} ${fmt(m(r))}`).join(", ")}; bottom: ${sorted.slice(-3).map(r => `${r.symbol} ${fmt(m(r))}`).join(", ")}.`;
  return (
    <Frame id="winners" label="Winners / losers" title="Since bought"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Unit" value={unit} onChange={setUnit} options={[{ value: "pct", label: "%" }, { value: "gbp", label: "£" }]} /><Segmented label="Form" value={form} onChange={setForm} options={[{ value: "lists", label: "Lists" }, { value: "waterfall", label: "Waterfall" }, { value: "bars", label: "Bars" }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Unrealised gain = live value minus average cost × quantity. Realised gains are not tracked." />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={160}>
        {priced.length > 0 && form === "lists" && (
          <div style={{ display: "grid", gridTemplateColumns: size === "s" ? "1fr" : "1fr 1fr", gap: 12 }}>
            {priced.length < 2 && <Muted>Only one priced holding — there is nothing to rank it against.</Muted>}
            {priced.length >= 2 && [["Top", sorted.slice(0, Math.min(5, Math.ceil(sorted.length / 2)))], ["Bottom", [...sorted].reverse().slice(0, Math.min(5, Math.floor(sorted.length / 2)))]].map(([h, list]) => (
              <div key={h} role="list" aria-label={`${h} by gain`}>
                <div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: t.textMuted, letterSpacing: 1 }}>{h.toUpperCase()}</div>
                {list.map(r => <button key={r.symbol} role="listitem" onClick={() => page?.onOpenHolding?.(r.symbol)} style={{ display: "flex", justifyContent: "space-between", width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${t.borderSubtle}`, padding: "4px 0", cursor: "pointer", fontFamily: FONT.mono, fontSize: 11.5, color: t.text }}><span>{r.symbol}</span><span style={{ color: signColour(t, m(r)) }}>{fmt(m(r))}</span></button>)}
              </div>
            ))}
          </div>
        )}
        {priced.length > 0 && form === "waterfall" && <Waterfall summary={summary} format={v => gbpCompact(v)} steps={[{ label: "Cost", value: priced.reduce((a, r) => a + r.cost, 0), kind: "total" }, ...sorted.map(r => ({ label: r.symbol, value: r.pnl, kind: "step" })), { label: "Value", value: priced.reduce((a, r) => a + r.value, 0), kind: "total" }]} onStep={s => page?.onOpenHolding?.(s.label)} height={220} />}
        {priced.length > 0 && form === "bars" && <DivergingBars summary={summary} rows={sorted.map(r => ({ key: r.symbol, label: r.symbol, sub: r.name, value: m(r), display: fmt(m(r)) }))} onRow={r => page?.onOpenHolding?.(r.key)} />}
        <SrOnly>{summary}</SrOnly>
      </StateView>
    </Frame>
  );
}

// ─── HD-11 ────────────────────────────────────────────────────
export function Range52View({ status, reason, asOf, source, basis, coverage, stale, rows = [], size = "m", page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("track");
  const withR = rows.filter(r => r.range52?.available);
  const past = withR.filter(r => r.range52.aboveRange || r.range52.belowRange);
  return (
    <Frame id="range52" label="52-week range" title="Where each sits in its year"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Form" value={form} onChange={setForm} options={[{ value: "track", label: "Tracks" }, { value: "outside", label: `Outside (${past.length})` }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Low and high of the last 252 stored closes (adjusted where stored). A price beyond the range is drawn past the end and labelled 'past', never pinned to the end." />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={120}>
        <div role="list">
          {(form === "track" ? rows : past).map(r => (
            <div role="listitem" key={r.symbol} style={{ display: "grid", gridTemplateColumns: "72px 1fr 64px", gap: 8, alignItems: "center", padding: "4px 0", borderBottom: `1px solid ${t.borderSubtle}` }}>
              <button onClick={() => page?.setSelected?.(r.symbol)} style={{ background: "transparent", border: "none", padding: 0, textAlign: "left", fontFamily: FONT.mono, fontSize: 11.5, color: t.text, cursor: "pointer" }}>{r.symbol}</button>
              {r.range52?.available ? <RangeTrack low={r.range52.low} high={r.range52.high} value={r.price} lowDate={r.range52.lowDate} highDate={r.range52.highDate} /> : <Muted size={10}>{r.range52?.reason ?? "no range"}</Muted>}
              <span style={{ fontFamily: FONT.mono, fontSize: 10.5, textAlign: "right", color: r.range52?.aboveRange || r.range52?.belowRange ? t.warning : t.textSecondary }}>{r.range52?.positionPct != null ? (r.range52.aboveRange ? "past high" : r.range52.belowRange ? "past low" : `${r.range52.positionPct.toFixed(0)}%`) : "——"}</span>
            </div>
          ))}
          {form === "outside" && !past.length && <Muted>No holding is outside its stored 52-week range.</Muted>}
        </div>
        <Muted size={10}>Hover a track for the dates of the low and the high.</Muted>
      </StateView>
    </Frame>
  );
}

// ─── HD-12 ────────────────────────────────────────────────────
export function TargetsView({ status, data: d, reason, asOf, source, basis, coverage, stale, rows = [], enriched = [], setTarget, msg, size = "m", page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("bars");
  const idOf = s => enriched.find(e => e.symbol === s)?.id;
  const refusedNoTargets = status === "refused" && /No targets/.test(reason ?? "");
  const allRows = rows.length ? rows : (d?.rows ?? []);
  return (
    <Frame id="targets" label="Allocation vs target" title="Drift from what you set"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Form" value={form} onChange={setForm} options={[{ value: "bars", label: "Drift bars" }, { value: "dots", label: "By class" }, { value: "columns", label: "Edit" }, { value: "map", label: "Map" }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Drift = current weight minus target (percentage points). The pound gap is the move that would close it at today's total — a size, not advice; the trade list is on Analysis → Rebalance." />}>
      {msg && <div role="status" style={{ fontSize: 10.5, color: t.textMuted }}>{msg}</div>}
      {refusedNoTargets && <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 6 }}>No targets set. Type a target weight for any holding below to start measuring drift — nothing is assumed.</div>}
      <StateView status={refusedNoTargets ? "ready" : status} reason={reason} onRetry={refetch} height={140}>
        {(form === "columns" || refusedNoTargets) && (
          <div role="table" aria-label="Targets and drift">
            {(allRows.length ? allRows : enriched).map(r => (
              <div role="row" key={r.symbol} style={{ display: "grid", gridTemplateColumns: "80px 60px 90px 70px 1fr", gap: 8, alignItems: "center", fontSize: 11.5, padding: "3px 0", borderBottom: `1px solid ${t.borderSubtle}` }}>
                <span role="cell" style={{ fontFamily: FONT.mono }}>{r.symbol}</span>
                <span role="cell" style={{ fontFamily: FONT.mono }}>{pct(r.weight, { dp: 1, sign: false })}</span>
                <span role="cell"><input aria-label={`Target for ${r.symbol}`} defaultValue={r.targetPct ?? ""} placeholder="none" onKeyDown={e => { if (e.key === "Enter") setTarget(idOf(r.symbol), e.currentTarget.value); }} onBlur={e => { if (String(e.currentTarget.value) !== String(r.targetPct ?? "")) setTarget(idOf(r.symbol), e.currentTarget.value); }}
                  style={{ width: 70, background: t.surfaceInset, color: t.text, border: `1px solid ${t.border}`, fontFamily: FONT.mono, fontSize: 11, padding: "1px 5px" }} /></span>
                <span role="cell" style={{ fontFamily: FONT.mono, color: r.driftPp == null ? t.textFaint : Math.abs(r.driftPp) > 2 ? t.warning : t.textSecondary }}>{r.driftPp == null ? "no target" : pp(r.driftPp)}</span>
                <span role="cell" style={{ fontFamily: FONT.mono, color: t.textFaint, fontSize: 10.5 }}>{r.gapGBP != null ? `${r.gapGBP >= 0 ? "buy" : "sell"} ~${gbpCompact(Math.abs(r.gapGBP))} to close` : ""}</span>
              </div>
            ))}
          </div>
        )}
        {!refusedNoTargets && d && form === "bars" && <DivergingBars summary={`Drift from target: ${d.rows.filter(r => r.driftPp != null).map(r => `${r.symbol} ${pp(r.driftPp)}`).join(", ")}`} format={v => pp(v)} rows={d.rows.map(r => ({ key: r.symbol, label: r.symbol, sub: r.targetPct != null ? `target ${r.targetPct}%` : "no target", value: r.driftPp, display: r.driftPp == null ? "no target" : pp(r.driftPp) }))} onRow={r => page?.setSelected?.(r.key)} />}
        {!refusedNoTargets && d && form === "dots" && (
          <div role="list">
            {d.byClass.map(c => {
              const max = Math.max(1, ...d.byClass.map(x => Math.max(x.weight, x.targetPct ?? 0)));
              return (
                <div role="listitem" key={c.label} style={{ display: "grid", gridTemplateColumns: "130px 1fr 70px", gap: 8, alignItems: "center", padding: "5px 0" }} aria-label={`${c.label}: ${c.weight}% vs target ${c.targetPct ?? "none"}`}>
                  <span style={{ fontSize: 11.5 }}>{c.label}</span>
                  <span style={{ position: "relative", height: 12 }}>
                    <span style={{ position: "absolute", left: 0, right: 0, top: 5, height: 2, background: t.borderSubtle }} />
                    {c.targetPct != null && <span title={`Target ${c.targetPct}%`} style={{ position: "absolute", left: `${c.targetPct / max * 100}%`, top: 0, width: 2, height: 12, background: t.text }} />}
                    <span title={`Now ${c.weight}%`} style={{ position: "absolute", left: `${c.weight / max * 100}%`, top: 2, width: 8, height: 8, marginLeft: -4, borderRadius: 4, background: t.info }} />
                  </span>
                  <span style={{ fontFamily: FONT.mono, fontSize: 10.5, textAlign: "right" }}>{c.driftPp != null ? pp(c.driftPp) : c.targetPct == null ? "no target" : "partly set"}</span>
                </div>
              );
            })}
            <Muted size={10}>● now · | target. A class with some holdings untargeted is "partly set" and shows no drift.</Muted>
          </div>
        )}
        {!refusedNoTargets && d && form === "map" && <Treemap items={enriched.filter(r => r.value > 0).map(r => ({ key: r.symbol, label: r.symbol, sub: r.name, value: r.value, share: r.weight, colourValue: r.driftPp, group: r.type }))} grouped height={240} clip={5} legendLabel="Drift" format={v => pp(v)} summary="Treemap coloured by drift from target" onSelect={r => page?.setSelected?.(r.key)} />}
      </StateView>
    </Frame>
  );
}

// ─── HD-15 ────────────────────────────────────────────────────
export function TrendView({ status, reason, asOf, source, basis, coverage, stale, rows = [], span, setSpan, size = "m", page, refetch }) {
  const t = useT();
  return (
    <Frame id="trend" label="Trend" title={span === "30D" ? "Last 30 days" : "Last three months"}
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Span" value={span} onChange={setSpan} options={["30D", "3M"]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Stored daily closes only; no axis. Colour follows direction; the figure beside it states the change." />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={120}>
        <div role="list" style={{ display: "grid", gridTemplateColumns: `repeat(${size === "s" ? 1 : 2}, minmax(0,1fr))`, columnGap: 16 }}>
          {rows.map(r => {
            const vs = span === "30D" ? r.closes30 : r.closes90;
            const chg = vs?.length > 1 ? (vs[vs.length - 1] / vs[0] - 1) * 100 : null;
            return (
              <div role="listitem" key={r.symbol} style={{ display: "grid", gridTemplateColumns: "72px minmax(0,1fr) 60px", alignItems: "center", gap: 8, padding: "3px 0", borderBottom: `1px solid ${t.borderSubtle}`, overflow: "hidden" }}>
                <button onClick={() => page?.setSelected?.(r.symbol)} style={{ background: "transparent", border: "none", padding: 0, textAlign: "left", fontFamily: FONT.mono, fontSize: 11.5, color: t.text, cursor: "pointer" }}>{r.symbol}</button>
                {vs?.length > 1 ? <Sparkline values={vs} width={size === "s" ? 120 : 110} height={20} /> : <span title="No stored series for this span" style={{ fontSize: 10, color: t.textFaint }}>no series</span>}
                <span style={{ fontFamily: FONT.mono, fontSize: 11, textAlign: "right", color: signColour(t, chg) }}>{chg == null ? "——" : pct(chg, { dp: 1 })}</span>
              </div>
            );
          })}
        </div>
      </StateView>
    </Frame>
  );
}
