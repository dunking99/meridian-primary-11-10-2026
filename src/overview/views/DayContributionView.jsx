// OV-11: what moved today. Forms: waterfall, session contribution bars, movers
// with linked reasons, day-range slider per holding, and the up/flat/down
// proportional ribbon. Market-closed and missing-price states are explicit.
import React, { useState } from "react";
import { useT, FONT, signColour } from "../../shared/theme.jsx";
import { Frame, StateView, ProvenanceFooter, Segmented, Muted, StaleBadge, Chip, SrOnly } from "../../shared/ui.jsx";
import { DivergingBars, Waterfall, RangeTrack } from "../../shared/charts/bars.jsx";
import { gbp, pct } from "../../shared/format.js";

export function UpDownRibbon({ counts, weights, byWeight = false, onPick }) {
  const t = useT();
  const total = byWeight ? (weights.up + weights.down + weights.flat) : (counts.up + counts.down + counts.flat);
  if (!total) return null;
  const segs = [["up", t.positive, "▲"], ["flat", t.textFaint, "▪"], ["down", t.negative, "▼"]];
  return (
    <div role="img" aria-label={`${counts.up} up, ${counts.flat} flat, ${counts.down} down${byWeight ? ` by weight ${weights.up.toFixed(1)}% up, ${weights.down.toFixed(1)}% down` : ""}`}>
      <div style={{ display: "flex", height: 10, borderRadius: 3, overflow: "hidden" }}>
        {segs.map(([k, c]) => {
          const v = byWeight ? weights[k] : counts[k];
          return v > 0 ? <button key={k} onClick={onPick ? () => onPick(k) : undefined} title={`${k}: ${byWeight ? `${v.toFixed(1)}% of the book` : v}`} style={{ width: `${v / total * 100}%`, background: c, border: "none", padding: 0, cursor: onPick ? "pointer" : "default" }} /> : null;
        })}
      </div>
      <div style={{ display: "flex", gap: 10, fontSize: 10.5, fontFamily: FONT.mono, marginTop: 3, color: t.textMuted }}>
        {segs.map(([k, c, g]) => <span key={k} style={{ color: c }}>{g} {byWeight ? `${weights[k].toFixed(1)}%` : counts[k]} {k}</span>)}
      </div>
    </div>
  );
}

