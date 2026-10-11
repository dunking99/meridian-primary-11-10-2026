// VF-01 Line / area chart.
//
// Series share one x axis of dates and are drawn only where they have values
// (a null is a gap, never a zero). Optional: a benchmark drawn dashed, the
// band between the first two series shaded ahead/behind, an underlay panel
// (drawdown), vertical markers (peak, deposits, events), a crosshair that
// works by mouse and by keyboard, and a text alternative that states the
// numbers actually drawn.

import React, { useMemo, useState } from "react";
import { useT, FONT, soft } from "../theme.jsx";
import { useWidth, scale, niceTicks, extent, dateTicks, Tooltip, useCrosshair, useStableId } from "./core.jsx";
import { SrOnly } from "../ui.jsx";

/**
 * @param dates   ['YYYY-MM-DD', ...]
 * @param series  [{ key, label, values: number|null[], colour, dashed, width, area }]
 * @param band    { a: seriesKey, b: seriesKey } shade where a > b (ahead) / a < b (behind)
 * @param markers [{ i, label, colour }]
 * @param underlay { values, label, format } drawn in a strip below (e.g. drawdown %)
 */
export function LineChart({ dates, series, band = null, markers = [], underlay = null, height = 240, format = v => v.toFixed(1),
  yLabel = null, baseline = null, summary, onHover, highlight = null }) {
  const t = useT();
  const [ref, width] = useWidth();
  const clip = useStableId("clip");
  const [hi, setHi, onKey] = useCrosshair(dates.length);
  const [mouse, setMouse] = useState(false);
  const padL = 46, padR = 14, padT = 10, padB = 22;
  const mainH = underlay ? height * 0.74 : height;
  const underH = underlay ? height - mainH - 6 : 0;
  const all = series.flatMap(s => s.values).concat(baseline != null ? [baseline] : []);
  const [y0, y1] = extent(all);
  const x = scale(0, Math.max(1, dates.length - 1), padL, width - padR);
  const y = scale(y0, y1, mainH - padB, padT);
  const path = vals => {
    let d = "", pen = false;
    vals.forEach((v, i) => {
      if (v == null || !Number.isFinite(v)) { pen = false; return; }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`; pen = true;
    });
    return d;
  };

  const bandPaths = useMemo(() => {
    if (!band) return null;
    const A = series.find(s => s.key === band.a)?.values ?? [], B = series.find(s => s.key === band.b)?.values ?? [];
    const seg = [];
    let cur = null;
    for (let i = 0; i < dates.length; i++) {
      const a = A[i], b = B[i];
      if (a == null || b == null) { if (cur) { seg.push(cur); cur = null; } continue; }
      const ahead = a >= b;
      if (!cur || cur.ahead !== ahead) { if (cur) seg.push(cur); cur = { ahead, pts: [] }; }
      cur.pts.push([i, a, b]);
    }
    if (cur) seg.push(cur);
    return seg.filter(s => s.pts.length > 1).map(s => ({
      ahead: s.ahead,
      d: `M${s.pts.map(p => `${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join("L")}L${[...s.pts].reverse().map(p => `${x(p[0]).toFixed(1)},${y(p[2]).toFixed(1)}`).join("L")}Z`,
    }));
  }, [band, series, dates.length, width, y0, y1]);  // eslint-disable-line react-hooks/exhaustive-deps

  const ticks = niceTicks(y0, y1, 4);
  const xt = dateTicks(dates, Math.max(3, Math.floor(width / 110)));
  const onMove = e => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = Math.round(((px - padL) / Math.max(1, width - padL - padR)) * (dates.length - 1));
    const c = Math.max(0, Math.min(dates.length - 1, i));
    setHi(c); onHover?.(c);
  };
  const uVals = underlay?.values ?? [];
  const [u0] = extent(uVals.concat([0]), 0.05);
  const uy = scale(u0, 0, mainH + underH - 2, mainH + 4);
  const uPath = underlay ? `M${x(0)},${uy(0)}${uVals.map((v, i) => v == null ? "" : `L${x(i).toFixed(1)},${uy(v).toFixed(1)}`).join("")}L${x(uVals.length - 1)},${uy(0)}Z` : null;

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <svg width={width} height={height} role="img" aria-label={summary ?? "Line chart"} tabIndex={0}
        onKeyDown={onKey} onMouseMove={onMove} onMouseEnter={() => setMouse(true)} onMouseLeave={() => { setMouse(false); setHi(null); onHover?.(null); }}
        style={{ display: "block", outline: "none" }}
        onFocus={e => { e.currentTarget.style.boxShadow = `0 0 0 2px ${t.focusRing}`; }} onBlur={e => { e.currentTarget.style.boxShadow = "none"; setHi(null); }}>
        <defs><clipPath id={clip}><rect x={padL} y={0} width={Math.max(0, width - padL - padR)} height={height} /></clipPath></defs>
        {ticks.map(v => (
          <g key={v}>
            <line x1={padL} x2={width - padR} y1={y(v)} y2={y(v)} stroke={t.chartGrid} strokeWidth={1} />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize={10} fill={t.chartAxis} fontFamily={FONT.mono}>{format(v)}</text>
          </g>
        ))}
        {baseline != null && <line x1={padL} x2={width - padR} y1={y(baseline)} y2={y(baseline)} stroke={t.borderStrong} strokeWidth={1} />}
        {xt.map(tk => <text key={tk.i} x={x(tk.i)} y={mainH - 6} textAnchor="middle" fontSize={10} fill={t.chartAxis} fontFamily={FONT.mono}>{tk.label}</text>)}
        <g clipPath={`url(#${clip})`}>
          {bandPaths?.map((b, k) => <path key={k} d={b.d} fill={soft(b.ahead ? t.positive : t.negative, 22)} stroke="none" />)}
          {series.map(s => s.area && (
            <path key={`${s.key}-a`} d={`${path(s.values)}L${x(s.values.length - 1)},${mainH - padB}L${x(s.values.findIndex(v => v != null))},${mainH - padB}Z`} fill={soft(s.colour, 14)} stroke="none" />
          ))}
          {series.map(s => (
            <path key={s.key} d={path(s.values)} fill="none" stroke={s.colour} strokeWidth={highlight && highlight !== s.key ? 1 : (s.width ?? 1.6)}
              strokeDasharray={s.dashed ? "5 4" : undefined} strokeLinejoin="round" opacity={highlight && highlight !== s.key ? 0.45 : 1} />
          ))}
          {markers.map((m, k) => (
            <g key={k}>
              <line x1={x(m.i)} x2={x(m.i)} y1={padT} y2={mainH - padB} stroke={m.colour ?? t.textFaint} strokeDasharray="2 3" />
              {m.label && <text x={Math.min(width - padR - 4, x(m.i) + 4)} y={padT + 10 + (k % 3) * 11} fontSize={9.5} fill={m.colour ?? t.textMuted} fontFamily={FONT.mono}>{m.label}</text>}
            </g>
          ))}
        </g>
        {underlay && (
          <g>
            <path d={uPath} fill={soft(t.negative, 26)} stroke={t.negative} strokeWidth={0.8} />
            <text x={padL + 4} y={mainH + 14} fontSize={9.5} fill={t.textMuted} fontFamily={FONT.mono}>{underlay.label}</text>
            <text x={padL - 6} y={uy(u0) + 3} textAnchor="end" fontSize={9.5} fill={t.chartAxis} fontFamily={FONT.mono}>{underlay.format ? underlay.format(u0) : u0.toFixed(0)}</text>
          </g>
        )}
        {hi != null && (
          <g>
            <line x1={x(hi)} x2={x(hi)} y1={padT} y2={height - (underlay ? 0 : padB)} stroke={t.textMuted} strokeWidth={1} />
            {series.map(s => s.values[hi] != null && <circle key={s.key} cx={x(hi)} cy={y(s.values[hi])} r={3} fill={s.colour} stroke={t.surface} strokeWidth={1} />)}
          </g>
        )}
      </svg>
      <Tooltip visible={hi != null} x={hi != null ? x(hi) : 0} y={padT} width={width}>
        {hi != null && (
          <>
            <div style={{ color: t.text, marginBottom: 3 }}>{dates[hi]}</div>
            {series.map(s => (
              <div key={s.key} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ color: s.colour }}>{s.dashed ? "- -" : "—"} {s.label}</span>
                <span style={{ color: t.text }}>{s.values[hi] == null ? "no value" : format(s.values[hi])}</span>
              </div>
            ))}
            {underlay && uVals[hi] != null && <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span>{underlay.label}</span><span>{underlay.format ? underlay.format(uVals[hi]) : uVals[hi]}</span></div>}
          </>
        )}
      </Tooltip>
      {!mouse && summary && <SrOnly>{summary}</SrOnly>}
      {yLabel && <div style={{ position: "absolute", top: 0, right: padR, fontSize: 9.5, color: t.textFaint, fontFamily: FONT.mono }}>{yLabel}</div>}
    </div>
  );
}

