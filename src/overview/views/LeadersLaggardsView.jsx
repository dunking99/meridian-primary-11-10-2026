// OV-05: leaders and laggards. Forms: two lists, diverging bars, movers with
// sparklines, window + %/GBP toggles, and a linked-story line that appears
// only when a stored story names that holding.
import React, { useState } from "react";
import { useT, FONT, signColour } from "../../shared/theme.jsx";
import { Frame, StateView, ProvenanceFooter, Segmented, Muted, StaleBadge, SrOnly, Chip } from "../../shared/ui.jsx";
import { Sparkline } from "../../shared/charts/line.jsx";
import { DivergingBars } from "../../shared/charts/bars.jsx";
import { pct, gbp } from "../../shared/format.js";

const fmt = (v, prefs) => prefs.rank === "contribution" && prefs.unit === "gbp" ? gbp(v, { sign: true }) : prefs.rank === "contribution" ? `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)} pp` : pct(v);

function Row({ r, prefs, page, showSpark, showStory }) {
  const t = useT();
  return (
    <div role="listitem" style={{ padding: "4px 0", borderBottom: `1px solid ${t.borderSubtle}` }}>
      <button onClick={() => page?.onOpenHolding?.(r.symbol)} onMouseEnter={() => page?.setSelected?.(r.symbol)} onMouseLeave={() => page?.setSelected?.(null)}
        style={{ display: "grid", gridTemplateColumns: showSpark ? "70px 1fr 70px 64px" : "70px 1fr 64px", gap: 6, alignItems: "center", width: "100%", background: page?.selected === r.symbol ? t.surfaceInset : "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 11.5, fontWeight: 700, color: t.text }}>{r.symbol}</span>
        <span style={{ fontSize: 10.5, color: t.textFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {r.name}{r.unusual?.z != null && Math.abs(r.unusual.z) >= 1.5 && prefs.window === "1D" ? <span style={{ color: t.warning }}> · {Math.abs(r.unusual.z).toFixed(1)}σ</span> : ""}
        </span>
        {showSpark && <Sparkline values={r.spark} width={66} height={18} />}
        <span style={{ fontFamily: FONT.mono, fontSize: 11.5, textAlign: "right", color: signColour(t, r.m) }}>{fmt(r.m, prefs)}</span>
      </button>
      {showStory && r.story && (
        <a href={r.story.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: 10.5, color: t.textMuted, marginTop: 2, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          ↳ {r.story.source}: {r.story.title}
        </a>
      )}
    </div>
  );
}

export function LeadersLaggardsView({ status, reason, asOf, source, basis, coverage, stale, leaders = [], laggards = [], excluded = [], winMeta, prefs, setWindow, setRank, setUnit, textAlt, size = "m", page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("lists");
  const windows = ["1D", "1W", "1M", "YTD", "1Y"];
  return (
    <Frame id="leaders-laggards" index={2} label="Movers" title={<>Leaders <em style={{ fontWeight: 400 }}>&amp;</em> laggards</>}
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Window" value={prefs.window} onChange={setWindow} options={windows} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Return per holding over the window from stored closes at today's quantities; contribution = its weight at the window start × its return (the contributions sum to the book's return). '1D' uses the live day move." />}>
      <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
        <Segmented label="Rank by" value={prefs.rank} onChange={setRank} options={[{ value: "return", label: "Return" }, { value: "contribution", label: "Contribution" }]} />
        {prefs.rank === "contribution" && <Segmented label="Unit" value={prefs.unit} onChange={setUnit} options={[{ value: "pct", label: "pp" }, { value: "gbp", label: "£" }]} />}
        <Segmented label="Form" value={form} onChange={setForm} options={[{ value: "lists", label: "Lists" }, { value: "bars", label: "Bars" }, { value: "spark", label: "Spark" }]} />
      </div>
      <StateView status={status} reason={reason} onRetry={refetch} height={200}>
        {winMeta && !winMeta.available && <Muted>{prefs.window}: {winMeta.reason}</Muted>}
        {form === "bars" ? (
          <DivergingBars summary={textAlt} rows={[...leaders, ...[...laggards].reverse()].map(r => ({ key: r.symbol, label: r.symbol, sub: r.name, value: r.m, display: fmt(r.m, prefs) }))}
            onRow={r => page?.onOpenHolding?.(r.key)} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: size === "l" ? "1fr 1fr" : "1fr", gap: 10 }}>
            {[["Leaders", leaders], ["Laggards", laggards]].map(([h, list]) => (
              <div key={h}>
                <div style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 1.3, color: t.textMuted, margin: "4px 0" }}>{h.toUpperCase()}</div>
                <div role="list">
                  {list.length ? list.map(r => <Row key={r.symbol} r={r} prefs={prefs} page={page} showSpark={form === "spark" || size !== "s"} showStory />)
                    : <Muted size={10.5}>{h === "Leaders" ? "Nothing rose over this window." : "Nothing fell over this window."}</Muted>}
                </div>
              </div>
            ))}
          </div>
        )}
        {winMeta?.available && winMeta.portfolioPct != null && <Muted size={10.5} style={{ marginTop: 6 }}>Book over {prefs.window}: {pct(winMeta.portfolioPct)} ({winMeta.from} → {winMeta.to}){winMeta.benchmarkPct != null ? ` · benchmark ${pct(winMeta.benchmarkPct)}` : ""}.</Muted>}
        {excluded.length > 0 && <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}><Muted size={10}>Excluded:</Muted>{excluded.map(e => <Chip key={e.symbol} title={e.reason}>{e.symbol}</Chip>)}</div>}
        <SrOnly>{textAlt}</SrOnly>
      </StateView>
    </Frame>
  );
}
