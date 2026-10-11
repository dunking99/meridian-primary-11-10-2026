// OV-04 largest positions. Forms: ranked table, largest-position tiles with a
// target tick, Pareto bars with cumulative weight, risk share beside weight.
import React, { useState } from "react";
import { useT, FONT, signColour, cat } from "../../shared/theme.jsx";
import { Frame, StateView, ProvenanceFooter, Segmented, Muted, StaleBadge, SrOnly } from "../../shared/ui.jsx";
import { Pareto } from "../../shared/charts/bars.jsx";
import { gbp, gbpCompact, pct, price } from "../../shared/format.js";

export function TopHoldingsView({ status, data: d, reason, asOf, source, basis, coverage, stale, textAlt, size = "m", props = {}, page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("table");
  const [n, setN] = useState(props.n ?? 8);
  const rows = (d?.rows ?? []).slice(0, n);
  const maxW = Math.max(1, ...rows.map(r => Math.max(r.weight, r.targetPct ?? 0, r.riskSharePct ?? 0)));
  return (
    <Frame id="top-holdings" index={5} label="Largest positions" title="Top of the book"
      right={<><StaleBadge stale={stale} asOf={asOf} />
        <Segmented label="How many" value={n} onChange={setN} options={[5, 8, 12].map(v => ({ value: v, label: String(v) }))} />
        <Segmented label="Form" value={form} onChange={setForm} options={[{ value: "table", label: "Table" }, { value: "tiles", label: "Tiles" }, { value: "pareto", label: "Pareto" }]} />
        <button onClick={() => page?.onNavigate?.("holdings")} style={{ background: "transparent", border: "none", color: t.info, cursor: "pointer", fontSize: 11 }}>All {d?.total ?? ""} holdings →</button></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Ranked by live value, cash excluded. Risk share is each holding's Euler contribution to portfolio variance over stored daily returns; it sums to 100% across holdings." />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={220}>
        {d && form === "table" && (
          <div role="table" aria-label={textAlt}>
            <div role="row" style={{ display: "grid", gridTemplateColumns: size === "s" ? "1.6fr 1fr 1fr" : "1.8fr 1.1fr 0.9fr 0.8fr 0.9fr 1fr", gap: 6, fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 1, color: t.textMuted, borderBottom: `1px solid ${t.borderStrong}`, padding: "4px 0" }}>
              <span role="columnheader">POSITION</span><span role="columnheader">WEIGHT</span>
              {size !== "s" && <><span role="columnheader" style={{ textAlign: "right" }}>VALUE</span><span role="columnheader" style={{ textAlign: "right" }}>TODAY</span><span role="columnheader" style={{ textAlign: "right" }}>TOTAL GAIN</span></>}
              <span role="columnheader" style={{ textAlign: "right" }}>RISK SHARE</span>
            </div>
            {rows.map((r, i) => (
              <button key={r.symbol} role="row" onClick={() => page?.onOpenHolding?.(r.symbol)} onMouseEnter={() => page?.setSelected?.(r.symbol)} onMouseLeave={() => page?.setSelected?.(null)}
                style={{ display: "grid", gridTemplateColumns: size === "s" ? "1.6fr 1fr 1fr" : "1.8fr 1.1fr 0.9fr 0.8fr 0.9fr 1fr", gap: 6, alignItems: "center", width: "100%", border: "none", borderBottom: `1px solid ${t.borderSubtle}`, padding: "6px 0", background: page?.selected === r.symbol ? t.surfaceInset : "transparent", cursor: "pointer", textAlign: "left", color: "inherit" }}>
                <span role="cell" style={{ minWidth: 0 }}>
                  <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: t.textFaint, marginRight: 6 }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ fontFamily: FONT.mono, fontSize: 11.5, fontWeight: 700, color: t.text }}>{r.symbol}</span>
                  <div style={{ fontSize: 10, color: t.textFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: 22 }}>{r.name}</div>
                </span>
                <span role="cell" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ position: "relative", flex: 1, height: 4, background: t.surfaceInset, borderRadius: 2 }}>
                    <span style={{ position: "absolute", inset: 0, width: `${r.weight / maxW * 100}%`, background: t.text, borderRadius: 2 }} />
                    {r.targetPct != null && <span title={`Target ${r.targetPct}%`} style={{ position: "absolute", left: `${r.targetPct / maxW * 100}%`, top: -3, width: 2, height: 10, background: t.warning }} />}
                  </span>
                  <span style={{ fontFamily: FONT.mono, fontSize: 11 }}>{r.weight.toFixed(1)}%</span>
                </span>
                {size !== "s" && <>
                  <span role="cell" style={{ fontFamily: FONT.mono, fontSize: 11, textAlign: "right" }}>{gbp(r.value)}<div style={{ fontSize: 9.5, color: t.textFaint }}>{price(r.price, r.currency)}</div></span>
                  <span role="cell" style={{ fontFamily: FONT.mono, fontSize: 11, textAlign: "right", color: signColour(t, r.dayPct) }}>{pct(r.dayPct)}</span>
                  <span role="cell" style={{ fontFamily: FONT.mono, fontSize: 11, textAlign: "right", color: signColour(t, r.pnl) }}>{pct(r.pnlPct, { dp: 0 })}<div style={{ fontSize: 9.5 }}>{gbpCompact(r.pnl, { sign: true })}</div></span>
                </>}
                <span role="cell" style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end" }}>
                  {r.riskSharePct != null ? <>
                    <span style={{ width: Math.max(2, r.riskSharePct / maxW * 50), height: 3, background: r.riskSharePct > r.weight * 1.2 ? t.warning : cat(t, 0), borderRadius: 2 }} />
                    <span style={{ fontFamily: FONT.mono, fontSize: 11 }}>{r.riskSharePct.toFixed(1)}%</span></> : <span title={d.riskReason} style={{ color: t.textFaint, fontFamily: FONT.mono }}>——</span>}
                </span>
              </button>
            ))}
            <div role="row" style={{ display: "grid", gridTemplateColumns: size === "s" ? "1.6fr 1fr 1fr" : "1.8fr 1.1fr 0.9fr 0.8fr 0.9fr 1fr", gap: 6, padding: "6px 0", borderTop: `1px solid ${t.borderStrong}`, fontFamily: FONT.mono, fontSize: 11, fontWeight: 700 }}>
              <span>Top {rows.length} of {d.total}</span><span>{rows.reduce((a, r) => a + r.weight, 0).toFixed(1)}%</span>
              {size !== "s" && <><span style={{ textAlign: "right" }}>{gbp(rows.reduce((a, r) => a + r.value, 0))}</span><span style={{ textAlign: "right", color: signColour(t, rows.reduce((a, r) => a + (r.dayGBP ?? 0), 0)) }}>{gbpCompact(rows.reduce((a, r) => a + (r.dayGBP ?? 0), 0), { sign: true })}</span><span style={{ textAlign: "right" }}>{gbpCompact(rows.reduce((a, r) => a + (r.pnl ?? 0), 0), { sign: true })}</span></>}
              <span style={{ textAlign: "right" }}>{rows.every(r => r.riskSharePct != null) ? `${rows.reduce((a, r) => a + r.riskSharePct, 0).toFixed(1)}%` : "——"}</span>
            </div>
          </div>
        )}
        {d && form === "tiles" && (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${size === "s" ? 2 : 4}, minmax(0,1fr))`, gap: 8 }}>
            {rows.map(r => (
              <button key={r.symbol} onClick={() => page?.onOpenHolding?.(r.symbol)} style={{ textAlign: "left", background: t.surfaceInset, border: `1px solid ${t.border}`, borderRadius: 6, padding: 8, cursor: "pointer", color: "inherit" }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 11.5, fontWeight: 700, color: t.text }}>{r.symbol}</div>
                <div style={{ fontFamily: FONT.mono, fontSize: 17, color: t.text }}>{r.weight.toFixed(1)}%</div>
                <div style={{ position: "relative", height: 5, background: t.surface, borderRadius: 3, margin: "4px 0" }}>
                  <div style={{ position: "absolute", inset: 0, width: `${Math.min(100, r.weight / maxW * 100)}%`, background: t.text, borderRadius: 3 }} />
                  {r.targetPct != null && <div title={`Target ${r.targetPct}%`} style={{ position: "absolute", left: `${Math.min(100, r.targetPct / maxW * 100)}%`, top: -3, width: 2, height: 11, background: t.warning }} />}
                </div>
                <div style={{ fontSize: 10, color: t.textFaint }}>{r.targetPct != null ? `target ${r.targetPct}%` : "no target set"}</div>
              </button>
            ))}
          </div>
        )}
        {d && form === "pareto" && (
          <Pareto summary={textAlt} rows={rows.map(r => ({ label: r.symbol, weightPct: r.weight, cumulativePct: r.cumulative }))} height={size === "s" ? 150 : 190} />
        )}
        {d?.riskReason && <Muted size={10} style={{ marginTop: 4 }}>Risk share unavailable: {d.riskReason}</Muted>}
        <SrOnly>{textAlt}</SrOnly>
      </StateView>
    </Frame>
  );
}