export function DayContributionView({ status, data: d, reason, asOf, source, basis, coverage, stale, rows = [], counts, weights, textAlt, size = "m", page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("bars");
  const top = rows.filter(r => r.gbp > 0).slice(0, 5);
  const bottom = rows.filter(r => r.gbp < 0).slice(-4);
  const middle = rows.filter(r => !top.includes(r) && !bottom.includes(r));
  const others = middle.reduce((a, r) => a + r.gbp, 0);
  const closed = d?.marketState && d.marketState !== "REGULAR";
  return (
    <Frame id="day-contribution" index={3} label="What moved today" title="Today's contribution"
      right={<><StaleBadge stale={stale} asOf={asOf} />{d && <span style={{ fontFamily: FONT.mono, fontSize: 11, color: signColour(t, d.net) }}>{gbp(d.net, { sign: true })} net</span>}</>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Each holding: today's value × pct / (100 + pct) against its previous close. The bars sum to the headline day change; unpriced holdings are excluded and named." />}>
      <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
        <Segmented label="Form" value={form} onChange={setForm} options={[{ value: "bars", label: "Bars" }, { value: "waterfall", label: "Waterfall" }, { value: "reasons", label: "Reasons" }, { value: "range", label: "Day range" }]} />
      </div>
      <StateView status={status} reason={reason} onRetry={refetch} height={200}>
        {d && (
          <>
            {closed && <div role="note" style={{ fontSize: 11, color: t.warning, marginBottom: 6 }}>Market state {d.marketState.toLowerCase()} — these are the last session's moves.</div>}
            {d.zeroDay && <Muted>No holding has moved today yet.</Muted>}
            {counts && <div style={{ marginBottom: 8 }}><UpDownRibbon counts={counts} weights={weights} /></div>}
            {form === "bars" && (
              <DivergingBars summary={textAlt} format={v => gbp(v, { sign: true })}
                rows={[...top.map(r => ({ key: r.symbol, label: r.symbol, sub: pct(r.pct), value: r.gbp })),
                  ...(middle.length ? [{ key: "__others", label: "Others", sub: `${middle.length} position${middle.length === 1 ? "" : "s"}`, value: +others.toFixed(2) }] : []),
                  ...bottom.map(r => ({ key: r.symbol, label: r.symbol, sub: pct(r.pct), value: r.gbp }))]}
                onRow={r => r.key !== "__others" && page?.onOpenHolding?.(r.key)} />
            )}
            {form === "waterfall" && (
              <Waterfall summary={textAlt} format={v => gbp(v)} height={size === "s" ? 170 : 210}
                steps={[{ label: "Yesterday", value: 0, kind: "total" }, ...rows.slice(0, 8).map(r => ({ label: r.symbol, value: r.gbp, kind: "step" })),
                  ...(rows.length > 8 ? [{ label: `Others (${rows.length - 8})`, value: +rows.slice(8).reduce((a, r) => a + r.gbp, 0).toFixed(2), kind: "step" }] : []),
                  { label: "Net", value: d.net, kind: "total" }]} onStep={s => page?.onOpenHolding?.(s.label)} />
            )}
            {form === "reasons" && (
              <div role="list">
                {rows.filter(r => r.gbp !== 0).slice(0, 8).map(r => (
                  <div key={r.symbol} role="listitem" style={{ padding: "4px 0", borderBottom: `1px solid ${t.borderSubtle}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT.mono, fontSize: 11.5 }}>
                      <button onClick={() => page?.onOpenHolding?.(r.symbol)} style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", color: t.text, fontFamily: FONT.mono, fontWeight: 700 }}>{r.symbol}</button>
                      <span style={{ color: signColour(t, r.gbp) }}>{gbp(r.gbp, { sign: true })} · {pct(r.pct)}{r.z != null ? <span style={{ color: Math.abs(r.z) >= 1.5 ? t.warning : t.textFaint }}> · {Math.abs(r.z).toFixed(1)}σ</span> : ""}</span>
                    </div>
                    {r.story ? <a href={r.story.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10.5, color: t.textMuted, textDecoration: "none" }}>↳ {r.story.title}</a> : null}
                  </div>
                ))}
                <Muted size={10}>A reason is shown only when a stored story names the holding; otherwise nothing is guessed.</Muted>
              </div>
            )}
            {form === "range" && (
              <div role="list">
                {rows.slice(0, 10).map(r => (
                  <div key={r.symbol} role="listitem" style={{ display: "grid", gridTemplateColumns: "70px 1fr 70px", gap: 8, alignItems: "center", padding: "3px 0" }}>
                    <span style={{ fontFamily: FONT.mono, fontSize: 11 }}>{r.symbol}</span>
                    {r.dayLow != null && r.dayHigh != null ? <RangeTrack low={r.dayLow} high={r.dayHigh} value={r.price} compact /> : <Muted size={10}>no intraday range in the quote</Muted>}
                    <span style={{ fontFamily: FONT.mono, fontSize: 11, textAlign: "right", color: signColour(t, r.pct) }}>{pct(r.pct)}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${t.borderStrong}`, marginTop: 6, paddingTop: 5, fontFamily: FONT.mono, fontSize: 11.5 }}>
              <span style={{ color: t.text }}>Net</span>
              <span style={{ color: signColour(t, d.net) }}>{gbp(d.net, { sign: true })}{d.reconciles ? "" : " (does not match the headline — report this)"}</span>
            </div>
            {d.excluded?.length > 0 && <div style={{ marginTop: 5, display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}><Muted size={10}>Not included:</Muted>{d.excluded.map(e => <Chip key={e.symbol} title={e.reason}>{e.symbol}</Chip>)}</div>}
            <SrOnly>{textAlt}</SrOnly>
          </>
        )}
      </StateView>
    </Frame>
  );
}
