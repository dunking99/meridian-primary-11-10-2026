// OV-06: five axes, never a grade. Forms: rings, report card, lifts/holds-back
// attribution, and a dual risk + health cluster.
import React, { useState } from "react";
import { useT, FONT, cat } from "../../shared/theme.jsx";
import { Frame, StateView, ProvenanceFooter, Segmented, Explain, Muted, StaleBadge, SrOnly } from "../../shared/ui.jsx";
import { Ring } from "../../shared/charts/bars.jsx";
import { pct, num } from "../../shared/format.js";

function AxisDetail({ axis, page }) {
  const t = useT();
  if (!axis) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11.5, color: t.textSecondary, lineHeight: 1.5 }}>{axis.description}</div>
      <Muted size={10.5} style={{ marginTop: 4 }}>Covers {axis.coverage}% of invested value{axis.note ? ` · ${axis.note}` : ""}</Muted>
      {axis.score != null && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
          {[["Lifting it", axis.lifting, t.positive], ["Holding it back", axis.holdingBack, t.negative]].map(([h, list, c]) => (
            <div key={h}>
              <div style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 1, color: c, marginBottom: 4 }}>{h.toUpperCase()}</div>
              {list.length ? list.slice(0, 4).map(x => (
                <button key={x.symbol} onClick={() => page?.onOpenHolding?.(x.symbol)}
                  style={{ display: "flex", justifyContent: "space-between", width: "100%", background: "transparent", border: "none", padding: "2px 0", cursor: "pointer", fontFamily: FONT.mono, fontSize: 11, color: t.text }}>
                  <span>{x.symbol}</span><span style={{ color: c }}>{x.pull >= 0 ? "+" : "−"}{Math.abs(x.pull).toFixed(1)} pts</span>
                </button>
              )) : <Muted size={10.5}>{h === "Lifting it" ? "Nothing above the book's average." : "Nothing below the book's average."}</Muted>}
            </div>
          ))}
        </div>
      )}
      {axis.missing?.length > 0 && <Muted size={10} style={{ marginTop: 6 }}>No reading: {axis.missing.map(m => `${m.symbol} (${m.reason})`).join("; ")}. Not scored as neutral.</Muted>}
    </div>
  );
}

