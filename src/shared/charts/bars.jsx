// VF-02 bars (horizontal, diverging, grouped, paired), VF-03 ribbon, VF-09
// waterfall, VF-10 dumbbell and range track, VF-14 ring, VF-16 Pareto and
// Lorenz. All SVG or plain boxes, tokens only, each with a text alternative
// stating the numbers drawn.

import React, { useState } from "react";
import { useT, FONT, soft, cat, hatch } from "../theme.jsx";
import { useWidth, scale, niceTicks, extent, Tooltip } from "./core.jsx";
import { SrOnly } from "../ui.jsx";

const mono = { fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums" };

/** Diverging horizontal bars around zero; rows [{ key, label, sub, value, display }]. */
export function DivergingBars({ rows, format = v => v.toFixed(2), onRow, activeKey, labelWidth = 86, valueWidth = 70, summary, max: maxIn }) {
  const t = useT();
  const max = maxIn ?? (Math.max(1e-9, ...rows.map(r => Math.abs(r.value ?? 0))));
  return (
    <div role="list" aria-label={summary}>
      {rows.map(r => {
        const v = r.value ?? 0;
        const w = Math.abs(v) / max * 50;
        const Tag = onRow ? "button" : "div";
        return (
          <Tag key={r.key} role="listitem" onClick={onRow ? () => onRow(r) : undefined}
            aria-label={`${r.label}: ${r.display ?? format(v)}`}
            style={{ display: "grid", gridTemplateColumns: `${labelWidth}px 1fr ${valueWidth}px`, alignItems: "center", gap: 8, padding: "4px 0", width: "100%",
              background: activeKey === r.key ? t.surfaceInset : "transparent", border: "none", color: "inherit", cursor: onRow ? "pointer" : "default", textAlign: "left", borderRadius: 4 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...mono, fontSize: 11.5, fontWeight: 700, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</div>
              {r.sub && <div style={{ fontSize: 9.5, color: t.textFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.sub}</div>}
            </div>
            <div style={{ position: "relative", height: 12 }}>
              <div style={{ position: "absolute", left: "50%", top: -2, bottom: -2, width: 1, background: t.borderStrong }} />
              {r.value == null ? (
                <div title="No value" style={{ position: "absolute", left: "40%", width: "20%", top: 3, height: 6, background: hatch(t), borderRadius: 2 }} />
              ) : (
                <div style={{ position: "absolute", top: 2, height: 8, borderRadius: 2, background: v >= 0 ? t.positive : t.negative, left: v >= 0 ? "50%" : `${50 - w}%`, width: `${w}%` }} />
              )}
            </div>
            <div style={{ ...mono, fontSize: 11.5, textAlign: "right", color: r.value == null ? t.textFaint : v > 0 ? t.positive : v < 0 ? t.negative : t.textMuted }}>{r.display ?? (r.value == null ? "——" : format(v))}</div>
          </Tag>
        );
      })}
    </div>
  );
}

/** Horizontal bar list with optional target tick; rows [{ key, label, value, target, display, colour }]. */
export function BarList({ rows, max: maxIn, format = v => `${v.toFixed(1)}%`, onRow, activeKey, labelWidth = 110, summary }) {
  const t = useT();
  const max = maxIn ?? Math.max(1e-9, ...rows.map(r => Math.max(r.value ?? 0, r.target ?? 0)));
  return (
    <div role="list" aria-label={summary}>
      {rows.map((r, i) => {
        const Tag = onRow ? "button" : "div";
        return (
          <Tag key={r.key ?? r.label} role="listitem" onClick={onRow ? () => onRow(r) : undefined}
            aria-label={`${r.label}: ${r.display ?? format(r.value)}${r.target != null ? `, target ${format(r.target)}` : ""}`}
            style={{ display: "grid", gridTemplateColumns: `${labelWidth}px 1fr 64px`, gap: 8, alignItems: "center", padding: "4px 0", width: "100%", background: activeKey === (r.key ?? r.label) ? t.surfaceInset : "transparent", border: "none", color: "inherit", textAlign: "left", cursor: onRow ? "pointer" : "default", borderRadius: 4 }}>
            <span style={{ fontSize: 11.5, color: t.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
            <span style={{ position: "relative", height: 8, background: t.surfaceInset, borderRadius: 3 }}>
              {r.value == null ? <span style={{ position: "absolute", inset: 0, background: hatch(t), borderRadius: 3 }} /> :
                <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.max(0, Math.min(100, r.value / max * 100))}%`, background: r.colour ?? cat(t, i), borderRadius: 3 }} />}
              {r.target != null && <span title={`Target ${format(r.target)}`} style={{ position: "absolute", left: `${Math.min(100, r.target / max * 100)}%`, top: -3, bottom: -3, width: 2, background: t.text }} />}
            </span>
            <span style={{ ...mono, fontSize: 11.5, color: t.text, textAlign: "right" }}>{r.display ?? (r.value == null ? "——" : format(r.value))}</span>
          </Tag>
        );
      })}
    </div>
  );
}

/**
 * Grouped vertical bars: categories x series. `values[c][s]` may be null (a
 * hatched stub, never a zero bar). `partial[c]` hatches that category.
 */
export function GroupedBars({ categories, series, values, height = 180, format = v => `${v.toFixed(1)}%`, partial = {}, summary }) {
  const t = useT();
  const [ref, width] = useWidth();
  const [hov, setHov] = useState(null);
  const padL = 40, padB = 22, padT = 8;
  const all = values.flat().filter(v => v != null).concat([0]);
  const [lo, hi] = extent(all, 0.08);
  const y = scale(lo, hi, height - padB, padT);
  const bandW = (width - padL - 8) / Math.max(1, categories.length);
  const barW = Math.max(3, (bandW - 8) / series.length);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <svg width={width} height={height} role="img" aria-label={summary} style={{ display: "block" }}>
        {niceTicks(lo, hi, 4).map(v => (
          <g key={v}><line x1={padL} x2={width} y1={y(v)} y2={y(v)} stroke={v === 0 ? t.borderStrong : t.chartGrid} />
            <text x={padL - 5} y={y(v) + 3} textAnchor="end" fontSize={9.5} fill={t.chartAxis} fontFamily={FONT.mono}>{format(v)}</text></g>
        ))}
        {categories.map((c, ci) => (
          <g key={c} onMouseEnter={() => setHov(ci)} onMouseLeave={() => setHov(null)}>
            {series.map((s, si) => {
              const v = values[ci]?.[si];
              const x0 = padL + ci * bandW + 4 + si * barW;
              if (v == null) return <rect key={s.key} x={x0} width={Math.max(1, barW - 1)} y={y(0) - 3} height={6} fill={t.surfaceInset} />;
              const yy = Math.min(y(v), y(0)), h = Math.max(1, Math.abs(y(v) - y(0)));
              return <rect key={s.key} x={x0} width={Math.max(1, barW - 1)} y={yy} height={h} fill={s.colour ?? cat(t, si)} opacity={partial[c] ? 0.5 : 1} stroke={partial[c] ? s.colour ?? cat(t, si) : "none"} strokeDasharray={partial[c] ? "2 2" : undefined} />;
            })}
            <text x={padL + ci * bandW + bandW / 2} y={height - 6} textAnchor="middle" fontSize={9.5} fill={t.chartAxis} fontFamily={FONT.mono}>{c}{partial[c] ? "*" : ""}</text>
          </g>
        ))}
      </svg>
      <Tooltip visible={hov != null} x={hov != null ? padL + hov * bandW : 0} y={10} width={width}>
        {hov != null && <>
          <div style={{ color: t.text }}>{categories[hov]}{partial[categories[hov]] ? " (partial)" : ""}</div>
          {series.map((s, si) => <div key={s.key} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ color: s.colour ?? cat(t, si) }}>{s.label}</span><span>{values[hov]?.[si] == null ? "no value" : format(values[hov][si])}</span></div>)}
        </>}
      </Tooltip>
    </div>
  );
}

/** VF-09 Waterfall: steps [{ label, value, kind: 'total'|'step' }]. Sums exactly by construction of the input. */
export function Waterfall({ steps, height = 200, format = v => v.toFixed(0), summary, onStep }) {
  const t = useT();
  const [ref, width] = useWidth();
  let run = 0;
  const bars = steps.map(s => {
    if (s.kind === 'total') { run = s.value; return { ...s, from: 0, to: s.value }; }
    const from = run; run += s.value; return { ...s, from, to: run };
  });
  const [lo, hi] = extent(bars.flatMap(b => [b.from, b.to]).concat([0]), 0.08);
  const padL = 56, padB = 34, padT = 10;
  const y = scale(lo, hi, height - padB, padT);
  const bw = (width - padL - 8) / Math.max(1, bars.length);
  return (
    <div ref={ref}>
      <svg width={width} height={height} role="img" aria-label={summary} style={{ display: "block" }}>
        {niceTicks(lo, hi, 4).map(v => <g key={v}><line x1={padL} x2={width} y1={y(v)} y2={y(v)} stroke={v === 0 ? t.borderStrong : t.chartGrid} /><text x={padL - 5} y={y(v) + 3} textAnchor="end" fontSize={9.5} fill={t.chartAxis} fontFamily={FONT.mono}>{format(v)}</text></g>)}
        {bars.map((b, i) => {
          const yy = Math.min(y(b.from), y(b.to)), h = Math.max(1, Math.abs(y(b.to) - y(b.from)));
          const col = b.kind === 'total' ? t.textSecondary : b.value >= 0 ? t.positive : t.negative;
          return (
            <g key={b.label} onClick={onStep ? () => onStep(b) : undefined} style={{ cursor: onStep ? "pointer" : "default" }}>
              <rect x={padL + i * bw + Math.min(6, bw * 0.15)} width={Math.max(1, bw - 2 * Math.min(6, bw * 0.15))} y={yy} height={h} fill={col} opacity={b.kind === 'total' ? 0.7 : 0.9}>
                <title>{`${b.label}: ${format(b.value)}`}</title>
              </rect>
              {i < bars.length - 1 && <line x1={padL + i * bw + bw - 6} x2={padL + (i + 1) * bw + 6} y1={y(b.to)} y2={y(b.to)} stroke={t.textFaint} strokeDasharray="2 2" />}
              <text x={padL + i * bw + bw / 2} y={height - 20} textAnchor="middle" fontSize={9.5} fill={t.textSecondary} fontFamily={FONT.sans}>{b.label.length > 14 ? `${b.label.slice(0, 13)}…` : b.label}</text>
              <text x={padL + i * bw + bw / 2} y={height - 7} textAnchor="middle" fontSize={9.5} fill={col} fontFamily={FONT.mono}>{b.kind === 'step' && b.value > 0 ? "+" : ""}{format(b.value)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** VF-10 Dumbbell rows: two points per row (a vs b) on a shared axis. */
export function Dumbbell({ rows, format = v => `${v.toFixed(1)}%`, aLabel = "Portfolio", bLabel = "Benchmark", summary }) {
  const t = useT();
  const [ref, width] = useWidth();
  const vals = rows.flatMap(r => [r.a, r.b]).filter(v => v != null).concat([0]);
  const [lo, hi] = extent(vals, 0.1);
  const labelW = 64, valW = 120;
  const x = scale(lo, hi, labelW + 8, width - valW - 8);
  const rowH = 22;
  return (
    <div ref={ref}>
      <svg width={width} height={rows.length * rowH + 20} role="img" aria-label={summary} style={{ display: "block" }}>
        <line x1={x(0)} x2={x(0)} y1={0} y2={rows.length * rowH} stroke={t.borderStrong} />
        {rows.map((r, i) => {
          const cy = i * rowH + rowH / 2;
          return (
            <g key={r.label}>
              <text x={0} y={cy + 3} fontSize={11} fill={t.textSecondary} fontFamily={FONT.mono}>{r.label}{r.partial ? "*" : ""}</text>
              {r.a != null && r.b != null && <line x1={x(r.a)} x2={x(r.b)} y1={cy} y2={cy} stroke={r.a >= r.b ? t.positive : t.negative} strokeWidth={2} />}
              {r.b != null && <circle cx={x(r.b)} cy={cy} r={4.5} fill={t.surface} stroke={t.benchmark} strokeWidth={2}><title>{`${bLabel} ${format(r.b)}`}</title></circle>}
              {r.a != null && <circle cx={x(r.a)} cy={cy} r={4.5} fill={t.text}><title>{`${aLabel} ${format(r.a)}`}</title></circle>}
              <text x={width - valW} y={cy + 3} fontSize={10.5} fill={r.a == null ? t.textFaint : r.a >= 0 ? t.positive : t.negative} fontFamily={FONT.mono}>
                {r.a == null ? "no value" : format(r.a)}{r.a != null && r.b != null ? `  ${r.a - r.b >= 0 ? "+" : "−"}${Math.abs(r.a - r.b).toFixed(1)} pp` : ""}
              </text>
            </g>
          );
        })}
        {niceTicks(lo, hi, 5).map(v => <text key={v} x={x(v)} y={rows.length * rowH + 14} textAnchor="middle" fontSize={9} fill={t.chartAxis} fontFamily={FONT.mono}>{format(v)}</text>)}
      </svg>
      <div style={{ display: "flex", gap: 14, fontSize: 10, color: t.textMuted, fontFamily: FONT.mono }}>
        <span>● {aLabel}</span><span>○ {bLabel}</span>
      </div>
    </div>
  );
}

/**
 * VF-10 range track (52-week). A price outside the range is drawn past the
 * end and labelled "past", never pinned to the end.
 */
export function RangeTrack({ low, high, value, lowDate, highDate, compact = false, format = v => v.toFixed(2) }) {
  const t = useT();
  if (![low, high].every(Number.isFinite) || high <= low) return <span style={{ fontSize: 10, color: t.textFaint }}>no range</span>;
  const pos = value == null ? null : (value - low) / (high - low);
  const past = pos != null && (pos > 1 || pos < 0);
  const shown = pos == null ? null : Math.max(-0.08, Math.min(1.08, pos));
  const label = value == null ? "no price" : pos > 1 ? `past the high by ${(((value / high) - 1) * 100).toFixed(1)}%` : pos < 0 ? `past the low by ${(((low / value) - 1) * 100).toFixed(1)}%` : `${(pos * 100).toFixed(0)}% of range`;
  return (
    <div title={`52-week low ${format(low)}${lowDate ? ` (${lowDate})` : ""} · high ${format(high)}${highDate ? ` (${highDate})` : ""} · ${label}`}
      aria-label={`52-week range ${format(low)} to ${format(high)}; ${label}`} role="img" style={{ minWidth: compact ? 70 : 120 }}>
      <div style={{ position: "relative", height: compact ? 10 : 12, margin: "0 6px" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 2, background: t.borderStrong, transform: "translateY(-1px)" }} />
        {shown != null && <div style={{ position: "absolute", left: `${shown * 100}%`, top: 0, bottom: 0, width: past ? 3 : 7, marginLeft: past ? -1 : -3.5, borderRadius: past ? 1 : 4, background: past ? t.warning : t.text }} />}
      </div>
      {!compact && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: t.textFaint, fontFamily: FONT.mono }}>
        <span>{format(low)}</span><span style={{ color: past ? t.warning : t.textFaint }}>{past ? label : ""}</span><span>{format(high)}</span>
      </div>}
      {compact && past && <div style={{ fontSize: 8.5, color: t.warning, fontFamily: FONT.mono, textAlign: "center" }}>{pos > 1 ? "past high" : "past low"}</div>}
    </div>
  );
}

/**
 * VF-03 ribbon: one stacked bar of segments [{ key, label, value (share 0..1), colour }],
 * optional target row with notches, tiny slices (< minShare) merged into "Other (n)".
 */
export function Ribbon({ segments, targets = null, minShare = 0.02, onSelect, selected, height = 30, summary, labels = true }) {
  const t = useT();
  const big = segments.filter(s => s.value >= minShare);
  const small = segments.filter(s => s.value < minShare);
  const shown = small.length > 1 ? [...big, { key: "__other", label: `Other (${small.length})`, value: small.reduce((a, s) => a + s.value, 0), members: small.map(s => s.key) }] : segments;
  return (
    <div role="group" aria-label={summary}>
      <div style={{ display: "flex", height, borderRadius: 4, overflow: "hidden", border: `1px solid ${t.border}` }}>
        {shown.map((s, i) => {
          const on = selected && (selected === s.key || s.members?.includes(selected));
          return (
            <button key={s.key} onClick={onSelect ? () => onSelect(s.key === "__other" ? null : s.key) : undefined}
              aria-pressed={onSelect ? !!on : undefined} aria-label={`${s.label} ${(s.value * 100).toFixed(1)}%`}
              title={`${s.label} ${(s.value * 100).toFixed(1)}%${s.members ? ` — ${s.members.join(", ")}` : ""}`}
              style={{ width: `${s.value * 100}%`, minWidth: 2, border: "none", borderRight: `1px solid ${t.surface}`, padding: 0, cursor: onSelect ? "pointer" : "default",
                background: s.hatched ? hatch(t) : (s.colour ?? cat(t, i)), opacity: selected && !on ? 0.35 : 1, outline: on ? `2px solid ${t.text}` : "none", outlineOffset: -2,
                color: t.surface, fontFamily: FONT.mono, fontSize: 10, textAlign: "left", paddingLeft: 4, overflow: "hidden", whiteSpace: "nowrap" }}>
              {labels && s.value > 0.07 ? `${(s.value * 100).toFixed(1)}%` : ""}
            </button>
          );
        })}
      </div>
      {targets && (
        <div style={{ position: "relative", height: 10, marginTop: 3 }} aria-label="Target weights" role="img">
          {(() => { let acc = 0; return targets.map((tg, i) => { const left = acc; acc += tg.value ?? 0; return (
            <div key={tg.key} title={`${tg.label} target ${tg.value == null ? "none set" : `${(tg.value * 100).toFixed(1)}%`}`}
              style={{ position: "absolute", left: `${left * 100}%`, width: `${(tg.value ?? 0) * 100}%`, top: 2, height: 5, background: tg.value == null ? "transparent" : soft(cat(t, i), 70), borderRight: `2px solid ${t.text}` }} />
          ); }); })()}
        </div>
      )}
      {labels && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 6 }}>
          {shown.map((s, i) => (
            <span key={s.key} style={{ display: "inline-flex", gap: 5, alignItems: "center", fontSize: 10.5, color: t.textSecondary }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.hatched ? hatch(t) : (s.colour ?? cat(t, i)) }} />{s.label} <span style={{ ...mono, color: t.textMuted }}>{(s.value * 100).toFixed(1)}%</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** VF-14 ring: a value on a stated 0..max range, with an accessible value text. Never a score. */
export function Ring({ value, max = 100, size = 64, label, sub, colour }) {
  const t = useT();
  const r = size / 2 - 5, c = 2 * Math.PI * r;
  const f = value == null ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: size }}>
      <svg width={size} height={size} role="img" aria-label={value == null ? `${label}: not measured` : `${label}: ${value} out of ${max}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.surfaceInset} strokeWidth={6} />
        {value != null && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colour ?? t.info} strokeWidth={6} strokeDasharray={`${f * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} strokeLinecap="round" />}
        <text x="50%" y="54%" textAnchor="middle" fontSize={13} fontFamily={FONT.mono} fill={value == null ? t.textFaint : t.text}>{value == null ? "——" : Math.round(value)}</text>
      </svg>
      <div style={{ fontSize: 10.5, color: t.textSecondary, textAlign: "center" }}>{label}</div>
      {sub && <div style={{ fontSize: 9.5, color: t.textFaint, textAlign: "center" }}>{sub}</div>}
    </div>
  );
}

/** VF-16 Pareto: bars of weight with a cumulative line. rows [{label, weightPct, cumulativePct}] */
export function Pareto({ rows, height = 170, summary, caps = [] }) {
  const t = useT();
  const [ref, width] = useWidth();
  const padL = 34, padB = 22, padT = 8;
  const y = scale(0, 100, height - padB, padT);
  const bw = (width - padL - 6) / Math.max(1, rows.length);
  const line = rows.map((r, i) => `${i ? "L" : "M"}${(padL + i * bw + bw / 2).toFixed(1)},${y(r.cumulativePct).toFixed(1)}`).join("");
  return (
    <div ref={ref}>
      <svg width={width} height={height} role="img" aria-label={summary} style={{ display: "block" }}>
        {[0, 25, 50, 75, 100].map(v => <g key={v}><line x1={padL} x2={width} y1={y(v)} y2={y(v)} stroke={t.chartGrid} /><text x={padL - 4} y={y(v) + 3} textAnchor="end" fontSize={9} fill={t.chartAxis} fontFamily={FONT.mono}>{v}%</text></g>)}
        {caps.map(c => <g key={c.label}><line x1={padL} x2={width} y1={y(c.value)} y2={y(c.value)} stroke={t.warning} strokeDasharray="4 3" /><text x={width - 4} y={y(c.value) - 3} textAnchor="end" fontSize={9} fill={t.warning} fontFamily={FONT.mono}>{c.label}</text></g>)}
        {rows.map((r, i) => <rect key={r.label} x={padL + i * bw + 3} width={Math.max(2, bw - 6)} y={y(r.weightPct)} height={y(0) - y(r.weightPct)} fill={cat(t, 0)}><title>{`${r.label}: ${r.weightPct}% (cumulative ${r.cumulativePct}%)`}</title></rect>)}
        <path d={line} fill="none" stroke={t.text} strokeWidth={1.5} />
        {rows.map((r, i) => bw > 26 && <text key={`l${r.label}`} x={padL + i * bw + bw / 2} y={height - 7} textAnchor="middle" fontSize={8.5} fill={t.chartAxis} fontFamily={FONT.mono}>{r.label.slice(0, 7)}</text>)}
      </svg>
    </div>
  );
}

/** VF-16 Lorenz curve with the equality diagonal. points [{x, y}] in 0..1 */
export function Lorenz({ points, size = 170, summary, gini }) {
  const t = useT();
  const pad = 24;
  const s = scale(0, 1, pad, size - 6), sy = scale(0, 1, size - pad, 6);
  const d = points.map((p, i) => `${i ? "L" : "M"}${s(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join("");
  return (
    <svg width={size} height={size} role="img" aria-label={summary} style={{ display: "block" }}>
      <rect x={pad} y={6} width={size - pad - 6} height={size - pad - 6} fill="none" stroke={t.chartGrid} />
      <line x1={s(0)} y1={sy(0)} x2={s(1)} y2={sy(1)} stroke={t.textFaint} strokeDasharray="3 3" />
      <path d={`${d}L${s(1)},${sy(0)}Z`} fill={soft(cat(t, 0), 22)} stroke="none" />
      <path d={d} fill="none" stroke={cat(t, 0)} strokeWidth={1.8} />
      <text x={pad} y={size - 8} fontSize={9} fill={t.chartAxis} fontFamily={FONT.mono}>share of holdings →</text>
      {gini != null && <text x={size - 10} y={size - pad - 6} textAnchor="end" fontSize={10} fill={t.text} fontFamily={FONT.mono}>Gini {gini.toFixed(2)}</text>}
    </svg>
  );
}

/** Paired bars: two values per row (e.g. weight vs risk share). */
export function PairedBars({ rows, aLabel, bLabel, format = v => `${v.toFixed(1)}%`, summary, onRow }) {
  const t = useT();
  const max = Math.max(1e-9, ...rows.flatMap(r => [r.a ?? 0, r.b ?? 0]));
  return (
    <div role="list" aria-label={summary}>
      <div style={{ display: "flex", gap: 12, fontSize: 10, color: t.textMuted, fontFamily: FONT.mono, marginBottom: 6 }}>
        <span><span style={{ display: "inline-block", width: 10, height: 6, background: cat(t, 0), marginRight: 4 }} />{aLabel}</span>
        <span><span style={{ display: "inline-block", width: 10, height: 6, background: cat(t, 1), marginRight: 4 }} />{bLabel}</span>
      </div>
      {rows.map(r => (
        <div key={r.label} role="listitem" onClick={onRow ? () => onRow(r) : undefined} aria-label={`${r.label}: ${aLabel} ${format(r.a)}, ${bLabel} ${r.b == null ? "not measured" : format(r.b)}`}
          style={{ display: "grid", gridTemplateColumns: "80px 1fr 110px", gap: 8, alignItems: "center", padding: "3px 0", cursor: onRow ? "pointer" : "default" }}>
          <span style={{ ...mono, fontSize: 11, color: t.text }}>{r.label}</span>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ height: 6, width: `${(r.a ?? 0) / max * 100}%`, background: cat(t, 0), borderRadius: 2 }} />
            {r.b == null ? <span style={{ height: 6, width: "30%", background: hatch(t) }} /> : <span style={{ height: 6, width: `${r.b / max * 100}%`, background: cat(t, 1), borderRadius: 2 }} />}
          </span>
          <span style={{ ...mono, fontSize: 10.5, color: t.textSecondary, textAlign: "right" }}>{format(r.a)} / {r.b == null ? "——" : format(r.b)}</span>
        </div>
      ))}
    </div>
  );
}

export { SrOnly };
