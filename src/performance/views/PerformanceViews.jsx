// Performance-page views: return chart (PF-01), drawdowns (PF-02),
// attribution (PF-03), monthly returns (PF-04), returns by period (PF-05),
// risk-adjusted (PF-06), key numbers (PF-08), calendar years (PF-09), timing
// gap / bridge (PF-11), capture (PF-14).
import React, { useMemo, useState } from "react";
import { useT, FONT, soft, signColour, cat, hatch } from "../../shared/theme.jsx";
import { Frame, StateView, ProvenanceFooter, Segmented, Muted, StaleBadge, Chip, SrOnly, Stat, BasisTag, Explain, NoData } from "../../shared/ui.jsx";
import { LineChart, Sparkline } from "../../shared/charts/line.jsx";
import { DivergingBars, GroupedBars, Dumbbell, Waterfall, Ring, PairedBars } from "../../shared/charts/bars.jsx";
import { HeatGrid, Scatter } from "../../shared/charts/shapes.jsx";
import { gbp, gbpCompact, pct, pp, num, date } from "../../shared/format.js";

const RANGES = ["1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "MAX"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── PF-01 ────────────────────────────────────────────────────
export function ReturnChartView(r) {
  const { status, data: d, reason, asOf, source, basis, coverage, stale, extraSeries = [], benchmarks = [], flows = [], flowsReason, rolling = [], goal, extra, setExtra, basisMode, setBasisMode, rangeFor, size = "m", page, refetch } = r;
  const t = useT();
  const [view, setView] = useState("cumulative");
  const [under, setUnder] = useState("none");
  const pts = d?.points ?? [];
  const dates = pts.map(p => p.date);
  const custom = String(page.period).startsWith("M:");
  const range = custom ? null : rangeFor?.[page.period] ?? "1Y";
  const byDate = s => new Map((s?.points ?? []).map(p => [p.date, p.benchmark]));
  const others = extraSeries.map((s, i) => ({ key: `x${i}`, label: s.benchmark.label, values: dates.map(dt => byDate(s).get(dt) ?? null), colour: cat(t, i + 2), dashed: true, width: 1.1 }));
  // Drawdown underlay from the window's own values.
  let peak = -Infinity;
  const ddVals = pts.map(p => { peak = Math.max(peak, p.value); return (p.value / peak - 1) * 100; });
  const rollMap = new Map(rolling.map(x => [x.date, x.vol]));
  const volVals = dates.map(dt => rollMap.get(dt) ?? null);
  // Deposits line: cumulative net money paid in, stepped at each flow date.
  let cum = 0; const fl = [...flows].sort((a, b) => a.date.localeCompare(b.date));
  const depositVals = dates.map(dt => { cum = fl.filter(f => f.date <= dt).reduce((a, f) => a + f.amount, 0); return fl.length ? cum : null; });
  const series = view === "value"
    ? [{ key: "value", label: "Portfolio £", values: pts.map(p => p.value), colour: t.text, area: true }, ...(fl.length ? [{ key: "dep", label: "Net paid in £", values: depositVals, colour: t.info, dashed: true }] : [])]
    : view === "excess"
      ? [{ key: "rel", label: `Portfolio ÷ ${d?.benchmark?.label ?? "benchmark"} (100 = level)`, values: pts.map(p => p.relative), colour: t.text }]
      : [{ key: "portfolio", label: view === "growth" ? "£100 in the book" : "Portfolio", values: pts.map(p => p.portfolio), colour: t.text, width: 1.9 },
         { key: "benchmark", label: d?.benchmark?.label ?? "Benchmark", values: pts.map(p => p.benchmark), colour: t.benchmark, dashed: true }, ...others];
  const fmt = view === "value" ? v => gbpCompact(v) : view === "growth" ? v => `£${v.toFixed(0)}` : view === "excess" ? v => v.toFixed(1) : v => `${v - 100 >= 0 ? "+" : ""}${(v - 100).toFixed(0)}%`;
  const markers = [
    ...(d?.peak && pts.findIndex(p => p.date === d.peak.date) >= 0 ? [{ i: pts.findIndex(p => p.date === d.peak.date), label: "record high", colour: t.textMuted }] : []),
    ...fl.map(f => ({ i: pts.findIndex(p => p.date >= f.date), label: `${f.amount >= 0 ? "+" : "−"}£${Math.abs(f.amount / 1000).toFixed(0)}k`, colour: t.info })).filter(m => m.i > 0),
  ];
  const last = pts[pts.length - 1];
  const summary = last ? `Portfolio ${pct(last.portfolio - 100)} against ${d.benchmark.label} ${last.benchmark != null ? pct(last.benchmark - 100) : "n/a"} from ${date(pts[0].date)} to ${date(last.date)}.` : "";
  const rangeDisabled = Object.fromEntries(RANGES.map(x => [x, d?.fillable && d.fillable[x] !== true ? (d.fillable[x] || "Not enough history") : false]));
  return (
    <Frame id="return-chart" index={1} label="Return chart" title={<>Portfolio <em style={{ fontWeight: 400 }}>against</em> the benchmarks</>}
      right={<><StaleBadge stale={stale} asOf={asOf} /><BasisTag basis={basis ?? basisMode} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Rebased to 100 at the window start, joined on date (a benchmark missing a day is a gap). The drawdown underlay is measured within the window; rolling volatility is 63-day, annualised." />}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
        <div role="group" aria-label="Primary benchmark" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {benchmarks.map(b => <Chip key={b.symbol} active={page.benchmark === b.symbol} onClick={() => page.setBenchmark(b.symbol)} title={b.note}>{b.label}</Chip>)}
        </div>
        <span style={{ fontSize: 10, color: t.textFaint }}>+ also draw:</span>
        {benchmarks.filter(b => b.symbol !== page.benchmark).map(b => <Chip key={`x${b.symbol}`} active={extra.includes(b.symbol)} onClick={() => setExtra(e => e.includes(b.symbol) ? e.filter(x => x !== b.symbol) : [...e, b.symbol].slice(-2))}>{b.label}</Chip>)}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
        <Segmented label="View" value={view} onChange={setView} options={[{ value: "cumulative", label: "% return" }, { value: "growth", label: "Growth of £100" }, { value: "excess", label: "Excess" }, { value: "value", label: "Value" }]} />
        <Segmented label="Underlay" value={under} onChange={setUnder} options={[{ value: "none", label: "No underlay" }, { value: "dd", label: "Drawdown" }, { value: "vol", label: "Rolling vol" }]} />
        <Segmented label="Basis" value={basisMode} onChange={setBasisMode} options={[{ value: "reconstructed", label: "Reconstructed" }, { value: "recorded", label: "Recorded" }]} />
        <span style={{ flex: 1 }} />
        <Segmented label="Range" value={range} onChange={v => page.setPeriod(v)} options={RANGES} disabled={rangeDisabled} />
      </div>
      {custom && <div role="status" style={{ fontSize: 11, color: t.info, marginBottom: 4 }}>Showing {page.period.slice(2)} (clicked on the monthly grid). <button onClick={() => page.setPeriod("1Y")} style={{ background: "transparent", border: "none", color: t.info, cursor: "pointer", textDecoration: "underline" }}>back to 1Y</button></div>}
      <StateView status={status} reason={reason} onRetry={refetch} height={300}>
        {pts.length > 1 && (
          <>
            <LineChart dates={dates} series={series} band={view === "cumulative" || view === "growth" ? { a: "portfolio", b: "benchmark" } : null} markers={markers}
              underlay={under === "dd" ? { values: ddVals, label: "Drawdown from window peak", format: v => `${v.toFixed(0)}%` } : under === "vol" ? { values: volVals.map(v => v == null ? null : -v), label: "Rolling 63-day volatility (drawn downward)", format: v => `${Math.abs(v).toFixed(0)}%` } : null}
              height={size === "l" ? 380 : 320} baseline={view === "value" ? null : 100} format={fmt} summary={summary} />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 10.5, color: t.textMuted, fontFamily: FONT.mono, marginTop: 4 }}>
              {view !== "value" && view !== "excess" && <span><span style={{ color: t.positive }}>▨</span> ahead · <span style={{ color: t.negative }}>▨</span> behind {d.benchmark.label}</span>}
              {view === "value" && !fl.length && <span>No deposits line: {flowsReason ?? "no cash flows recorded"}.</span>}
              {goal?.goal && <span>Goal {gbpCompact(goal.goal.target)} by {date(goal.goal.targetDate)}: {goal.probabilityPct}% of resampled paths reach it (see Analysis → Monte Carlo; not drawn on a history chart).</span>}
              {!goal && <span>No goal set, so no glide path.</span>}
            </div>
          </>
        )}
      </StateView>
      <SrOnly>{summary}</SrOnly>
    </Frame>
  );
}

