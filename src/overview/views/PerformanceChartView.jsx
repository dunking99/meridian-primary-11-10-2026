// OV-12 performance chart and OV-24 period strip.
import React, { useState } from "react";
import { useT, FONT, soft, signColour } from "../../shared/theme.jsx";
import { Frame, StateView, ProvenanceFooter, Segmented, Chip, BasisTag, StaleBadge, Muted, SrOnly } from "../../shared/ui.jsx";
import { LineChart } from "../../shared/charts/line.jsx";
import { pct, pp, gbp, gbpCompact, date } from "../../shared/format.js";

const RANGES = ["1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "MAX"];
const PERIOD_OF_RANGE = { "1M": "1M", "3M": "3M", "6M": "6M", YTD: "YTD", "1Y": "1Y", "3Y": "3Y", "5Y": "5Y", MAX: "ITD" };

/** Altitude ruler: where the latest value sits between the window's low and high. */
function AltitudeRuler({ points }) {
  const t = useT();
  if (!points?.length) return null;
  const vals = points.map(p => p.portfolio);
  const lo = Math.min(...vals), hi = Math.max(...vals), now = vals[vals.length - 1];
  const b = points.map(p => p.benchmark).filter(v => v != null);
  const f = hi > lo ? (now - lo) / (hi - lo) : 0.5;
  const bf = b.length && Math.max(...b) > Math.min(...b) ? (b[b.length - 1] - Math.min(...b)) / (Math.max(...b) - Math.min(...b)) : null;
  return (
    <div role="img" aria-label={`Latest value is ${(f * 100).toFixed(0)}% of the way from this window's low to its high`} style={{ margin: "8px 0 2px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: t.textFaint, fontFamily: FONT.mono }}><span>window low</span><span>altitude {(f * 100).toFixed(0)}%</span><span>window high</span></div>
      <div style={{ position: "relative", height: 10, borderRadius: 5, background: `linear-gradient(90deg, ${soft(t.negative, 30)}, ${t.surfaceInset}, ${soft(t.positive, 30)})` }}>
        <div title="Portfolio" style={{ position: "absolute", left: `${f * 100}%`, top: -3, width: 4, height: 16, marginLeft: -2, background: t.text, borderRadius: 2 }} />
        {bf != null && <div title="Benchmark" style={{ position: "absolute", left: `${bf * 100}%`, top: 1, width: 8, height: 8, marginLeft: -4, border: `2px solid ${t.benchmark}`, borderRadius: 4, background: t.surface }} />}
      </div>
    </div>
  );
}

export function PeriodStrip({ periods, state, onPick, active, compact = false }) {
  const t = useT();
  if (!periods) return <Muted>{state?.reason ?? "Period returns loading…"}</Muted>;
  const rows = periods.rows.filter(r => ["1M", "3M", "6M", "YTD", "1Y", compact ? null : "3Y", "ITD"].includes(r.period));
  return (
    <div role="list" aria-label="Returns by period against the benchmark" style={{ display: "grid", gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))`, borderTop: `1px solid ${t.border}` }}>
      {rows.map(r => {
        const range = r.period === "ITD" ? "MAX" : r.period;
        const on = active === r.period || (active === "MAX" && r.period === "ITD");
        return (
          <button key={r.period} role="listitem" disabled={!r.available} onClick={() => onPick?.(r.period === "ITD" ? "MAX" : r.period)}
            title={r.available ? `${r.from} to ${r.to} · ${r.bars} bars` : r.reason} aria-pressed={on}
            style={{ textAlign: "left", background: on ? t.surfaceInset : "transparent", border: "none", borderRight: `1px solid ${t.borderSubtle}`, borderTop: on ? `2px solid ${t.text}` : "2px solid transparent",
              padding: "8px 8px", cursor: r.available ? "pointer" : "not-allowed", color: "inherit", minWidth: 0 }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: t.textMuted }}>{r.period === "ITD" ? "MAX" : range}</div>
            {r.available ? (
              <>
                <div style={{ fontFamily: FONT.mono, fontSize: 14, color: signColour(t, r.portfolio), marginTop: 3 }}>{pct(r.portfolio, { dp: 1 })}</div>
                <div style={{ fontSize: 9.5, color: t.textFaint, fontFamily: FONT.mono, marginTop: 2, whiteSpace: "nowrap" }}>
                  {periods.benchmark.label} {pct(r.benchmark, { dp: 1 })}{" "}
                  {r.excessPp != null && <span style={{ padding: "0 3px", borderRadius: 2, background: soft(r.excessPp >= 0 ? t.positive : t.negative, 18), color: signColour(t, r.excessPp) }}>{pp(r.excessPp)}</span>}
                </div>
                {r.portfolioAnnualised != null && <div style={{ fontSize: 9, color: t.textFaint, fontFamily: FONT.mono }}>{pct(r.portfolioAnnualised, { dp: 1 })} a year</div>}
              </>
            ) : (
              <div style={{ fontSize: 10, color: t.textFaint, marginTop: 4, lineHeight: 1.35 }}>not enough history</div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** OV-24 form 2: the range of returns across periods, as one bar each with the benchmark tick. */
export function RangeOfReturns({ periods }) {
  const t = useT();
  if (!periods) return null;
  const rows = periods.rows.filter(r => r.available);
  const max = Math.max(1, ...rows.flatMap(r => [Math.abs(r.portfolio ?? 0), Math.abs(r.benchmark ?? 0)]));
  return (
    <div role="list" aria-label="Range of returns by period">
      {rows.map(r => (
        <div key={r.period} role="listitem" aria-label={`${r.period}: portfolio ${pct(r.portfolio)}, benchmark ${pct(r.benchmark)}`} style={{ display: "grid", gridTemplateColumns: "36px 1fr 64px", gap: 8, alignItems: "center", padding: "3px 0" }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 10.5, color: t.textSecondary }}>{r.period}</span>
          <span style={{ position: "relative", height: 10 }}>
            <span style={{ position: "absolute", left: "50%", top: -2, bottom: -2, width: 1, background: t.borderStrong }} />
            <span style={{ position: "absolute", top: 2, height: 6, borderRadius: 2, background: r.portfolio >= 0 ? t.positive : t.negative, left: r.portfolio >= 0 ? "50%" : `${50 - Math.abs(r.portfolio) / max * 50}%`, width: `${Math.abs(r.portfolio) / max * 50}%` }} />
            {r.benchmark != null && <span title={`Benchmark ${pct(r.benchmark)}`} style={{ position: "absolute", left: `${50 + (r.benchmark / max) * 50}%`, top: -3, width: 2, height: 16, background: t.benchmark }} />}
          </span>
          <span style={{ fontFamily: FONT.mono, fontSize: 10.5, textAlign: "right", color: signColour(t, r.portfolio) }}>{pct(r.portfolio, { dp: 1 })}</span>
        </div>
      ))}
    </div>
  );
}

export function PerformanceChartView(r) {
  const { status, data: d, reason, asOf, source, basis, coverage, stale, fillable, periods, periodsState, benchmarks, markers, unusual, goal, goalReason, basisMode, setBasisMode, size = "m", props = {}, page, refetch } = r;
  const t = useT();
  const [view, setView] = useState("return");
  const [showMarkers, setShowMarkers] = useState(true);
  const range = r.rangeFor?.[page.period] ?? "1Y";
  const pts = d?.points ?? [];
  const dates = pts.map(p => p.date);
  const benchLabel = d?.benchmark?.label ?? "Benchmark";
  const series = view === "value"
    ? [{ key: "value", label: "Portfolio £", values: pts.map(p => p.value), colour: t.text, area: true }]
    : view === "relative"
      ? [{ key: "relative", label: `Portfolio ÷ ${benchLabel}`, values: pts.map(p => p.relative), colour: t.text }]
      : [{ key: "portfolio", label: "Portfolio", values: pts.map(p => p.portfolio), colour: t.text, width: 1.8 },
         { key: "benchmark", label: benchLabel, values: pts.map(p => p.benchmark), colour: t.benchmark, dashed: true }];
  const shown = showMarkers ? [
    ...markers.filter(m => m.kind === "peak").map(m => ({ ...m, colour: t.textMuted })),
    ...markers.filter(m => m.kind === "flow").map(m => ({ ...m, colour: t.info })),
    ...(size !== "s" ? unusual.slice(-6).map(u => ({ i: u.i, label: `${u.pct >= 0 ? "+" : "−"}${Math.abs(u.pct).toFixed(1)}% (${Math.abs(u.z).toFixed(1)}σ)`, colour: u.pct >= 0 ? t.positive : t.negative })) : []),
  ] : [];
  const last = pts[pts.length - 1];
  const summary = last ? `Portfolio ${pct(last.portfolio - 100)} and ${benchLabel} ${last.benchmark != null ? pct(last.benchmark - 100) : "no value"} over ${range}, rebased to 100 on ${date(pts[0].date)}. ${d.peak.atPeak ? "At its record high." : `${pct(d.peak.distancePct, { dp: 1 })} from the peak of ${gbpCompact(d.peak.value)} on ${date(d.peak.date)}.`}` : "";
  const rangeDisabled = Object.fromEntries(RANGES.map(x => [x, fillable && fillable[x] !== true ? (fillable[x] || "Not enough history") : false]));
  const recordedDisabled = basisMode === "reconstructed" ? {} : {};
  return (
    <Frame id="performance-chart" index={1} label="Performance" title={<>Growth of the book <em style={{ fontWeight: 400 }}>against</em> {benchLabel}</>}
      right={<>
        <StaleBadge stale={stale} asOf={asOf} />
        <BasisTag basis={basis ?? (basisMode === "recorded" ? "Recorded" : "Reconstructed")} />
      </>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Portfolio: today's holdings replayed over stored daily closes (or recorded snapshots). Both lines rebased to 100 at the window start and joined on date; a benchmark missing a day is a gap, never shifted." />}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <div role="group" aria-label="Benchmark" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {benchmarks.map(b => <Chip key={b.symbol} active={page.benchmark === b.symbol} onClick={() => page.setBenchmark(b.symbol)} title={b.note}>{b.label}</Chip>)}
        </div>
        <span style={{ flex: 1 }} />
        <Segmented label="Chart view" value={view} onChange={setView} options={[{ value: "return", label: "% return" }, { value: "value", label: "Value" }, { value: "relative", label: "Relative" }]} />
        <Segmented label="Basis" value={basisMode} onChange={setBasisMode} options={[{ value: "reconstructed", label: "Reconstructed" }, { value: "recorded", label: "Recorded" }]} disabled={recordedDisabled} />
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
        <Segmented label="Range" value={range} onChange={v => page.setPeriod(PERIOD_OF_RANGE[v] === "ITD" ? "MAX" : v)} options={RANGES} disabled={rangeDisabled} />
        <label style={{ fontSize: 10.5, color: t.textMuted, display: "flex", gap: 4, alignItems: "center" }}>
          <input type="checkbox" checked={showMarkers} onChange={e => setShowMarkers(e.target.checked)} /> markers
        </label>
        {view === "return" && <span style={{ fontSize: 10, color: t.textFaint, fontFamily: FONT.mono }}><span style={{ color: t.positive }}>▨ ahead</span> · <span style={{ color: t.negative }}>▨ behind</span></span>}
      </div>
      <StateView status={status} reason={reason} onRetry={refetch} height={size === "s" ? 160 : 240}>
        {pts.length > 1 && (
          <>
            <LineChart dates={dates} series={series} band={view === "return" ? { a: "portfolio", b: "benchmark" } : null} markers={shown}
              height={size === "s" ? 180 : size === "l" ? 300 : 250} baseline={view === "value" ? null : 100}
              format={view === "value" ? v => gbpCompact(v) : v => view === "relative" ? v.toFixed(1) : `${(v - 100) >= 0 ? "+" : ""}${(v - 100).toFixed(0)}%`}
              summary={summary} />
            {view === "value" && goal?.goal && (
              <Muted size={10.5}>Goal: {gbp(goal.goal.target)} by {date(goal.goal.targetDate)} — {goal.probabilityPct}% of resampled paths reach it (described sample, not a forecast). Now {goal.progressPct}% of the way.</Muted>
            )}
            {view === "value" && !goal && goalReason && <Muted size={10.5}>No goal overlay: {goalReason}</Muted>}
            {d.benchmark?.missingDays > 0 && view !== "value" && <Muted size={10}>{d.benchmark.symbol} has no close on {d.benchmark.missingDays} of these dates; those days are gaps in its line.</Muted>}
            {size !== "s" && <AltitudeRuler points={pts} />}
          </>
        )}
      </StateView>
      {props.periodStrip !== false && (
        <div style={{ marginTop: 10 }}>
          <PeriodStrip periods={periods} state={periodsState} active={range} onPick={v => page.setPeriod(v)} compact={size === "s"} />
        </div>
      )}
      <SrOnly>{summary}</SrOnly>
    </Frame>
  );
}

export function PeriodReturnsView({ status, data, reason, asOf, source, basis, coverage, stale, size = "m", page, refetch }) {
  const [form, setForm] = useState("strip");
  const range = page.period;
  return (
    <Frame id="period-returns" label="Returns by period" title="Portfolio, benchmark and the gap"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Form" value={form} onChange={setForm} options={[{ value: "strip", label: "Strip" }, { value: "range", label: "Range" }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Each period runs from the last close on or before its start date to the latest close. YTD starts at the last close of the previous year. A period the stored history cannot fill is disabled, not shortened." />}>
      <StateView status={status} reason={reason} onRetry={refetch}>
        {data && (form === "strip"
          ? <PeriodStrip periods={data} active={range} onPick={v => page.setPeriod(v)} compact={size === "s"} />
          : <RangeOfReturns periods={data} />)}
      </StateView>
    </Frame>
  );
}
