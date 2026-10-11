// Analysis-page views: scenario lab (AN-01), correlation (AN-03), fund
// overlap / look-through (AN-04), scorecard expanded (AN-05), rebalance
// (AN-08), allocation breakdown (AN-09), risk figures (AN-12), Monte Carlo
// (AN-13), risk contribution (AN-15), crisis replay (AN-21).
import React, { useMemo, useState } from "react";
import { useT, FONT, soft, signColour, cat, hatch, mix } from "../../shared/theme.jsx";
import { Frame, StateView, ProvenanceFooter, Segmented, Muted, StaleBadge, Chip, SrOnly, Stat, Placeholder, CoverageBar, NoData, Explain } from "../../shared/ui.jsx";
import { LineChart } from "../../shared/charts/line.jsx";
import { DivergingBars, BarList, PairedBars, Ribbon, Ring } from "../../shared/charts/bars.jsx";
import { HeatGrid, FanChart, Donut, Scatter } from "../../shared/charts/shapes.jsx";
import { downloadCsv, toCsv } from "../../shared/table.jsx";
import { gbp, gbpCompact, pct, pp, num, date } from "../../shared/format.js";

/** VF-26 slider: native range input (arrow keys step), live value, stated units. */
export function Slider({ label, value, min, max, step = 1, onChange, format = v => v }) {
  const t = useT();
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 10.5, color: t.textMuted, fontFamily: FONT.mono, minWidth: 160 }}>
      <span style={{ display: "flex", justifyContent: "space-between" }}><span>{label}</span><span style={{ color: t.text }}>{format(value)}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} aria-valuetext={String(format(value))} style={{ accentColor: t.info, width: "100%" }} />
    </label>
  );
}