export function HealthAxesView({ status, reason, asOf, source, basis, coverage, stale, axes = [], mandate, risk, riskReason, textAlt, size = "m", props = {}, page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("rings");
  const [sel, setSel] = useState(null);
  const selected = axes.find(a => a.key === sel) ?? null;
  return (
    <Frame id="health-axes" label="Portfolio health" title="Five axes, no grade"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Health form" value={form} onChange={setForm} options={[{ value: "rings", label: "Rings" }, { value: "card", label: "Card" }, { value: "lifts", label: "Lifts" }, { value: "cluster", label: "+Risk" }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Each axis is the value-weighted average of that component across holdings that produced a reading (0-100). Deliberately no overall grade: combining the axes would need weights nothing here can justify." />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={200}>
        {axes.length > 0 && (
          <>
            {form === "rings" && (
              <div role="list" style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
                {axes.map((a, i) => (
                  <button key={a.key} role="listitem" onClick={() => setSel(s => s === a.key ? null : a.key)} aria-pressed={sel === a.key} title={a.description}
                    style={{ background: sel === a.key ? t.surfaceInset : "transparent", border: "none", borderRadius: 6, padding: 4, cursor: "pointer" }}>
                    <Ring value={a.score} label={a.label} sub={`${a.coverage}% covered`} colour={cat(t, i)} size={size === "s" ? 52 : 62} />
                  </button>
                ))}
              </div>
            )}
            {form === "card" && (
              <div role="table" aria-label="Report card">
                {axes.map(a => (
                  <div role="row" key={a.key} onClick={() => setSel(s => s === a.key ? null : a.key)}
                    style={{ display: "grid", gridTemplateColumns: "90px 1fr 38px 70px", gap: 8, alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${t.borderSubtle}`, cursor: "pointer" }}>
                    <span role="cell" style={{ fontSize: 11.5, color: t.text }}>{a.label}</span>
                    <span role="cell" style={{ position: "relative", height: 6, background: t.surfaceInset, borderRadius: 3 }}>
                      {a.score != null && <span style={{ position: "absolute", inset: 0, width: `${a.score}%`, background: t.info, borderRadius: 3 }} />}
                    </span>
                    <span role="cell" style={{ fontFamily: FONT.mono, fontSize: 11.5, textAlign: "right", color: a.score == null ? t.textFaint : t.text }}>{a.score ?? "——"}</span>
                    <span role="cell" style={{ fontFamily: FONT.mono, fontSize: 10, color: t.textFaint, textAlign: "right" }}>{a.coverage}% cov.</span>
                  </div>
                ))}
              </div>
            )}
            {form === "lifts" && (
              <div>
                {axes.map(a => (
                  <div key={a.key} style={{ padding: "5px 0", borderBottom: `1px solid ${t.borderSubtle}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                      <span style={{ color: t.text }}>{a.label} <span style={{ color: t.textFaint, fontFamily: FONT.mono }}>{a.score ?? "——"}</span></span>
                      <span style={{ fontFamily: FONT.mono, fontSize: 10.5 }}>
                        {a.lifting[0] && <span style={{ color: t.positive }}>↑ {a.lifting[0].symbol} </span>}
                        {a.holdingBack[0] && <span style={{ color: t.negative }}>↓ {a.holdingBack[0].symbol}</span>}
                        {!a.lifting[0] && !a.holdingBack[0] && <span style={{ color: t.textFaint }}>not measured</span>}
                      </span>
                    </div>
                  </div>
                ))}
                <Muted size={10.5} style={{ marginTop: 6 }}>"Lifting" and "holding back" are each holding's pull on the weighted average (size × distance from the mean); the pulls on an axis sum to zero.</Muted>
              </div>
            )}
            {form === "cluster" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 1, color: t.textMuted, marginBottom: 4 }}>RISK · 1Y</div>
                  {risk ? [["Volatility", pct(risk.volPct, { dp: 1, sign: false })], ["Beta", num(risk.beta, { dp: 2 })], ["Max drawdown", pct(risk.maxDrawdownPct, { dp: 1 })], ["Sharpe", num(risk.sharpe, { dp: 2 })]].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "2px 0" }}><span style={{ color: t.textSecondary }}>{k}</span><span style={{ fontFamily: FONT.mono, color: t.text }}>{v}</span></div>
                  )) : <Muted>{riskReason ?? "Risk figures unavailable."}</Muted>}
                </div>
                <div>
                  <div style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 1, color: t.textMuted, marginBottom: 4 }}>HEALTH AXES</div>
                  {axes.map(a => <div key={a.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "2px 0" }}><span style={{ color: t.textSecondary }}>{a.label}</span><span style={{ fontFamily: FONT.mono, color: a.score == null ? t.textFaint : t.text }}>{a.score ?? "——"}</span></div>)}
                </div>
              </div>
            )}
            {props.expanded ? (
              <div style={{ display: "grid", gridTemplateColumns: size === "l" ? "1fr 1fr" : "1fr", columnGap: 18 }}>
                {axes.map(a => <div key={a.key} style={{ borderTop: `1px solid ${t.borderSubtle}`, marginTop: 8 }}><div style={{ fontSize: 12, color: t.text, marginTop: 6 }}>{a.label} <span style={{ fontFamily: FONT.mono, color: t.textFaint }}>{a.score ?? "——"}</span></div><AxisDetail axis={a} page={page} /></div>)}
              </div>
            ) : <AxisDetail axis={selected} page={page} />}
            {!selected && !props.expanded && <Muted size={10.5} style={{ marginTop: 8 }}>Select an axis to see which holdings lift it and hold it back.</Muted>}
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={() => page?.onNavigate?.("analysis")} style={{ background: "transparent", border: "none", color: t.info, cursor: "pointer", fontSize: 11, padding: 0 }}>Open the scorecard and rebalance plan →</button>
              <button onClick={() => page?.onNavigate?.("allocate")} style={{ background: "transparent", border: "none", color: t.info, cursor: "pointer", fontSize: 11, padding: 0 }}>Allocate new cash →</button>
              {mandate && <Muted size={10}>Weighted for {mandate.riskLabel} · {mandate.horizonLabel}</Muted>}
              <Explain title="Why there is no overall grade"><div>The five axes measure different things — delivery, trend, short-term technicals, precedent and cost. A single score would need weights between them that nothing here can defend, so none is shown (decision D-03).</div></Explain>
            </div>
            <SrOnly>{textAlt}</SrOnly>
          </>
        )}
      </StateView>
    </Frame>
  );
}