/** VF-17 Sparkline: closes only, no axis; colour follows direction, last point emphasised. */
export function Sparkline({ values, width = 90, height = 24, colour, label }) {
  const t = useT();
  const vs = (values ?? []).filter(v => Number.isFinite(v));
  if (vs.length < 2) return <span title="No series stored for this range" style={{ display: "inline-block", width, height, fontSize: 9, color: t.textFaint, fontFamily: FONT.mono, lineHeight: `${height}px` }}>no series</span>;
  const [lo, hi] = extent(vs, 0.05);
  const x = scale(0, vs.length - 1, 1, width - 3), y = scale(lo, hi, height - 2, 2);
  const up = vs[vs.length - 1] >= vs[0];
  const c = colour ?? (up ? t.positive : t.negative);
  const d = vs.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  return (
    <svg width={width} height={height} role="img" aria-label={label ?? `Trend ${up ? "up" : "down"} ${(((vs[vs.length - 1] / vs[0]) - 1) * 100).toFixed(1)}% over ${vs.length} closes`} style={{ display: "block", overflow: "visible" }}>
      <path d={d} fill="none" stroke={c} strokeWidth={1.3} strokeLinejoin="round" />
      <circle cx={x(vs.length - 1)} cy={y(vs[vs.length - 1])} r={2} fill={c} />
    </svg>
  );
}

/** Spark-bars: one bar per session, up/down coloured and signed by height. */
export function SparkBars({ values, width = 160, height = 26, label }) {
  const t = useT();
  const vs = (values ?? []).filter(v => Number.isFinite(v));
  if (vs.length < 2) return null;
  const rets = vs.slice(1).map((v, i) => v / vs[i] - 1);
  const m = Math.max(...rets.map(Math.abs)) || 1;
  const bw = width / rets.length;
  return (
    <svg width={width} height={height} role="img" aria-label={label ?? `${rets.filter(r => r > 0).length} up and ${rets.filter(r => r < 0).length} down sessions of the last ${rets.length}`} style={{ display: "block" }}>
      <line x1={0} x2={width} y1={height / 2} y2={height / 2} stroke={t.chartGrid} />
      {rets.map((r, i) => {
        const h = Math.max(1, Math.abs(r) / m * (height / 2 - 1));
        return <rect key={i} x={i * bw + 0.5} width={Math.max(1, bw - 1)} y={r >= 0 ? height / 2 - h : height / 2} height={h} fill={r >= 0 ? t.positive : t.negative} opacity={0.85} />;
      })}
    </svg>
  );
}