// ─── AN-01 scenario lab ───────────────────────────────────────
export function ScenarioLabView({ status, data: d, reason, asOf, source, basis, coverage, stale, selected, setSelected, shock, setShock, fx, setFx, size = "m", page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("presets");
  const sc = d?.scenarios ?? [];
  const cur = sc.find(s => s.id === selected) ?? sc[0];
  const betas = d?.betas ?? [];
  const total = d?.total ?? 0;
  const live = betas.map(b => ({ ...b, pnl: b.beta == null ? null : b.value * b.beta * shock / 100 }));
  const liveTotal = live.reduce((a, b) => a + (b.pnl ?? 0), 0);
  // Sterling up x% divides every foreign-quoted value by (1 + x).
  const fxLoss = d?.currency ? (d.currency.foreignSharePct / 100) * total * (1 / (1 + fx / 100) - 1) : 0;
  return (
    <Frame id="scenario-lab" index={1} label="Scenario lab" title="What would a shock cost?"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Form" value={form} onChange={setForm} options={[{ value: "presets", label: "Presets" }, { value: "impact", label: "By holding" }, { value: "shock", label: "Your shock" }, { value: "fx", label: "Currency" }, { value: "bill", label: "The bill" }, { value: "macro", label: "Macro" }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Historical windows replay each holding's own closes where it has them; otherwise the S&P 500 proxy scaled by an estimated beta (flagged). 'Your shock' applies each holding's beta to a market move — a linear approximation that ignores correlations breaking in a crisis." />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={220}>
        {d && form === "presets" && (
          <div role="list" style={{ display: "grid", gridTemplateColumns: `repeat(${size === "s" ? 1 : 3}, minmax(0,1fr))`, gap: 8 }}>
            {sc.map(s => (
              <button key={s.id} role="listitem" onClick={() => { setSelected(s.id); setForm("impact"); }} aria-pressed={cur?.id === s.id}
                style={{ textAlign: "left", background: cur?.id === s.id ? t.surfaceInset : "transparent", border: `1px solid ${t.border}`, borderRadius: 6, padding: 9, cursor: "pointer", color: "inherit" }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: t.textFaint }}>{s.window}</div>
                <div style={{ fontSize: 12.5, color: t.text, margin: "2px 0" }}>{s.label}</div>
                {s.unmeasurable ? <div style={{ fontSize: 10.5, color: t.textFaint, marginTop: 4 }}>Not measurable — {s.reason}</div> : <>
                <div style={{ fontFamily: FONT.serif, fontSize: 20, color: signColour(t, s.portfolioPct) }}>{pct(s.portfolioPct, { dp: 1 })}</div>
                <div style={{ fontSize: 10.5, color: t.textMuted }}>{gbp(s.pnlGBP, { sign: true })} · proxy {pct(s.proxyPct, { dp: 1 })}</div>
                <div style={{ fontSize: 9.5, color: s.estimatedShare > 0 ? t.warning : t.textFaint, marginTop: 3 }}>{s.coverage.actual} replayed · {s.coverage.estimated} beta-estimated ({s.estimatedShare}% of value)</div></>}
              </button>
            ))}
          </div>
        )}
        {d && form === "impact" && cur && (
          <div>
            <div style={{ fontSize: 12, color: t.text, marginBottom: 4 }}>{cur.label} <span style={{ color: t.textFaint, fontSize: 10.5 }}>{cur.window} — {cur.note}</span></div>
            <div role="table" aria-label={`${cur.label} per holding`}>
              {cur.lines.map(l => (
                <div role="row" key={l.symbol} style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px 90px 110px", gap: 6, fontFamily: FONT.mono, fontSize: 11, padding: "3px 0", borderBottom: `1px solid ${t.borderSubtle}` }}>
                  <span>{l.symbol}</span><span style={{ color: t.textFaint }}>{(l.weight * 100).toFixed(1)}%</span>
                  <span style={{ color: signColour(t, l.scenarioReturn) }}>{pct(l.scenarioReturn, { dp: 1 })}</span>
                  <span style={{ color: signColour(t, l.pnl) }}>{gbpCompact(l.pnl, { sign: true })}</span>
                  <span style={{ color: l.method === "actual" ? t.textMuted : t.warning, fontSize: 10 }}>{l.method === "actual" ? "own history" : `${l.method}${l.beta != null ? ` β${l.beta}` : ""}`}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {d && form === "shock" && (
          <div>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
              <Slider label={`Market move (${d.proxy})`} value={shock} min={-50} max={30} step={1} onChange={setShock} format={v => `${v > 0 ? "+" : ""}${v}%`} />
              <span style={{ fontFamily: FONT.serif, fontSize: 24, color: signColour(t, liveTotal) }}>{gbp(liveTotal, { sign: true })}</span>
              <span style={{ fontFamily: FONT.mono, fontSize: 11, color: t.textMuted }}>{pct(total ? liveTotal / total * 100 : null, { dp: 1 })} of invested</span>
              <span style={{ display: "flex", gap: 4 }}>{[-30, -20, -10, 10].map(v => <Chip key={v} onClick={() => setShock(v)} active={shock === v}>{v > 0 ? "+" : ""}{v}%</Chip>)}</span>
            </div>
            <DivergingBars summary={`A ${shock}% market move costs ${gbp(liveTotal)} on beta`} format={v => gbpCompact(v, { sign: true })} rows={live.map(b => ({ key: b.symbol, label: b.symbol, sub: b.beta != null ? `β ${b.beta}` : "no beta", value: b.pnl }))} />
            <Muted size={10}>Market-move simulator: each holding × its beta × the move. Linear by construction — real selloffs push correlations up, so the tail is likely worse than this.</Muted>
          </div>
        )}
        {d && form === "fx" && (
          <div>
            <Slider label="Sterling moves" value={fx} min={-20} max={20} step={1} onChange={setFx} format={v => `${v > 0 ? "+" : ""}${v}%`} />
            <div style={{ fontFamily: FONT.serif, fontSize: 22, color: signColour(t, fxLoss), margin: "6px 0" }}>{gbp(fxLoss, { sign: true })}</div>
            <Muted size={10.5}>{pct(d.currency.foreignSharePct, { dp: 1, sign: false })} of the book is quoted outside sterling ({d.currency.byCurrency.map(c => `${c.currency} ${pct(c.pct, { dp: 1, sign: false })}`).join(", ") || "none"}). A 10% rise in sterling: {gbp(d.currency.gbpUp10GBP, { sign: true })}; a 10% fall: {gbp(d.currency.gbpDown10GBP, { sign: true })}. {d.currency.basis}</Muted>
          </div>
        )}
        {d && form === "bill" && d.worst && (
          <div style={{ lineHeight: 1.6 }}>
            <div style={{ fontFamily: FONT.serif, fontSize: 26, color: t.negative }}>{gbp(d.worst.pnlGBP, { sign: true })}</div>
            <div style={{ fontSize: 12, color: t.textSecondary }}>The worst of the six replays is the {d.worst.label} ({pct(d.worst.pct, { dp: 1 })}). {d.worst.recovery?.days != null ? `The proxy took ${d.worst.recovery.days} days after the window to regain its starting level (${date(d.worst.recovery.date)}).` : d.worst.recovery?.notYet ? "The proxy had not regained its starting level by the last stored bar." : "Recovery time is not measurable from stored bars."}</div>
            <div style={{ fontSize: 11.5, color: t.textMuted }}>Held up in that window: {sc.find(s => s.id === d.worst.id)?.heldUp?.join(", ") || "nothing"}. Average across the six: {pct(d.averagePct, { dp: 1 })}.</div>
          </div>
        )}
        {form === "macro" && <Placeholder title="Multi-factor macro sliders" reason="Rates, dollar, oil, AI-capex and China sliders would need a factor model whose loadings can be defended; none is built (decision D-07), so these are not offered rather than invented. The market-move and currency sliders above are the defensible ones." unblocks="an approved, tested factor model" />}
      </StateView>
    </Frame>
  );
}

// ─── AN-21 crisis replay ──────────────────────────────────────
export function CrisisReplayView({ status, data: d, reason, asOf, source, basis, coverage, stale, selected, setSelected, size = "m", refetch }) {
  const t = useT();
  const sc = d?.scenarios ?? [];
  const cur = sc.find(s => s.id === selected) ?? sc.find(s => !s.unmeasurable) ?? sc[0];
  const path = cur?.unmeasurable ? [] : (cur?.path ?? []);
  return (
    <Frame id="crisis" label="Replay a crisis" title="Today's book through past selloffs"
      right={<StaleBadge stale={stale} asOf={asOf} />}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="The path follows each holding's own closes in the window where stored, otherwise the proxy scaled by beta. Coverage per window says which." />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={220}>
        {d && (
          <div style={{ display: "grid", gridTemplateColumns: size === "s" ? "1fr" : "220px 1fr", gap: 12 }}>
            <div role="list">
              {sc.map(s => (
                <button key={s.id} role="listitem" onClick={() => setSelected(s.id)} aria-pressed={cur?.id === s.id}
                  style={{ display: "block", width: "100%", textAlign: "left", background: cur?.id === s.id ? t.surfaceInset : "transparent", border: "none", borderBottom: `1px solid ${t.borderSubtle}`, padding: "5px 4px", cursor: "pointer", color: "inherit" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}><span style={{ color: t.text }}>{s.label}</span><span style={{ fontFamily: FONT.mono, color: s.unmeasurable ? t.textFaint : signColour(t, s.portfolioPct) }}>{s.unmeasurable ? "n/a" : pct(s.portfolioPct, { dp: 1 })}</span></div>
                  <div style={{ fontSize: 9.5, color: s.coverage.estimated ? t.warning : t.textFaint }}>{s.window} · {s.coverage.actual}/{s.coverage.total} own history</div>
                </button>
              ))}
            </div>
            <div>
              {path.length > 1 ? <LineChart dates={path.map(p => p.date)} series={[{ key: "p", label: "Today's book", values: path.map(p => p.portfolio), colour: t.text }, { key: "x", label: d.proxy, values: path.map(p => p.proxy), colour: t.benchmark, dashed: true }]} baseline={100} height={190} format={v => `${(v - 100).toFixed(0)}%`}
                summary={`${cur.label}: today's book ${pct(cur.portfolioPct)} against ${d.proxy} ${pct(cur.proxyPct)}.`} /> : <Muted>{cur?.reason ?? "No proxy bars stored for this window, so no path can be drawn."}</Muted>}
              <div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: t.textMuted, margin: "6px 0 3px" }}>BY INSTRUMENT TYPE</div>
              <DivergingBars summary="Impact by type" format={v => pct(v, { dp: 1 })} rows={(cur?.unmeasurable ? [] : cur?.perClass ?? []).map(c => ({ key: c.label, label: c.label.slice(0, 16), sub: gbpCompact(c.pnlGBP, { sign: true }), value: c.pct }))} labelWidth={120} />
              <Muted size={10}>{cur?.estimatedShare > 0 ? `${cur.estimatedShare}% of the book had no history in this window and is beta-estimated.` : "Every holding replayed from its own history."}</Muted>
            </div>
          </div>
        )}
      </StateView>
    </Frame>
  );
}

// ─── AN-03 correlation ────────────────────────────────────────
export function CorrelationView({ status, data: d, reason, asOf, source, basis, coverage, stale, window, setWindow, size = "m", page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("pairs");
  const m = d?.matrix;
  const syms = m?.symbols ?? [];
  const ind = d?.independence;
  const Pair = ({ p, tone }) => (
    <button onClick={() => { page?.setSelected?.(p.symbols[0]); }} title={`Open ${p.symbols.join(" and ")}`} style={{ display: "grid", gridTemplateColumns: "1fr 50px 60px", gap: 6, width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${t.borderSubtle}`, padding: "4px 0", cursor: "pointer", fontFamily: FONT.mono, fontSize: 11, color: t.text, textAlign: "left" }}>
      <span>{p.symbols[0]} / {p.symbols[1]}</span><span style={{ color: tone }}>{num(p.correlation)}</span><span style={{ color: t.textFaint }}>{p.combinedWeight}%</span>
    </button>
  );
  return (
    <Frame id="correlation" index={3} label="Correlation" title="What moves together"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Window" value={window} onChange={setWindow} options={[{ value: "3m", label: "3M" }, { value: "6m", label: "6M" }, { value: "1y", label: "1Y" }, { value: "max", label: "Max" }]} />
        <Segmented label="Form" value={form} onChange={setForm} options={[{ value: "pairs", label: "Pairs" }, { value: "matrix", label: "Matrix" }, { value: "drift", label: "Windows" }, { value: "stress", label: "Calm vs stressed" }, { value: "blocs", label: "Blocs" }, { value: "bets", label: "Bets" }, { value: "crowded", label: "Crowded" }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Daily returns joined on date. A pair with too little overlap is null (hatched), never 0. Matrix cells are pairwise; anything matrix-wide uses the dates every holding shares." />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={220}>
        {d && form === "pairs" && d.pairs?.available && (
          <div style={{ display: "grid", gridTemplateColumns: size === "s" ? "1fr" : "1fr 1fr", gap: 14 }}>
            <div><div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: t.negative, letterSpacing: 1 }}>MOVES TOGETHER</div>{d.pairs.movesTogether.map(p => <Pair key={p.symbols.join()} p={p} tone={t.negative} />)}</div>
            <div><div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: t.positive, letterSpacing: 1 }}>MOVES LEAST TOGETHER</div>{d.pairs.movesLeastTogether.map(p => <Pair key={p.symbols.join()} p={p} tone={t.positive} />)}</div>
            <Muted size={10}>Right column: combined weight of the pair — 0.9 between two 4% positions and between two 25% positions are different findings. The lists never overlap.</Muted>
          </div>
        )}
        {d && form === "matrix" && m && (
          <HeatGrid rows={syms} cols={syms.map(s => s.replace(/\..*$/, ""))} colourMode="correlation" cellHeight={26}
            cells={m.matrix.map((row, i) => row.map((v, j) => ({ v: i === j ? null : v, title: i === j ? syms[i] : v == null ? "not enough overlap" : `${syms[i]} / ${syms[j]}: ${v.toFixed(2)}` })))}
            format={v => v.toFixed(2)} summary={`Correlation matrix of ${syms.length} holdings, average ${num(m.averageCorrelation)}.`} onCell={(r) => page?.setSelected?.(r)} />
        )}
        {d && form === "drift" && (
          <div role="table" style={{ maxHeight: 260, overflowY: "auto" }}>
            {[...(d.windows?.pairs ?? [])].sort((a, b) => Math.abs(b.drift ?? 0) - Math.abs(a.drift ?? 0)).slice(0, 12).map(p => (
              <div role="row" key={`${p.a}${p.b}`} style={{ display: "grid", gridTemplateColumns: "130px repeat(4, 1fr) 80px", gap: 4, fontFamily: FONT.mono, fontSize: 10.5, padding: "2px 0", borderBottom: `1px solid ${t.borderSubtle}` }}>
                <span>{p.a}/{p.b}</span>{(d.windows.windows ?? []).map(w => <span key={w} title={w}>{p.byWindow?.[w] == null ? "——" : p.byWindow[w].toFixed(2)}</span>)}<span style={{ color: Math.abs(p.drift ?? 0) > 0.3 ? t.warning : t.textFaint }}>{p.drift == null ? "" : `${p.drift >= 0 ? "+" : ""}${p.drift.toFixed(2)}`}</span>
              </div>
            ))}
            <Muted size={10}>Columns: {(d.windows?.windows ?? []).join(", ")}; last column is short minus long window. Largest drifts first.</Muted>
          </div>
        )}
        {d && form === "stress" && (d.stress?.available ? (
          <div>
            <div style={{ fontSize: 11.5, color: t.textSecondary, marginBottom: 4 }}>Average correlation {num(d.stress.averageCalm)} on calm days, {num(d.stress.averageStressed)} on the worst {Math.round(d.stress.tail * 100)}% of days for this book ({d.stress.stressedDays} days). {d.stress.breakdowns} pairs fail under stress.</div>
            <DivergingBars summary="Correlation gap, stressed minus calm" format={v => (v >= 0 ? "+" : "") + v.toFixed(2)} rows={[...d.stress.pairs].sort((a, b) => b.gap - a.gap).slice(0, 8).map(p => ({ key: `${p.a}${p.b}`, label: `${p.a.replace(/\..*$/, "")}/${p.b.replace(/\..*$/, "")}`, sub: `${num(p.calm)} → ${num(p.stressed)}`, value: p.gap }))} labelWidth={110} />
          </div>
        ) : <Muted>{d.stress?.reason}</Muted>)}
        {d && form === "blocs" && (d.clusters?.available ? (
          <div role="list">{d.clusters.clusters.map((c, i) => <div role="listitem" key={i} style={{ padding: "4px 0", borderBottom: `1px solid ${t.borderSubtle}` }}><span style={{ fontFamily: FONT.mono, fontSize: 10, color: t.textFaint }}>bloc {i + 1} · avg {num(c.averageInternalCorrelation)}</span><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{c.members.map(s => <Chip key={s} onClick={() => page?.setSelected?.(s)}>{s}</Chip>)}</div></div>)}<Muted size={10}>Average-linkage clusters on 1 − correlation, cut at {d.clusters.cut}. {d.clusters.singletons} holdings stand alone.</Muted></div>
        ) : <Muted>{d.clusters?.reason}</Muted>)}
        {d && form === "bets" && (ind?.available ? (
          <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <Ring value={ind.independentBets} max={ind.holdingsCount} label="Independent bets" sub={`of ${ind.holdingsCount} holdings`} size={90} />
            <Ring value={ind.effectiveBets} max={ind.holdingsCount} label="Effective bets" sub="squared diversification ratio" size={90} colour={cat(t, 1)} />
            <div style={{ fontSize: 11.5, color: t.textSecondary, maxWidth: 300, lineHeight: 1.5 }}>Four identical holdings would score 1; four independent ones 4. Diversification ratio {num(ind.diversificationRatio)}; {pct(ind.concentrationOfRisk * 100, { dp: 0, sign: false })} of variance sits in the first factor.</div>
          </div>
        ) : <Muted>{ind?.reason}</Muted>)}
        {d && form === "crowded" && (
          <div>
            {(d.redundancies?.pairs ?? []).length ? d.redundancies.pairs.map((p, i) => <div key={i} style={{ fontFamily: FONT.mono, fontSize: 11.5, padding: "2px 0" }}>{(p.symbols ?? [p.a, p.b]).join(" / ")} · {num(p.correlation)}{p.combinedWeight != null ? ` · ${pct(p.combinedWeight * (p.combinedWeight <= 1 ? 100 : 1), { dp: 1, sign: false })} of the book` : ""}</div>) : <Muted>No pair above {d.redundancies?.threshold} correlation with at least {pct((d.redundancies?.minWeight ?? 0) * 100, { dp: 0, sign: false })} of the book each — nothing crowded by that test.</Muted>}
            {d.pairs?.movesTogether?.length > 0 && <Muted size={10.5} style={{ marginTop: 4 }}>Closest pairs anyway: {d.pairs.movesTogether.slice(0, 3).map(p => `${p.symbols.join("/")} ${num(p.correlation)} (${p.combinedWeight}%)`).join("; ")}.</Muted>}
          </div>
        )}
        {d?.unassessable?.length > 0 && <Muted size={10}>Not measurable: {d.unassessable.join(", ")}.</Muted>}
      </StateView>
    </Frame>
  );
}

// ─── AN-04 overlap / look-through ─────────────────────────────
export function OverlapView({ status, data: d, reason, asOf, source, basis, coverage, stale, size = "m", page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("top");
  const x = d?.xray;
  const funds = d?.funds ?? [];
  const cell = (a, b) => d.matrix.find(m => (m.a === a && m.b === b) || (m.a === b && m.b === a));
  const top = (x?.underlyings ?? []).slice(0, 12);
  const maxW = Math.max(0.0001, ...top.map(u => u.weight));
  return (
    <Frame id="overlap" index={4} label="Look-through" title="What you actually own"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Form" value={form} onChange={setForm} options={[{ value: "top", label: "Top companies" }, { value: "twice", label: "Held twice" }, { value: "matrix", label: "Overlap matrix" }, { value: "bubbles", label: "Bubble grid" }, { value: "pairs", label: "Pairs" }, { value: "labelled", label: "Labelled vs truth" }, { value: "dedupe", label: "Duplicates" }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Funds publish roughly their top ten holdings, so every underlying weight is a floor ('at least'). Disclosed weights are never scaled up to fill the undisclosed remainder." />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={220}>
        {x && (
          <>
            <CoverageBar share={x.coverage?.seen} label="Disclosed" missing={(x.unseenPositions ?? []).map(u => ({ symbol: u.symbol, reason: u.note }))} note={`You bought ${x.coverage?.positionsTotal} holdings; they disclose at least ${x.distinctNames} companies.`} />
            <div style={{ marginTop: 8 }}>
              {form === "top" && (
                <div role="list">
                  {top.map(u => <div role="listitem" key={u.key} style={{ display: "grid", gridTemplateColumns: "150px 1fr 70px 70px", gap: 6, alignItems: "center", padding: "3px 0", fontSize: 11 }}>
                    <span style={{ color: t.text }}>{u.name}</span>
                    <span style={{ display: "flex", height: 8 }}>{u.via.map((v, i) => <span key={v.symbol} title={`via ${v.symbol}: ${(v.contribution * 100).toFixed(2)}%`} style={{ width: `${v.contribution / maxW * 100}%`, background: v.basis === "self" ? t.text : cat(t, i), opacity: v.basis === "self" ? 1 : 0.8 }} />)}</span>
                    <span style={{ fontFamily: FONT.mono, textAlign: "right" }}>{u.exact ? "" : "≥"}{(u.weight * 100).toFixed(2)}%</span>
                    <span style={{ fontFamily: FONT.mono, fontSize: 10, color: t.textFaint }}>{u.viaCount > 1 ? `${u.viaCount} routes` : u.exact ? "direct" : "1 fund"}</span>
                  </div>)}
                  <Muted size={10}>Solid = held directly (exact); coloured = through funds (a floor).</Muted>
                </div>
              )}
              {form === "twice" && ((x.overlaps ?? []).length ? (x.overlaps.map(o => <div key={o.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, padding: "3px 0", borderBottom: `1px solid ${t.borderSubtle}` }}><span>{o.name} <span style={{ color: t.textFaint }}>via {o.via.map(v => v.symbol).join(", ")}</span></span><span style={{ fontFamily: FONT.mono }}>≥{(o.weight * 100).toFixed(2)}%</span></div>)) : <Muted>No company is reached through more than one holding in what is disclosed.</Muted>)}
              {form === "matrix" && (funds.length > 1 ? (
                <HeatGrid rows={funds} cols={funds.map(f => f.replace(/\..*$/, ""))} colourMode="correlation" cellHeight={26}
                  cells={funds.map(a => funds.map(b => { if (a === b) return null; const c = cell(a, b); return { v: c?.overlapFloorPct != null ? c.overlapFloorPct / 100 : null, title: c ? `${a} / ${b}: at least ${c.overlapFloorPct ?? "?"}% shared top holdings · ${c.verdict}` : "no data" }; }))}
                  format={v => `${(v * 100).toFixed(0)}`} summary="Share of weight in shared top-ten holdings, a floor." />
              ) : <Muted>Fewer than two funds publish holdings.</Muted>)}
              {form === "bubbles" && funds.length > 1 && (
                <svg width="100%" height={Math.max(120, funds.length * 30 + 30)} role="img" aria-label="Overlap bubble grid: bubble area is the shared-holdings floor">
                  {funds.map((a, i) => <text key={`r${a}`} x={0} y={i * 30 + 40} fontSize={10} fill={t.textSecondary} fontFamily={FONT.mono}>{a.replace(/\..*$/, "")}</text>)}
                  {funds.map((b, j) => <text key={`c${b}`} x={70 + j * 44} y={16} fontSize={9.5} fill={t.textMuted} fontFamily={FONT.mono}>{b.replace(/\..*$/, "")}</text>)}
                  {funds.map((a, i) => funds.map((b, j) => { if (j <= i) return null; const c = cell(a, b); const v = c?.overlapFloorPct ?? 0; return <circle key={a + b} cx={84 + j * 44} cy={i * 30 + 36} r={2 + Math.sqrt(v) * 2} fill={soft(t.info, 50)} stroke={t.info}><title>{`${a}/${b} ≥${v}%`}</title></circle>; }))}
                </svg>
              )}
              {form === "pairs" && d.matrix.map(p => <div key={p.a + p.b} style={{ padding: "4px 0", borderBottom: `1px solid ${t.borderSubtle}`, fontSize: 11 }}><b style={{ fontFamily: FONT.mono }}>{p.a} / {p.b}</b> <Chip>{p.verdict}</Chip> <span style={{ color: t.textMuted }}>{p.explain}</span></div>)}
              {form === "labelled" && x.sectors?.available && (
                <PairedBars summary="Sectors as labelled on the holdings against the look-through blend" aLabel="Look-through (share of book)" bLabel="As labelled on holdings" format={v => `${v.toFixed(1)}%`}
                  rows={x.sectors.sectors.slice(0, 8).map(s => ({ label: s.sector.replace(/_/g, " ").slice(0, 12), a: s.weightOfBook * 100, b: null }))} />
              )}
              {form === "labelled" && <Muted size={10}>The holdings' own sector labels are broad ("Broad", "Tech"), so there is no like-for-like labelled figure per look-through sector — shown hatched rather than guessed. {x.sectors?.basis}</Muted>}
              {form === "dedupe" && (d.matrix.filter(m => m.verdict === "duplicate" || m.verdict === "heavy-overlap").length ? d.matrix.filter(m => m.verdict === "duplicate" || m.verdict === "heavy-overlap").map(m => (
                <div key={m.a + m.b} style={{ fontSize: 11.5, padding: "4px 0", borderBottom: `1px solid ${t.borderSubtle}` }}>{m.a} and {m.b} ({m.combinedWeight}% combined): {m.verdict}. <button onClick={() => page?.onNavigate?.("rebuild")} style={{ background: "transparent", border: "none", color: t.info, cursor: "pointer", fontSize: 11 }}>Review in Rebuild →</button></div>
              )) : <Muted>No pair is flagged as duplicate or heavy overlap.</Muted>)}
              {form === "dedupe" && <Muted size={10}>Advisory only — a link to the Rebuild engine, which weighs cost and conviction. Nothing here suggests a trade in words.</Muted>}
            </div>
          </>
        )}
      </StateView>
    </Frame>
  );
}

// ─── AN-08 rebalance ──────────────────────────────────────────
export function RebalanceView({ status, data: d, reason, asOf, source, basis, coverage, stale, targets, mode, setMode, contribution, setContribution, size = "m", page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("trades");
  const trades = d ? [...(d.sells ?? []).map(s => ({ ...s, side: "sell" })), ...(d.buys ?? []).map(b => ({ ...b, side: "buy" })), ...(d.allocations ?? []).map(a => ({ ...a, side: "buy" }))] : [];
  const csvCols = [{ key: "side", label: "Side" }, { key: "symbol", label: "Symbol" }, { key: "wrapper", label: "Wrapper" }, { key: "value", label: "Value GBP" }, { key: "qty", label: "Quantity" }];
  return (
    <Frame id="rebalance" index={5} label="Rebalance" title="Back towards your targets"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Mode" value={mode} onChange={setMode} options={[{ value: "full", label: "Full rebalance" }, { value: "newmoney", label: "New money only" }]} />
        <Segmented label="Form" value={form} onChange={setForm} options={[{ value: "trades", label: "Trade plan" }, { value: "drift", label: "Drift" }, { value: "policy", label: "Policy" }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} note="Advisory. Nothing here writes to your holdings, and there is no broker export." />}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 6 }}>
        <Slider label={mode === "newmoney" ? "New money to direct" : "Add a contribution"} value={contribution} min={0} max={50000} step={500} onChange={setContribution} format={v => gbp(v)} />
        {trades.length > 0 && <button onClick={() => downloadCsv(`meridian-advisory-trades-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(csvCols, trades))} style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.textSecondary, borderRadius: 3, fontSize: 10.5, padding: "3px 9px", cursor: "pointer" }}>CSV of this advisory list ↓</button>}
        <button onClick={() => page?.onNavigate?.("allocate")} style={{ background: "transparent", border: "none", color: t.info, cursor: "pointer", fontSize: 11 }}>Allocate →</button>
      </div>
      <StateView status={status} reason={reason} onRetry={refetch} height={180}>
        {d && form === "trades" && (
          <div>
            {d.summary && <div style={{ fontFamily: FONT.mono, fontSize: 11, color: t.textSecondary, marginBottom: 4 }}>{d.summary.trades} trades · turnover {gbp(d.summary.turnover)} ({pct(d.summary.turnoverPct, { dp: 1, sign: false })}) · max drift {d.summary.maxDriftBefore}pp → {d.summary.maxDriftAfter}pp{d.summary.estimatedCgt ? ` · est. CGT ${gbp(d.summary.estimatedCgt)}` : ""}</div>}
            {mode === "newmoney" && d.driftBefore != null && <div style={{ fontFamily: FONT.mono, fontSize: 11, color: t.textSecondary, marginBottom: 4 }}>max drift {d.driftBefore}pp → {d.driftAfter}pp</div>}
            <div role="table">
              {trades.map((x, i) => <div role="row" key={i} style={{ display: "grid", gridTemplateColumns: "50px 90px 70px 1fr 90px", gap: 6, fontFamily: FONT.mono, fontSize: 11, padding: "3px 0", borderBottom: `1px solid ${t.borderSubtle}` }}>
                <span style={{ color: x.side === "sell" ? t.negative : t.positive }}>{x.side.toUpperCase()}</span><span>{x.symbol}</span><span style={{ color: t.textFaint }}>{x.wrapper}</span><span>{x.qty != null ? `${x.qty} units` : ""}{x.taxable ? <span style={{ color: t.warning }}> · taxable gain</span> : ""}</span><span style={{ textAlign: "right" }}>{gbp(x.value)}</span></div>)}
              {!trades.length && <Muted>Nothing to trade: every holding is within tolerance of its target.</Muted>}
            </div>
            {(d.notes ?? []).map((n, i) => <Muted key={i} size={10.5}>{n}</Muted>)}
          </div>
        )}
        {d && form === "drift" && (d.rows ? <DivergingBars summary="Drift before and after" format={v => pp(v)} rows={d.rows.map(r => ({ key: r.symbol, label: r.symbol, sub: `after ${r.afterWeight}% vs ${r.targetWeight}%`, value: r.drift }))} /> : targets ? <DivergingBars summary="Drift" format={v => pp(v)} rows={targets.rows.filter(r => r.driftPp != null).map(r => ({ key: r.symbol, label: r.symbol, value: r.driftPp }))} /> : <Muted>No drift without targets.</Muted>)}
        {d && form === "policy" && targets && (
          <div role="list">{targets.byClass.map(c => <div role="listitem" key={c.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, padding: "3px 0", borderBottom: `1px solid ${t.borderSubtle}` }}><span>{c.label}</span><span style={{ fontFamily: FONT.mono }}>{c.weight}% {c.targetPct != null ? `vs ${c.targetPct}%` : "· no target"} {c.driftPp != null ? `(${pp(c.driftPp)})` : ""}</span></div>)}
            <Muted size={10}>Policy view: the same drift rolled up by instrument type. Targets sum to {targets.targetSumPct}%.</Muted></div>
        )}
      </StateView>
    </Frame>
  );
}

// ─── AN-09 allocation breakdown ───────────────────────────────
export function AllocationView({ status, data: d, rows = [], reason, asOf, source, basis, coverage, stale, lens, setLens, size = "m", page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("donut");
  const groups = d?.groups ?? [];
  const bySector = useMemo(() => {
    const sectors = [...new Set(rows.map(r => r.sector ?? "Unclassified"))];
    return { sectors, rows: rows.filter(r => r.value > 0).map(r => ({ symbol: r.symbol, sector: r.sector ?? "Unclassified", weight: r.weight })) };
  }, [rows]);
  const classes = Object.values(rows.reduce((m, r) => { (m[r.type] ??= { key: r.type, label: r.type, value: 0 }); m[r.type].value += (r.weight ?? 0) / 100; return m; }, {}));
  return (
    <Frame id="allocation" label="Allocation" title="Exposure breakdown"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Form" value={form} onChange={setForm} options={[{ value: "donut", label: "Donut" }, { value: "stacked", label: "Sector by position" }, { value: "mix", label: "Asset-class mix" }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} />}>
      {form === "donut" && <div style={{ marginBottom: 6 }}><Segmented label="Lens" value={lens} onChange={setLens} options={[{ value: "sector", label: "Sector" }, { value: "class", label: "Class" }, { value: "region", label: "Region" }, { value: "currency", label: "Currency" }, { value: "wrapper", label: "Wrapper" }]} /></div>}
      <StateView status={status} reason={reason} onRetry={refetch} height={200}>
        {d && form === "donut" && (
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <Donut size={180} summary={`${d.lensLabel}: ${groups.map(g => `${g.label} ${(g.weight * 100).toFixed(1)}%`).join(", ")}`} centre={gbpCompact(d.total)} sub={d.lensLabel}
              slices={groups.map((g, i) => ({ key: g.label, label: g.label, value: g.value, colour: g.label === "Cash" ? t.textFaint : ["Unclassified", "Not disclosed"].includes(g.label) ? t.surfaceInset : cat(t, i) }))} />
            <div style={{ flex: 1, minWidth: 160 }}>{groups.map((g, i) => <div key={g.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "1px 0" }}><span style={{ color: t.textSecondary }}>{g.label}</span><span style={{ fontFamily: FONT.mono }}>{(g.weight * 100).toFixed(1)}%</span></div>)}</div>
          </div>
        )}
        {rows.length > 0 && form === "stacked" && (
          <div role="list" aria-label="Each position's weight, coloured by its sector label">
            {bySector.sectors.map((s, i) => { const members = bySector.rows.filter(r => r.sector === s); const w = members.reduce((a, r) => a + r.weight, 0); return (
              <div role="listitem" key={s} style={{ display: "grid", gridTemplateColumns: "110px 1fr 50px", gap: 8, alignItems: "center", padding: "3px 0" }}>
                <span style={{ fontSize: 11 }}>{s}</span>
                <span style={{ display: "flex", height: 10, background: t.surfaceInset }}>{members.map(r => <span key={r.symbol} title={`${r.symbol} ${r.weight.toFixed(1)}%`} style={{ width: `${r.weight}%`, background: cat(t, i), borderRight: `1px solid ${t.surface}` }} />)}</span>
                <span style={{ fontFamily: FONT.mono, fontSize: 10.5, textAlign: "right" }}>{w.toFixed(1)}%</span>
              </div>); })}
          </div>
        )}
        {rows.length > 0 && form === "mix" && <Ribbon summary="Asset-class mix" segments={classes.map((c, i) => ({ key: c.key, label: c.label, value: c.value, colour: cat(t, i) }))} />}
      </StateView>
    </Frame>
  );
}

// ─── AN-12 risk figures, AN-15 risk contribution ─────────────
export function RiskFiguresView({ status, data: d, reason, asOf, source, basis, coverage, stale, size = "m", page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("strip");
  return (
    <Frame id="risk-figures" index={2} label="Risk" title="Key risk figures"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Form" value={form} onChange={setForm} options={[{ value: "strip", label: "Strip" }, { value: "div", label: "Diversification" }]} /><button onClick={() => page?.onNavigate?.("risk")} style={{ background: "transparent", border: "none", color: t.info, cursor: "pointer", fontSize: 11 }}>Risk page →</button></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={90}>
        {d && form === "strip" && (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${size === "s" ? 2 : 6}, minmax(0,1fr))` }}>
            <Stat size="s" label="Volatility" value={pct(d.volatility, { dp: 1, sign: false })} sub={`${d.observations} days`} />
            <Stat size="s" label="Beta (S&P)" value={num(d.beta)} sub="position-aligned" explain={<Explain title="Why two betas"><div>This beta is the Risk page's figure (series aligned by position). The Performance page's beta is joined on date and is the one to trust where they differ.</div></Explain>} />
            <Stat size="s" label="VaR 95% · day" value={d.varInPounds?.daily95 != null ? gbp(-d.varInPounds.daily95) : null} sub={`historical · CVaR ${gbp(-(d.varInPounds?.cvarDaily ?? 0))}`} />
            <Stat size="s" label="VaR 95% · month" value={d.varInPounds?.monthly95 != null ? gbp(-d.varInPounds.monthly95) : null} sub="historical, √21 scaled" />
            <Stat size="s" label="Max drawdown" value={d.drawdown ? pct(d.drawdown.max, { dp: 1 }) : null} sub={d.drawdown?.window} sign={d.drawdown?.max} />
            <Stat size="s" label="Effective holdings" value={num(d.diversification?.effectiveHoldings, { dp: 1 })} sub={`of ${d.coverage?.analysed}`} />
          </div>
        )}
        {d && form === "div" && (
          <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <Ring value={d.diversification.diversificationRatio} max={2} label="Diversification ratio" sub="1.0 = none; 0–2 scale" size={84} />
            <Ring value={d.diversification.averageCorrelation * 100} max={100} label="Average correlation ×100" sub="0–100 scale" size={84} colour={cat(t, 1)} />
            <div style={{ fontSize: 11.5, color: t.textSecondary, maxWidth: 320, lineHeight: 1.5 }}>Diversification ratio {num(d.diversification.diversificationRatio)} (weighted average volatility ÷ portfolio volatility) and average pairwise correlation {num(d.diversification.averageCorrelation)}. VaR methods: historical {pct((d.var?.daily?.historical ?? 0) * 100)}, parametric {pct((d.var?.daily?.parametric ?? 0) * 100)}, Cornish-Fisher {pct((d.var?.daily?.modified ?? 0) * 100)} a day.</div>
          </div>
        )}
      </StateView>
    </Frame>
  );
}

export function RiskContributionView({ status, data: d, reason, asOf, source, basis, coverage, stale, size = "m", page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("paired");
  const rc = d?.riskContributions ?? [];
  return (
    <Frame id="risk-contribution" label="Risk contribution" title="Money versus risk"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Form" value={form} onChange={setForm} options={[{ value: "paired", label: "Paired bars" }, { value: "stacked", label: "Money vs risk" }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Euler contributions: each holding's weight × its marginal contribution to portfolio volatility; they sum to 100% (here ${d?.riskContributionSumPct ?? '—'}%)." />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={180}>
        {d && form === "paired" && <PairedBars summary={rc.map(r => `${r.symbol} weight ${r.weight}% risk ${r.pctOfRisk}%`).join("; ")} aLabel="Share of money" bLabel="Share of risk" rows={rc.map(r => ({ label: r.symbol, a: r.weight, b: r.pctOfRisk }))} onRow={r => page?.onOpenHolding?.(r.label)} />}
        {d && form === "stacked" && (
          <div>
            {[["Money", rc.map(r => ({ key: r.symbol, label: r.symbol, value: r.weight / 100 }))], ["Risk", rc.map(r => ({ key: r.symbol, label: r.symbol, value: Math.max(0, r.pctOfRisk) / 100 }))]].map(([l, segs]) => (
              <div key={l} style={{ marginBottom: 6 }}><div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: t.textMuted }}>{l.toUpperCase()}</div><Ribbon summary={`${l} shares`} labels={l === "Risk"} segments={segs.map((s, i) => ({ ...s, colour: cat(t, i) }))} height={20} /></div>
            ))}
          </div>
        )}
        {d && <Muted size={10}>Contributions sum to {d.riskContributionSumPct}%. A holding with a larger share of risk than of money is doing more of the portfolio's moving than its size suggests.</Muted>}
      </StateView>
    </Frame>
  );
}

// ─── AN-13 Monte Carlo ────────────────────────────────────────
export function MonteCarloView({ status, data: d, reason, asOf, source, basis, coverage, stale, goal, goalReason, years, setYears, monthly, setMonthly, size = "m", page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("fan");
  const target = goal?.goal?.target ?? null;
  const o = d?.outcomes;
  return (
    <Frame id="monte-carlo" index={6} label="Possible futures" title="A described sample, not a forecast"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Form" value={form} onChange={setForm} options={[{ value: "fan", label: "Fan" }, { value: "bands", label: "Lucky / base / rough" }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} />}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 6 }}>
        <Slider label="Horizon" value={years} min={1} max={40} onChange={setYears} format={v => `${v} years`} />
        <Slider label="Monthly contribution" value={monthly} min={0} max={5000} step={50} onChange={setMonthly} format={v => gbp(v)} />
      </div>
      <StateView status={status} reason={reason} onRetry={refetch} height={220}>
        {d && form === "fan" && <FanChart bands={d.bands} goal={target} height={size === "s" ? 190 : 240} summary={`After ${d.years} years: median ${gbp(o.median)}, 5th percentile ${gbp(o.p5)}, 95th ${gbp(o.p95)}.`} />}
        {d && form === "bands" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
            <Stat size="s" label="Rough (10th pct)" value={gbpCompact(o.p10)} sub="1 in 10 paths end below" />
            <Stat size="s" label="Base (median)" value={gbpCompact(o.median)} sub={`real ${gbpCompact(d.real.median)} at 2.5% inflation`} />
            <Stat size="s" label="Lucky (90th pct)" value={gbpCompact(o.p90)} sub="1 in 10 paths end above" />
          </div>
        )}
        {d && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", marginTop: 6 }}>
            <Stat size="s" label="Paid in" value={gbpCompact(d.contributed)} sub={`${d.paths ?? d.inputs?.paths} paths`} />
            <Stat size="s" label="Below paid in" value={`${d.probabilityOfLoss}%`} sub="of paths" />
            <Stat size="s" label="Goal" value={goal ? `${goal.probabilityPct}%` : null} reason={goalReason ?? "No goal set"} sub={goal ? `reach ${gbpCompact(goal.goal.target)} by ${date(goal.goal.targetDate)} (goal's own horizon and contribution)` : "set one on the Overview"} />
          </div>
        )}
        {d && <Muted size={10}>Resamples 21-day blocks of this book's own {d.returnsUsed} daily returns. The goal tile uses the goal you saved (its date and monthly amount), not these sliders.</Muted>}
      </StateView>
    </Frame>
  );
}