// ─── PF-02 ────────────────────────────────────────────────────
export function DrawdownsView({ status, data: d, reason, asOf, source, basis, coverage, stale, note, size = "m", page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("episodes");
  const [hi, setHi] = useState(null);
  const under = d?.underwater ?? [];
  const ep = d?.episodes ?? [];
  const sel = hi != null ? ep[hi] : null;
  const markers = sel ? [{ i: under.findIndex(u => u.date === sel.peakDate), label: "peak", colour: t.textMuted }, { i: under.findIndex(u => u.date === sel.troughDate), label: "trough", colour: t.negative }, ...(sel.recoveryDate ? [{ i: under.findIndex(u => u.date === sel.recoveryDate), label: "recovered", colour: t.positive }] : [])] : [];
  const st = d?.stats;
  return (
    <Frame id="drawdowns" index={5} label="Worst drops" title={<>Biggest falls <em style={{ fontWeight: 400 }}>and</em> how long they lasted</>}
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Form" value={form} onChange={setForm} options={[{ value: "episodes", label: "Episodes" }, { value: "underwater", label: "Underwater" }, { value: "scatter", label: "Depth vs recovery" }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} note={note} method="An episode opens when the value falls below its running peak and closes on the first day it regains it. One that has not is ongoing and says so." />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={220}>
        {st && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", marginBottom: 6 }}>
            <Stat size="s" label="Now" value={pct(st.currentPct, { dp: 1 })} sign={st.currentPct} sub={st.ongoing ? "an episode is ongoing" : "at a peak"} />
            <Stat size="s" label="Deepest" value={pct(st.maxPct, { dp: 1 })} sign={st.maxPct} />
            <Stat size="s" label="Longest" value={st.longestDays != null ? `${st.longestDays} days` : null} sub={st.longestFrom ? `from ${date(st.longestFrom)}` : null} reason="No episode" />
            <Stat size="s" label="Avg recovery" value={st.averageRecoveryDays != null ? `${st.averageRecoveryDays} days` : null} reason="No recovered episode yet" sub={`${st.count} episodes ≥ ${st.minDepthPct}%`} />
          </div>
        )}
        {(form === "underwater" || sel) && under.length > 1 && (
          <LineChart dates={under.map(u => u.date)} series={[{ key: "dd", label: "Below peak", values: under.map(u => u.pct), colour: t.negative, area: true }]} height={160} format={v => `${v.toFixed(0)}%`} markers={markers}
            summary={`Underwater curve: currently ${pct(st?.currentPct)} below peak, deepest ${pct(st?.maxPct)}.`} />
        )}
        {form === "episodes" && (
          <div role="table" aria-label="Drawdown episodes">
            {ep.map((e, i) => (
              <div role="row" key={e.peakDate} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} onFocus={() => setHi(i)} tabIndex={0}
                style={{ display: "grid", gridTemplateColumns: "22px 1fr 76px 110px", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${t.borderSubtle}`, background: hi === i ? t.surfaceInset : "transparent", outline: "none" }}>
                <span role="cell" style={{ fontFamily: FONT.serif, fontSize: 16, color: t.textMuted }}>{e.rank}</span>
                <span role="cell" style={{ fontSize: 11.5, color: t.text }}>{date(e.peakDate)} → {date(e.troughDate)}
                  <div style={{ fontSize: 10, color: t.textFaint }}>{e.daysDown} days down · {e.ongoing ? <span style={{ color: t.warning }}>ongoing — not yet recovered</span> : `recovered in ${e.daysToRecover} days (${date(e.recoveryDate)})`}{e.benchmarkDepthPct != null ? ` · benchmark ${pct(e.benchmarkDepthPct, { dp: 1 })}` : ""}</div></span>
                <span role="cell" style={{ fontFamily: FONT.serif, fontSize: 18, color: t.negative, textAlign: "right" }}>{pct(e.depthPct, { dp: 1 })}</span>
                <span role="cell"><Sparkline values={e.path} width={104} height={24} colour={t.negative} label={`Path from peak to ${e.ongoing ? "now" : "recovery"}`} /></span>
              </div>
            ))}
            {!ep.length && <Muted>No drawdown of 1% or more in the stored history.</Muted>}
          </div>
        )}
        {form === "scatter" && ep.length > 0 && (
          <Scatter points={ep.map((e, i) => ({ x: e.totalDays, y: e.depthPct, r: Math.abs(e.depthPct), label: `#${e.rank}`, colour: e.ongoing ? t.warning : t.negative }))} xLabel="days from peak to recovery (or now)" yLabel="depth %" xFormat={v => v.toFixed(0)} yFormat={v => `${v.toFixed(0)}%`} height={220}
            summary={`${ep.length} episodes: depth against days to recover.`} />
        )}
      </StateView>
    </Frame>
  );
}

// ─── PF-03 ────────────────────────────────────────────────────
export function AttributionView({ status, data: d, reason, asOf, source, basis, coverage, stale, note, overTime, overTimeReason, timing, timingReason, mwr, twr, grouping, setGrouping, lookback, setLookback, size = "m", page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("bars");
  const pc = v => pct(v * 100, { dp: 2 });
  const holdings = d?.holdings ?? [];
  const groups = d?.groups ?? [];
  return (
    <Frame id="attribution" index={4} label="Contribution" title={<>What drove the return, <em style={{ fontWeight: 400 }}>in context</em></>}
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Window" value={lookback} onChange={setLookback} options={[{ value: 63, label: "3M" }, { value: 252, label: "1Y" }, { value: 750, label: "3Y" }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} note={note} method="Cariño-linked daily contributions (weight at yesterday's close × today's return), so the parts sum to the compounded total. Allocation and selection are measured against the portfolio's own average, not an index." />}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
        <Segmented label="Group" value={grouping} onChange={setGrouping} options={[{ value: "sector", label: "Sector" }, { value: "assetClass", label: "Class" }, { value: "wrapper", label: "Wrapper" }, { value: "currency", label: "Currency" }]} />
        <Segmented label="Form" value={form} onChange={setForm} options={[{ value: "bars", label: "By holding" }, { value: "groups", label: "By group" }, { value: "waterfall", label: "Waterfall" }, { value: "effects", label: "Alloc / select" }, { value: "time", label: "Over time" }, { value: "timing", label: "Timing" }]} />
      </div>
      <StateView status={status} reason={reason} onRetry={refetch} height={220}>
        {d && (
          <>
            <div style={{ fontFamily: FONT.mono, fontSize: 11, color: t.textSecondary, marginBottom: 6 }}>
              {date(d.from)} → {date(d.to)} · book {pc(d.totalReturn)}{d.benchmark?.available ? ` · ${d.benchmark.symbol} ${pc(d.benchmark.benchmarkReturn)} (${pp(d.benchmark.excess * 100)})` : ""} · {d.reconciles ? "parts reconcile to the total" : "does NOT reconcile — report this"}
            </div>
            {form === "bars" && <DivergingBars summary={`Contributions: ${holdings.slice(0, 5).map(h => `${h.symbol} ${pc(h.contribution)}`).join(", ")}`} format={pc} rows={holdings.map(h => ({ key: h.symbol, label: h.symbol, sub: `avg weight ${(h.averageWeight * 100).toFixed(1)}%`, value: h.contribution * 100, display: pc(h.contribution) }))} onRow={r => page?.onOpenHolding?.(r.key)} />}
            {form === "groups" && (
              <div role="table">
                <div role="row" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 6, fontFamily: FONT.mono, fontSize: 9.5, color: t.textMuted, borderBottom: `1px solid ${t.border}`, padding: "3px 0" }}><span>GROUP</span><span>CONTRIBUTION</span><span>ALLOCATION</span><span title="Group selection sums to zero by construction; the spread shows how much moved between its members">SELECTION SPREAD</span></div>
                {groups.map(g => <div role="row" key={g.group} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 6, fontFamily: FONT.mono, fontSize: 11, padding: "4px 0", borderBottom: `1px solid ${t.borderSubtle}` }}>
                  <span style={{ fontFamily: FONT.sans }}>{g.group} <span style={{ color: t.textFaint }}>({g.holdingCount})</span></span><span style={{ color: signColour(t, g.contribution) }}>{pc(g.contribution)}</span><span style={{ color: signColour(t, g.allocation) }}>{pc(g.allocation)}</span><span>{pc(g.selectionSpread)}</span></div>)}
                <Muted size={10}>Allocation effects sum to {pc(d.allocationSum ?? 0)} (zero by construction). Selection within a group sums to zero, so the spread is shown instead.</Muted>
              </div>
            )}
            {form === "waterfall" && <Waterfall summary="Contribution waterfall" format={v => `${v.toFixed(1)}%`} height={230} steps={[{ label: "Start", value: 0, kind: "total" }, ...holdings.slice(0, 9).map(h => ({ label: h.symbol, value: +(h.contribution * 100).toFixed(3), kind: "step" })), ...(holdings.length > 9 ? [{ label: `Others (${holdings.length - 9})`, value: +(holdings.slice(9).reduce((a, h) => a + h.contribution, 0) * 100).toFixed(3), kind: "step" }] : []), { label: "Total", value: +(d.totalReturn * 100).toFixed(3), kind: "total" }]} onStep={s => page?.onOpenHolding?.(s.label)} />}
            {form === "effects" && (
              <div role="table">
                {holdings.map(h => <div role="row" key={h.symbol} style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr", gap: 6, fontFamily: FONT.mono, fontSize: 11, padding: "3px 0", borderBottom: `1px solid ${t.borderSubtle}` }}>
                  <span>{h.symbol}</span><span title="what it would have added earning the book's average">base {pc(h.baseline)}</span><span style={{ color: signColour(t, h.allocation) }}>alloc {pc(h.allocation)}</span><span style={{ color: signColour(t, h.selection) }}>select {pc(h.selection)}</span></div>)}
                <Muted size={10}>Allocation: the holding's group beating the book. Selection: the holding beating its own group. Both against this portfolio, not an index.</Muted>
              </div>
            )}
            {form === "time" && (overTime ? (
              <GroupedBars summary="Monthly return split by holding" categories={overTime.months.map(m => m.month.slice(2))} series={[{ key: "r", label: "Month return", colour: cat(t, 0) }]}
                values={overTime.months.map(m => [m.returnPct])} partial={Object.fromEntries(overTime.months.filter(m => m.partial).map(m => [m.month.slice(2), true]))} format={v => `${v.toFixed(1)}%`} height={190} />
            ) : <Muted>{overTimeReason}</Muted>)}
            {form === "time" && overTime && <Muted size={10}>Each month's bar is the sum of its holdings' contributions (they reconcile exactly{overTime.reconciles ? "" : " — NOT this time"}); hover a month for the split in the table below. The latest month is partial (*).</Muted>}
            {form === "time" && overTime && (
              <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", fontFamily: FONT.mono, fontSize: 10 }}><tbody>
                {overTime.symbols.map(s => <tr key={s}><td style={{ padding: "1px 6px", color: t.text }}>{s}</td>{overTime.months.map(m => { const v = m.parts.find(p => p.symbol === s)?.contributionPct; return <td key={m.month} style={{ padding: "1px 4px", color: signColour(t, v), textAlign: "right" }}>{v == null ? "" : v.toFixed(2)}</td>; })}</tr>)}
              </tbody></table></div>
            )}
            {form === "timing" && (
              <div style={{ fontSize: 12, color: t.textSecondary, lineHeight: 1.6 }}>
                {timing ? <><b style={{ color: signColour(t, timing.gapPct) }}>{pp(timing.gapPct)}</b> — {timing.verdict}</> : <>Timing and cash flows: {mwr?.available === false ? mwr.reason : timingReason ?? "not measurable yet."}</>}
                <Muted size={10.5}>This decomposition replays today's holdings; it cannot see when money arrived. The timing effect is the gap between money-weighted and time-weighted returns (Timing gap panel).</Muted>
              </div>
            )}
          </>
        )}
      </StateView>
    </Frame>
  );
}

// ─── PF-04 ────────────────────────────────────────────────────
export function MonthlyView({ status, data: d, reason, asOf, source, basis, coverage, stale, mode, setMode, size = "m", page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("heat");
  const months = d?.months ?? [];
  const years = [...new Set(months.map(m => m.year))];
  const val = m => mode === "excess" ? m.excessPp : m.pct;
  const cells = years.map(y => Array.from({ length: 12 }, (_, k) => { const m = months.find(x => x.year === y && x.m === k + 1); return m ? { v: val(m), partial: m.partial, title: `${MONTHS[k]} ${y}: ${pct(m.pct, { dp: 2 })}${m.benchmark != null ? ` · benchmark ${pct(m.benchmark, { dp: 2 })}` : ""}${m.partial ? ` · partial (${m.partialReason})` : ""}` } : null; }));
  const totals = years.map(y => { const yr = d?.years?.find(x => x.year === y); return yr ? { v: mode === "excess" ? yr.excessPp : yr.pct, partial: yr.partial || yr.sparse } : null; });
  const summary = `${months.length} months; hit rate ${d?.hitRate ?? "n/a"}% over ${d?.completeMonths ?? 0} complete months.`;
  return (
    <Frame id="monthly" index={6} label="Monthly returns" title={<>The whole record, <em style={{ fontWeight: 400 }}>month by month</em></>}
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Show" value={mode} onChange={setMode} options={[{ value: "portfolio", label: "Portfolio" }, { value: "excess", label: "Excess vs benchmark" }]} /><Segmented label="Form" value={form} onChange={setForm} options={[{ value: "heat", label: "Heatmap" }, { value: "table", label: "Table" }, { value: "winloss", label: "Win / loss" }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Month return = last stored close of the month / last close of the previous month − 1. Partial months (first and current) are dashed; years with thin coverage are starred." />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={200}>
        {d && form === "heat" && <HeatGrid rows={years} cols={MONTHS} cells={cells} rowTotals={totals} clip={mode === "excess" ? 3 : 6} summary={summary}
          format={v => `${v >= 0 ? "+" : ""}${v.toFixed(1)}${mode === "excess" ? "" : "%"}`} onCell={(y, c) => page?.setPeriod?.(`M:${y}-${String(MONTHS.indexOf(c) + 1).padStart(2, "0")}`)} />}
        {d && form === "table" && (
          <div role="table" style={{ maxHeight: 260, overflowY: "auto" }}>
            {[...months].reverse().map(m => <div role="row" key={m.month} style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr", fontFamily: FONT.mono, fontSize: 11, padding: "2px 0", borderBottom: `1px solid ${t.borderSubtle}` }}>
              <span>{m.month}{m.partial ? "*" : ""}</span><span style={{ color: signColour(t, m.pct) }}>{pct(m.pct)}</span><span style={{ color: t.textMuted }}>{pct(m.benchmark)}</span><span style={{ color: signColour(t, m.excessPp) }}>{pp(m.excessPp, { dp: 2 })}</span></div>)}
          </div>
        )}
        {d && form === "winloss" && (
          <div>
            <div style={{ fontFamily: FONT.mono, fontSize: 12, color: t.text, marginBottom: 6 }}>Hit rate {d.hitRate ?? "——"}% · {months.filter(m => !m.partial && m.pct > 0).length} up / {months.filter(m => !m.partial && m.pct < 0).length} down of {d.completeMonths} complete months</div>
            {years.map(y => <div key={y} style={{ display: "flex", gap: 3, alignItems: "center", marginBottom: 3 }}><span style={{ fontFamily: FONT.mono, fontSize: 10.5, width: 40 }}>{y}</span>
              {Array.from({ length: 12 }, (_, k) => { const m = months.find(x => x.year === y && x.m === k + 1); return <span key={k} title={m ? `${MONTHS[k]} ${pct(m.pct)}` : "no data"} style={{ width: 18, height: 18, borderRadius: 3, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, background: !m ? hatch(t) : m.pct >= 0 ? soft(t.positive, 55) : soft(t.negative, 55), color: t.text, border: m?.partial ? `1px dashed ${t.textMuted}` : "none" }}>{m ? (m.pct >= 0 ? "▲" : "▼") : ""}</span>; })}</div>)}
          </div>
        )}
        {d && (
          <div style={{ display: "grid", gridTemplateColumns: `70px repeat(12, minmax(34px, 1fr)) ${form === "heat" ? "70px" : ""}`, gap: 2, marginTop: 4, fontFamily: FONT.mono, fontSize: 9.5 }} aria-label="Average return for each calendar month over complete months">
            <span style={{ color: t.textMuted }}>avg</span>
            {d.seasonality.map(s => <span key={s.m} title={`${s.count} complete ${MONTHS[s.m - 1]}s`} style={{ textAlign: "center", color: s.average == null ? t.textFaint : signColour(t, s.average) }}>{s.average == null ? "—" : s.average.toFixed(1)}</span>)}
          </div>
        )}
        {d && <Muted size={10}>Click a month on the heatmap to show it on the return chart. Seasonality row: average of complete months only — a description of the record, not a pattern to trade.</Muted>}
      </StateView>
    </Frame>
  );
}

// ─── PF-05 ────────────────────────────────────────────────────
export function PeriodsTableView({ status, data: d, others = [], reason, asOf, source, basis, coverage, stale, size = "m", page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("table");
  const rows = d?.rows ?? [];
  const bOf = (o, p) => o.rows.find(r => r.period === p);
  const ok = rows.filter(r => r.available);
  return (
    <Frame id="periods" index={2} label="Returns by period" title={<>Portfolio, benchmark, <em style={{ fontWeight: 400 }}>and the gap</em></>}
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Form" value={form} onChange={setForm} options={[{ value: "table", label: "Table" }, { value: "ladder", label: "Ladder" }, { value: "spark", label: "Windows" }, { value: "dual", label: "Dual bars" }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Each window from the last close on or before its start. 3Y, 5Y and max are also annualised. A window the history cannot fill is shown as unavailable, never shortened." />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={200}>
        {d && form === "table" && (
          <div role="table" aria-label="Returns by period">
            <div role="row" style={{ display: "grid", gridTemplateColumns: `60px 1fr ${others.map(() => "1fr").join(" ")} 1fr 1.2fr`, gap: 6, fontFamily: FONT.mono, fontSize: 9.5, color: t.textMuted, borderBottom: `1px solid ${t.borderStrong}`, padding: "4px 0" }}>
              <span>PERIOD</span><span>PORTFOLIO</span><span>{d.benchmark.label}</span>{others.map(o => <span key={o.benchmark.symbol}>{o.benchmark.label}</span>)}<span>DIFFERENCE</span>
            </div>
            {rows.map(r => (
              <button role="row" key={r.period} disabled={!r.available} onClick={() => page?.setPeriod?.(r.period === "ITD" ? "MAX" : r.period)} title={r.available ? `${r.from} to ${r.to}, ${r.bars} bars` : r.reason}
                style={{ display: "grid", gridTemplateColumns: `60px 1fr ${others.map(() => "1fr").join(" ")} 1fr 1.2fr`, gap: 6, width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${t.borderSubtle}`, padding: "6px 0", textAlign: "left", fontFamily: FONT.mono, fontSize: 11.5, color: r.available ? t.text : t.textFaint, cursor: r.available ? "pointer" : "not-allowed" }}>
                <span>{r.period === "ITD" ? "MAX" : r.period}</span>
                {r.available ? <>
                  <span style={{ color: signColour(t, r.portfolio) }}>{pct(r.portfolio, { dp: 1 })}{r.portfolioAnnualised != null && <div style={{ fontSize: 9.5, color: t.textFaint }}>{pct(r.portfolioAnnualised, { dp: 1 })} p.a.</div>}</span>
                  <span>{pct(r.benchmark, { dp: 1 })}</span>
                  {others.map(o => <span key={o.benchmark.symbol} style={{ color: t.textSecondary }}>{pct(bOf(o, r.period)?.benchmark, { dp: 1 })}</span>)}
                  <span style={{ color: signColour(t, r.excessPp) }}>{pp(r.excessPp)}</span>
                  <span style={{ position: "relative", height: 8, alignSelf: "center" }}>{r.excessPp != null && <span style={{ position: "absolute", left: r.excessPp >= 0 ? "50%" : `${50 - Math.min(50, Math.abs(r.excessPp) * 2)}%`, width: `${Math.min(50, Math.abs(r.excessPp) * 2)}%`, top: 0, bottom: 0, background: signColour(t, r.excessPp) }} />}<span style={{ position: "absolute", left: "50%", top: -2, bottom: -2, width: 1, background: t.borderStrong }} /></span>
                </> : <span style={{ gridColumn: "span 5", fontFamily: FONT.sans, fontSize: 10.5 }}>{r.reason}</span>}
              </button>
            ))}
            <Muted size={10}>Difference is against {d.benchmark.label}. Click a period to show it on the return chart.</Muted>
          </div>
        )}
        {d && form === "ladder" && <DivergingBars summary="Returns by period" format={v => pct(v, { dp: 1 })} rows={ok.map(r => ({ key: r.period, label: r.period === "ITD" ? "MAX" : r.period, sub: `bench ${pct(r.benchmark, { dp: 1 })}`, value: r.portfolio }))} onRow={r => page?.setPeriod?.(r.key === "MAX" ? "MAX" : r.key)} />}
        {d && form === "dual" && <GroupedBars summary="Portfolio and benchmark by period" categories={ok.map(r => r.period === "ITD" ? "MAX" : r.period)} series={[{ key: "p", label: "Portfolio", colour: t.text }, { key: "b", label: d.benchmark.label, colour: t.benchmark }]} values={ok.map(r => [r.portfolio, r.benchmark])} height={200} />}
        {d && form === "spark" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 8 }}>
            {rows.map(r => <div key={r.period} style={{ background: t.surfaceInset, borderRadius: 5, padding: 6 }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: t.textMuted }}>{r.period === "ITD" ? "MAX" : r.period}</div>
              {r.available ? <>
                <div style={{ fontFamily: FONT.mono, fontSize: 14, color: signColour(t, r.portfolio) }}>{pct(r.portfolio, { dp: 1 })}</div>
                <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 20 }}><span style={{ width: 10, height: `${Math.min(100, Math.abs(r.portfolio) * 2)}%`, background: signColour(t, r.portfolio) }} /><span style={{ width: 10, height: `${Math.min(100, Math.abs(r.benchmark ?? 0) * 2)}%`, background: t.benchmark }} /></div>
              </> : <Muted size={10}>not enough history</Muted>}
            </div>)}
          </div>
        )}
      </StateView>
    </Frame>
  );
}

// ─── PF-06 ────────────────────────────────────────────────────
export function RiskAdjustedView({ status, data: d, reason, asOf, source, basis, coverage, stale, note, window, setWindow, size = "m", refetch }) {
  const t = useT();
  const [form, setForm] = useState("grid");
  const ro = d?.rolling ?? [];
  return (
    <Frame id="risk-adjusted" index={7} label="Risk-adjusted" title="Return for the risk taken"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Window" value={window} onChange={setWindow} options={["1Y", "3Y", "MAX"]} /><Segmented label="Form" value={form} onChange={setForm} options={[{ value: "grid", label: "Grid" }, { value: "rolling", label: "Rolling" }, { value: "gauges", label: "Gauges" }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} note={note} method="From the reconstructed daily series. Sharpe and Sortino subtract the stated risk-free rate. Beta and alpha are joined on date with the benchmark and need 120 shared days." />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={160}>
        {d && form === "grid" && (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${size === "s" ? 2 : 4}, minmax(0,1fr))` }}>
            <Stat size="s" label="CAGR" value={pct(d.cagrPct, { dp: 1 })} sign={d.cagrPct} sub={`${date(d.from)} → ${date(d.to)}`} />
            <Stat size="s" label="Volatility" value={pct(d.volPct, { dp: 1, sign: false })} sub={d.benchmarkVolPct != null ? `${d.benchmark.label} ${pct(d.benchmarkVolPct, { dp: 1, sign: false })}` : null} />
            <Stat size="s" label="Sharpe" value={num(d.sharpe)} sub={`rf ${d.riskFreePct}%`} />
            <Stat size="s" label="Sortino" value={num(d.sortino)} />
            <Stat size="s" label="Calmar" value={num(d.calmar)} />
            <Stat size="s" label="Max drawdown" value={pct(d.maxDrawdownPct, { dp: 1 })} sign={d.maxDrawdownPct} sub={d.maxDrawdownWindow} />
            <Stat size="s" label="Beta" value={d.beta != null ? num(d.beta) : null} reason={d.betaReason} sub={`vs ${d.benchmark.label}`} />
            <Stat size="s" label="Alpha" value={d.alphaPct != null ? pct(d.alphaPct, { dp: 1 }) : null} reason={d.betaReason} sub="a year, CAPM" />
          </div>
        )}
        {d && form === "rolling" && ro.length > 1 && (
          <div style={{ display: "grid", gridTemplateColumns: size === "s" ? "1fr" : "repeat(3, minmax(0,1fr))", gap: 8 }}>
            {[["vol", "Rolling volatility %", v => `${v.toFixed(0)}%`], ["sharpe", "Rolling Sharpe", v => v.toFixed(1)], ["beta", "Rolling beta", v => v.toFixed(2)]].map(([k, l, f]) => (
              <div key={k}><div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: t.textMuted }}>{l} · {d.rollingWindow} days</div>
                {ro.some(x => x[k] != null) ? <LineChart dates={ro.map(x => x.date)} series={[{ key: k, label: l, values: ro.map(x => x[k]), colour: t.text }]} height={110} format={f} summary={`${l} from ${f(ro.find(x => x[k] != null)[k])} to ${f([...ro].reverse().find(x => x[k] != null)[k])}`} /> : <Muted>{d.betaReason ?? "Not measurable."}</Muted>}</div>
            ))}
          </div>
        )}
        {d && form === "gauges" && (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "space-around" }}>
            <Ring value={d.volPct} max={40} label="Volatility" sub={`% a year, on a 0–40 scale`} colour={cat(t, 0)} />
            <Ring value={d.sharpe != null ? Math.max(0, d.sharpe) : null} max={3} label="Sharpe" sub="0–3 scale; negative shows as 0" colour={cat(t, 1)} />
            <Ring value={d.beta} max={2} label="Beta" sub="0–2 scale" colour={cat(t, 2)} />
            <Ring value={Math.abs(d.maxDrawdownPct ?? 0)} max={60} label="Max drawdown" sub="% below peak, 0–60 scale" colour={t.negative} />
          </div>
        )}
        {d && form === "gauges" && <Muted size={10}>Each ring states its own scale. None of these is combined into a score.</Muted>}
      </StateView>
    </Frame>
  );
}

// ─── PF-08 ────────────────────────────────────────────────────
export function KeyNumbersView({ status, reason, asOf, source, basis, coverage, stale, mwr, twr, timing, risk, riskReason, itd, benchmark, best, worst, dd, size = "m", page, refetch }) {
  const t = useT();
  return (
    <Frame id="key-numbers" label="Performance" right={<StaleBadge stale={stale} asOf={asOf} />}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Money-weighted (XIRR on the ledger) answers 'what did my money earn'; time-weighted (chain-linked snapshots) answers 'what did the strategy earn' and is the one comparable to an index. The gap between them is the effect of timing." />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={80}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${size === "s" ? 2 : 8}, minmax(0,1fr))` }}>
          <Stat size="s" label="Money-weighted" value={mwr?.available ? pct(mwr.annualisedPct, { dp: 1 }) : null} sign={mwr?.annualisedPct} reason={mwr?.reason} sub={mwr?.available ? `a year since ${date(mwr.firstFlow)}` : "needs the cash-flow ledger"}
            explain={<Explain title="Money-weighted return"><div>{mwr?.meaning ?? mwr?.reason}</div></Explain>} />
          <Stat size="s" label="Time-weighted" value={twr?.available ? pct(twr.annualisedPct ?? twr.cumulativePct, { dp: 1 }) : null} sign={twr?.cumulativePct} reason={twr?.reason} sub={twr?.available ? (twr.annualisedPct != null ? "a year, recorded" : `cumulative, ${twr.snapshots} snapshots`) : "needs recorded snapshots"}
            explain={<Explain title="Time-weighted return"><div>{twr?.meaning ?? twr?.reason}{twr?.coverageNote ? ` ${twr.coverageNote}` : ""}</div></Explain>} />
          <Stat size="s" label={`Reconstructed · max`} value={itd?.available ? pct(itd.portfolio, { dp: 1 }) : null} sign={itd?.portfolio} sub={itd?.available ? `${pct(itd.portfolioAnnualised, { dp: 1 })} a year` : itd?.reason} />
          <Stat size="s" label={benchmark ? `${benchmark.label} · same dates` : "Benchmark"} value={itd?.available ? pct(itd.benchmark, { dp: 1 }) : null} sub={itd?.excessPp != null ? pp(itd.excessPp) : null} onClick={() => page?.setBenchmark && page.setBenchmark(benchmark?.symbol)} />
          <Stat size="s" label="Best month" value={best ? pct(best.pct, { dp: 1 }) : null} sign={best?.pct} sub={best?.month} reason="Needs a complete month" />
          <Stat size="s" label="Worst month" value={worst ? pct(worst.pct, { dp: 1 }) : null} sign={worst?.pct} sub={worst?.month} reason="Needs a complete month" />
          <Stat size="s" label="Max drawdown" value={dd ? pct(dd.maxPct, { dp: 1 }) : null} sign={dd?.maxPct} sub={dd ? `now ${pct(dd.currentPct, { dp: 1 })}` : null} reason="No history" />
          <Stat size="s" label="Vol · Sharpe 1y" value={risk ? `${pct(risk.volPct, { dp: 1, sign: false })}` : null} sub={risk ? `Sharpe ${num(risk.sharpe)} · rf ${risk.riskFreePct}%` : riskReason} reason={riskReason} />
        </div>
        <Muted size={10.5} style={{ marginTop: 4 }}>{timing ? <>Timing gap {pp(timing.gapPct)}: {timing.verdict}</> : "Both returns are shown when they exist; the gap between them (the timing effect) needs a cash-flow ledger and recorded snapshots spanning the same period."}</Muted>
      </StateView>
    </Frame>
  );
}

// ─── PF-09 ────────────────────────────────────────────────────
export function CalendarYearsView({ status, data: d, reason, asOf, source, basis, coverage, stale, size = "m", refetch }) {
  const t = useT();
  const [form, setForm] = useState("dumbbell");
  const years = d?.years ?? [];
  return (
    <Frame id="calendar-years" index={3} label="Calendar-year returns" title={<>Each year <em style={{ fontWeight: 400 }}>against</em> {d?.benchmark?.label ?? "the benchmark"}</>}
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Form" value={form} onChange={setForm} options={[{ value: "dumbbell", label: "Dumbbell" }, { value: "bars", label: "Bars" }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Year return = last stored close of the year / last close of the previous year − 1. The first year (history starts part-way) and the current year are partial and marked *." />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={180}>
        {years.length > 0 && form === "dumbbell" && <Dumbbell summary={years.map(y => `${y.year} ${pct(y.pct, { dp: 1 })} vs ${pct(y.benchmark, { dp: 1 })}`).join("; ")} rows={years.map(y => ({ label: y.year, a: y.pct, b: y.benchmark, partial: y.partial }))} bLabel={d.benchmark.label} />}
        {years.length > 0 && form === "bars" && <GroupedBars summary="Calendar-year returns" categories={years.map(y => y.year)} series={[{ key: "p", label: "Portfolio", colour: t.text }, { key: "b", label: d.benchmark.label, colour: t.benchmark }]} values={years.map(y => [y.pct, y.benchmark])} partial={Object.fromEntries(years.filter(y => y.partial).map(y => [y.year, true]))} height={200} />}
        <Muted size={10}>* partial year: {years.filter(y => y.partial).map(y => `${y.year} (${y.partialReason})`).join(", ") || "none"}.</Muted>
      </StateView>
    </Frame>
  );
}

// ─── PF-11 ────────────────────────────────────────────────────
export function BridgeView({ status, data: d, reason, asOf, source, basis, coverage, stale, note, series, size = "m", page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("bridge");
  const mwr = d?.moneyWeighted, twr = d?.timeWeighted, timing = d?.timing;
  const pts = series?.points ?? [];
  const markers = (d?.markers ?? []).map(m => ({ i: pts.findIndex(p => p.date >= m.date), label: `${m.amount >= 0 ? "+" : "−"}${gbpCompact(Math.abs(m.amount))}`, colour: m.amount >= 0 ? t.info : t.warning })).filter(m => m.i >= 0);
  return (
    <Frame id="bridge" index={8} label="Principal vs gains" title="Money in, and what it became"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Form" value={form} onChange={setForm} options={[{ value: "bridge", label: "Bridge" }, { value: "gap", label: "Timing gap" }, { value: "markers", label: "On the chart" }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} note={note} />}>
      {form === "bridge" && (
        <StateView status={status} reason={reason} onRetry={refetch} height={180}
          empty={<Muted>Record deposits and withdrawals in the cash-flow ledger below to see this.</Muted>}>
          {d?.steps && <>
            <Waterfall summary={`Paid in ${gbp(d.deposits)}, taken out ${gbp(d.withdrawals)}, market movement ${gbp(d.movement)}, now ${gbp(d.steps[4].value)}.`} format={v => gbpCompact(v)} steps={d.steps} height={210} />
            <Muted size={10.5}>{d.reconciles ? "The steps sum exactly to today's value." : "Does not reconcile — report this."} Income: {d.income?.reason}</Muted>
          </>}
        </StateView>
      )}
      {form === "gap" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
            <Stat size="s" label="Money-weighted" value={mwr?.available ? pct(mwr.annualisedPct, { dp: 2 }) : null} reason={mwr?.reason} sub={mwr?.available ? "your money, timing included" : null} />
            <Stat size="s" label="Time-weighted" value={twr?.available && twr.annualisedPct != null ? pct(twr.annualisedPct, { dp: 2 }) : null} reason={twr?.reason ?? twr?.annualisedNote} sub="the strategy, timing removed" />
            <Stat size="s" label="Timing gap" value={timing ? pp(timing.gapPct, { dp: 2 }) : null} sign={timing?.gapPct} reason="Needs both returns over the same span" />
          </div>
          <Muted size={10.5}>{timing ? timing.verdict : (mwr?.reason ?? "Record cash flows to measure the timing effect.")}</Muted>
        </div>
      )}
      {form === "markers" && (pts.length > 1 ? (
        <LineChart dates={pts.map(p => p.date)} series={[{ key: "v", label: "Portfolio £ (reconstructed)", values: pts.map(p => p.value), colour: t.text, area: true }]} markers={markers} height={200} format={v => gbpCompact(v)} summary={`Reconstructed value with ${markers.length} deposit and withdrawal markers.`} />
      ) : <Muted>No reconstructed series.</Muted>)}
      {form === "markers" && !markers.length && <Muted size={10}>No cash flows recorded, so no markers.</Muted>}
    </Frame>
  );
}

// ─── PF-14 ────────────────────────────────────────────────────
export function CaptureView({ status, data: d, reason, asOf, source, basis, coverage, stale, window, setWindow, size = "m", refetch }) {
  const t = useT();
  const [form, setForm] = useState("bars");
  return (
    <Frame id="capture" index={9} label="Up / down capture" title="How much of the market's moves"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Window" value={window} onChange={setWindow} options={[{ value: "1y", label: "1Y" }, { value: "3y", label: "3Y" }, { value: "max", label: "Max" }]} /><Segmented label="Form" value={form} onChange={setForm} options={[{ value: "bars", label: "Bars" }, { value: "scatter", label: "Daily scatter" }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Up capture = the portfolio's average return on the benchmark's up days ÷ the benchmark's average on those days (×100); down capture likewise on down days. Days joined on date; refused under 120 shared days." />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={170}>
        {d && form === "bars" && (
          <>
            <PairedBars summary={`Up capture ${d.upCapture}%, down capture ${d.downCapture}%`} aLabel="Capture %" bLabel="100 = moves with the benchmark" format={v => `${v.toFixed(0)}%`} rows={[{ label: "Up days", a: d.upCapture, b: 100 }, { label: "Down days", a: d.downCapture, b: 100 }]} />
            <Muted size={10.5}>{d.upDays} up and {d.downDays} down days against {d.benchmark.label}, {date(d.from)} → {date(d.to)}. Beta {num(d.beta)}, tracking error {pct(d.trackingErrorPct, { dp: 1, sign: false })}, information ratio {num(d.informationRatio)}.</Muted>
          </>
        )}
        {d && form === "scatter" && <Scatter diagonal points={d.scatter.map(x => ({ x: x.b, y: x.p, label: x.date }))} xLabel={`${d.benchmark.label} daily %`} yLabel="portfolio daily %" xFormat={v => `${v.toFixed(1)}%`} yFormat={v => `${v.toFixed(1)}%`} height={240} summary={`${d.scatter.length} days of portfolio against benchmark returns; beta ${num(d.beta)}.`} labelPoints={false} />}
      </StateView>
    </Frame>
  );
}
