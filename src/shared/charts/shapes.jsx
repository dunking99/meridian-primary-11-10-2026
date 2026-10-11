// VF-04 donut, VF-05 sunburst, VF-06 squarified treemap, VF-07 heat grid,
// VF-11 scatter, VF-13 fan chart. Hand-written SVG, tokens only.

import React, { useMemo, useState } from "react";
import { useT, FONT, soft, cat, mix, hatch } from "../theme.jsx";
import { useWidth, scale, niceTicks, extent, Tooltip, useStableId } from "./core.jsx";

const TAU = Math.PI * 2;
const arc = (cx, cy, r0, r1, a0, a1) => {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const p = (r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const [x0, y0] = p(r1, a0), [x1, y1] = p(r1, a1), [x2, y2] = p(r0, a1), [x3, y3] = p(r0, a0);
  if (a1 - a0 >= TAU - 1e-6) {
    return `M${cx},${cy - r1}A${r1},${r1} 0 1 1 ${cx - 0.01},${cy - r1}Z M${cx},${cy - r0}A${r0},${r0} 0 1 0 ${cx + 0.01},${cy - r0}Z`;
  }
  return `M${x0},${y0}A${r1},${r1} 0 ${large} 1 ${x1},${y1}L${x2},${y2}A${r0},${r0} 0 ${large} 0 ${x3},${y3}Z`;
};

/** VF-04 donut. slices [{ key, label, value, colour, hatched }], "Other" tail below minShare. */
export function Donut({ slices, size = 180, centre, sub, minShare = 0.015, onSelect, selected, summary }) {
  const t = useT();
  const total = slices.reduce((a, s) => a + Math.max(0, s.value), 0) || 1;
  const big = slices.filter(s => s.value / total >= minShare);
  const small = slices.filter(s => s.value / total < minShare);
  const shown = small.length > 1 ? [...big, { key: "__other", label: `Other (${small.length})`, value: small.reduce((a, s) => a + s.value, 0) }] : slices;
  let a = 0;
  const r1 = size / 2 - 4, r0 = r1 * 0.62;
  return (
    <svg width={size} height={size} role="img" aria-label={summary} style={{ display: "block" }}>
      {shown.map((s, i) => {
        const a0 = a; a += (s.value / total) * TAU;
        const on = selected === s.key;
        return (
          <path key={s.key} d={arc(size / 2, size / 2, r0, on ? r1 + 3 : r1, a0, a)} fill={s.colour ?? cat(t, i)} stroke={t.surface} strokeWidth={1.5}
            opacity={selected && !on ? 0.35 : 1} style={{ cursor: onSelect ? "pointer" : "default" }}
            onClick={onSelect ? () => onSelect(on ? null : s.key) : undefined}>
            <title>{`${s.label}: ${(s.value / total * 100).toFixed(1)}%`}</title>
          </path>
        );
      })}
      {centre && <text x="50%" y="48%" textAnchor="middle" fontSize={15} fontWeight={700} fill={t.text} fontFamily={FONT.mono}>{centre}</text>}
      {sub && <text x="50%" y="59%" textAnchor="middle" fontSize={9.5} fill={t.textMuted} fontFamily={FONT.mono}>{sub}</text>}
    </svg>
  );
}

/**
 * VF-05 sunburst over a tree [{ id, label, value, children }]. Each ring is a
 * level; click a node to drill in, click the centre to drill out.
 */
export function Sunburst({ tree, size = 220, centreLabel = "Whole book", centreValue, onSelect, summary, colourOf }) {
  const t = useT();
  const [focus, setFocus] = useState(null);
  const root = focus ? findNode(tree, focus) : { id: "__root", label: centreLabel, value: tree.reduce((a, n) => a + n.value, 0), children: tree };
  const depth = maxDepth(root.children ?? []);
  const rings = Math.max(1, Math.min(3, depth));
  const R = size / 2 - 4, r0 = R * 0.34, w = (R - r0) / rings;
  const paths = [];
  const walk = (nodes, a0, a1, level, topIndex) => {
    const tot = nodes.reduce((s, n) => s + Math.max(0, n.value), 0) || 1;
    let a = a0;
    nodes.forEach((n, i) => {
      const span = (Math.max(0, n.value) / tot) * (a1 - a0);
      const ti = level === 0 ? i : topIndex;
      const base = colourOf ? colourOf(n, ti) : n.cash ? t.textFaint : n.unseen ? null : cat(t, ti);
      paths.push({ n, d: arc(size / 2, size / 2, r0 + level * w, r0 + (level + 1) * w - 1, a, a + span), fill: base ? mix(base, t.surface, 100 - level * 22) : null, level });
      if (n.children?.length && level + 1 < rings) walk(n.children, a, a + span, level + 1, ti);
      a += span;
    });
  };
  walk(root.children ?? [], 0, TAU, 0, 0);
  const hid = useStableId("hatch");
  return (
    <svg width={size} height={size} role="img" aria-label={summary} style={{ display: "block" }}>
      <defs><pattern id={hid} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill={t.surfaceInset} /><line x1="0" y1="0" x2="0" y2="6" stroke={t.borderStrong} strokeWidth="2" /></pattern></defs>
      {paths.map(p => (
        <path key={p.n.id} d={p.d} fill={p.fill ?? `url(#${hid})`} stroke={t.surface} strokeWidth={1}
          style={{ cursor: p.n.children?.length ? "zoom-in" : "pointer" }}
          tabIndex={p.level === 0 ? 0 : -1}
          onKeyDown={e => { if (e.key === "Enter" && p.n.children?.length) setFocus(p.n.id); }}
          onClick={() => { if (p.n.children?.length && !p.n.leaf) setFocus(p.n.id); else onSelect?.(p.n); }}>
          <title>{`${p.n.label}${p.n.name ? ` — ${p.n.name}` : ""}: ${(p.n.weight != null ? p.n.weight * 100 : 0).toFixed(1)}% of the book`}</title>
        </path>
      ))}
      <g onClick={() => setFocus(null)} style={{ cursor: focus ? "zoom-out" : "default" }} tabIndex={focus ? 0 : -1} onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setFocus(null); }}>
        <circle cx={size / 2} cy={size / 2} r={r0 - 2} fill={t.surface} />
        <text x="50%" y="46%" textAnchor="middle" fontSize={10} fill={t.textMuted} fontFamily={FONT.sans}>{focus ? `${root.label} ↩` : centreLabel}</text>
        <text x="50%" y="56%" textAnchor="middle" fontSize={13} fontWeight={700} fill={t.text} fontFamily={FONT.mono}>{centreValue ?? ""}</text>
      </g>
    </svg>
  );
}

function findNode(nodes, id) {
  for (const n of nodes) { if (n.id === id) return n; const f = n.children ? findNode(n.children, id) : null; if (f) return f; }
  return null;
}
function maxDepth(nodes) { return nodes.length ? 1 + Math.max(...nodes.map(n => maxDepth(n.children ?? []))) : 0; }

/** Squarified treemap layout (Bruls, Huizing, van Wijk). items [{value}] -> rects. */
export function squarify(items, x, y, w, h) {
  const out = [];
  const total = items.reduce((a, i) => a + i.value, 0);
  if (!total || w <= 0 || h <= 0) return out;
  const scaleF = (w * h) / total;
  let rest = items.map(i => ({ ...i, area: i.value * scaleF })).filter(i => i.area > 0).sort((a, b) => b.area - a.area);
  let rx = x, ry = y, rw = w, rh = h;
  const worst = (row, side) => {
    const s = row.reduce((a, r) => a + r.area, 0);
    const mx = Math.max(...row.map(r => r.area)), mn = Math.min(...row.map(r => r.area));
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  };
  while (rest.length) {
    const side = Math.min(rw, rh);
    let row = [rest[0]], k = 1;
    while (k < rest.length && worst([...row, rest[k]], side) <= worst(row, side)) { row.push(rest[k]); k++; }
    const s = row.reduce((a, r) => a + r.area, 0);
    if (rw >= rh) {
      const cw = s / rh; let cy = ry;
      for (const r of row) { const ch = r.area / cw; out.push({ ...r, x: rx, y: cy, w: cw, h: ch }); cy += ch; }
      rx += cw; rw -= cw;
    } else {
      const ch = s / rw; let cx = rx;
      for (const r of row) { const cw = r.area / ch; out.push({ ...r, x: cx, y: ry, w: cw, h: ch }); cx += cw; }
      ry += ch; rh -= ch;
    }
    rest = rest.slice(k);
  }
  return out;
}

/**
 * VF-06 treemap. items [{ key, label, sub, value, colourValue (signed, null = no
 * reading), group }]. Colour: symmetric diverging scale clipped at `clip`,
 * with a legend; a missing reading is hatched, never grey-as-zero. Groups are
 * laid out first, then items inside each.
 */
export function Treemap({ items, height = 320, clip = 3, grouped = false, onSelect, selected, summary, legendLabel = "Today", colourMode = "diverging", format = v => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` }) {
  const t = useT();
  const [ref, width] = useWidth();
  const [hov, setHov] = useState(null);
  const hid = useStableId("tmh");
  const rects = useMemo(() => {
    if (!grouped) return squarify(items, 0, 0, width, height);
    const groups = {};
    for (const it of items) (groups[it.group ?? "Other"] ??= []).push(it);
    const gRects = squarify(Object.entries(groups).map(([g, xs]) => ({ key: g, value: xs.reduce((a, i) => a + i.value, 0) })), 0, 0, width, height);
    return gRects.flatMap(g => squarify(groups[g.key], g.x + 1, g.y + 14, g.w - 2, g.h - 15).map(r => ({ ...r, groupRect: g })))
      .concat(gRects.map(g => ({ key: `__g${g.key}`, groupHeader: true, label: g.key, x: g.x, y: g.y, w: g.w, h: g.h })));
  }, [items, width, height, grouped]);
  const colourFor = v => {
    if (v == null) return `url(#${hid})`;
    if (colourMode === "categorical") return cat(t, v);
    const f = Math.min(1, Math.abs(v) / clip);
    return mix(v >= 0 ? t.positive : t.negative, t.surfaceInset, 25 + f * 70);
  };
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <svg width={width} height={height} role="img" aria-label={summary} style={{ display: "block" }}>
        <defs><pattern id={hid} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill={t.surfaceInset} /><line x1="0" y1="0" x2="0" y2="6" stroke={t.borderStrong} strokeWidth="2" /></pattern></defs>
        {rects.filter(r => r.groupHeader).map(g => (
          <g key={g.key}><rect x={g.x} y={g.y} width={g.w} height={g.h} fill="none" stroke={t.borderStrong} />
            {g.w > 40 && <text x={g.x + 4} y={g.y + 10} fontSize={9} fill={t.textMuted} fontFamily={FONT.mono}>{g.label.toUpperCase().slice(0, Math.floor(g.w / 6))}</text>}</g>
        ))}
        {rects.filter(r => !r.groupHeader).map(r => {
          const on = selected === r.key;
          const fits = r.w > 46 && r.h > 26;
          return (
            <g key={r.key} tabIndex={0} role="button" aria-label={`${r.label}: ${(r.share ?? 0).toFixed?.(1) ?? ""}% of the book, ${r.colourValue == null ? "no reading" : format(r.colourValue)}`}
              onClick={() => onSelect?.(r)} onKeyDown={e => { if (e.key === "Enter") onSelect?.(r); }}
              onMouseEnter={() => setHov(r)} onMouseLeave={() => setHov(null)} onFocus={() => setHov(r)} onBlur={() => setHov(null)} style={{ cursor: onSelect ? "pointer" : "default", outline: "none" }}>
              <rect x={r.x + 1} y={r.y + 1} width={Math.max(0, r.w - 2)} height={Math.max(0, r.h - 2)} fill={colourFor(r.colourValue)} stroke={on ? t.text : t.surface} strokeWidth={on ? 2 : 1} opacity={selected && !on ? 0.45 : 1} />
              {fits && <text x={r.x + 5} y={r.y + 14} fontSize={10.5} fontWeight={700} fill={t.text} fontFamily={FONT.mono}>{r.label.slice(0, Math.floor(r.w / 7))}</text>}
              {fits && r.h > 36 && <text x={r.x + 5} y={r.y + 27} fontSize={9.5} fill={t.textSecondary} fontFamily={FONT.mono}>{r.colourValue == null ? "no reading" : format(r.colourValue)}</text>}
            </g>
          );
        })}
      </svg>
      <Tooltip visible={!!hov} x={hov ? hov.x + hov.w / 2 : 0} y={hov ? hov.y + 10 : 0} width={width}>
        {hov && <><div style={{ color: t.text }}>{hov.label}</div>{hov.sub && <div>{hov.sub}</div>}<div>{legendLabel}: {hov.colourValue == null ? "no reading" : format(hov.colourValue)}</div>{hov.share != null && <div>{hov.share.toFixed(1)}% of the book</div>}</>}
      </Tooltip>
      {colourMode === "diverging" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 9.5, color: t.textMuted, fontFamily: FONT.mono }}>
          <span>{format(-clip)}</span>
          <span style={{ width: 120, height: 7, borderRadius: 2, background: `linear-gradient(90deg, ${t.negative}, ${t.surfaceInset}, ${t.positive})` }} />
          <span>{format(clip)}</span>
          <span>· {legendLabel}, scale clipped at ±{clip}</span>
          <span style={{ display: "inline-block", width: 12, height: 8, background: hatch(t), marginLeft: 6 }} /> no reading
        </div>
      )}
    </div>
  );
}

/**
 * VF-07 heat grid: rows x cols of signed values, symmetric diverging scale,
 * null cells hatched. cells[r][c] = { v, partial, title }.
 */
export function HeatGrid({ rows, cols, cells, clip = 5, format = v => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`, rowTotals, summary, onCell, cellHeight = 24, colourMode = "diverging" }) {
  const t = useT();
  const col = v => {
    if (colourMode === "correlation") {
      const f = Math.min(1, Math.abs(v)); return mix(v >= 0 ? t.negative : t.positive, t.surfaceInset, 15 + f * 75);
    }
    const f = Math.min(1, Math.abs(v) / clip);
    return mix(v >= 0 ? t.positive : t.negative, t.surfaceInset, 20 + f * 70);
  };
  return (
    <div role="table" aria-label={summary} style={{ overflowX: "auto" }}>
      <div role="row" style={{ display: "grid", gridTemplateColumns: `70px repeat(${cols.length}, minmax(34px, 1fr))${rowTotals ? " 70px" : ""}`, gap: 2, fontSize: 9.5, color: t.textMuted, fontFamily: FONT.mono, marginBottom: 2 }}>
        <span role="columnheader" />{cols.map(c => <span role="columnheader" key={c} style={{ textAlign: "center" }}>{c}</span>)}{rowTotals && <span role="columnheader" style={{ textAlign: "right" }}>Year</span>}
      </div>
      {rows.map((r, ri) => (
        <div role="row" key={r} style={{ display: "grid", gridTemplateColumns: `70px repeat(${cols.length}, minmax(34px, 1fr))${rowTotals ? " 70px" : ""}`, gap: 2, marginBottom: 2 }}>
          <span role="rowheader" style={{ fontSize: 10.5, color: t.textSecondary, fontFamily: FONT.mono, alignSelf: "center" }}>{r}</span>
          {cols.map((c, ci) => {
            const cell = cells[ri]?.[ci];
            const v = cell?.v;
            const Tag = onCell && v != null ? "button" : "span";
            return (
              <Tag role="cell" key={c} onClick={onCell && v != null ? () => onCell(r, c, cell) : undefined} title={cell?.title ?? (v == null ? "no value" : format(v))}
                style={{ height: cellHeight, borderRadius: 2, border: cell?.partial ? `1px dashed ${t.textMuted}` : "none", display: "flex", alignItems: "center", justifyContent: "center",
                  background: v == null ? hatch(t) : col(v), color: t.text, fontSize: 9.5, fontFamily: FONT.mono, padding: 0, cursor: Tag === "button" ? "pointer" : "default" }}>
                {v == null ? "" : format(v)}
              </Tag>
            );
          })}
          {rowTotals && <span role="cell" style={{ fontSize: 10.5, fontFamily: FONT.mono, textAlign: "right", alignSelf: "center", color: rowTotals[ri]?.v == null ? t.textFaint : rowTotals[ri].v >= 0 ? t.positive : t.negative }}>{rowTotals[ri]?.v == null ? "——" : format(rowTotals[ri].v)}{rowTotals[ri]?.partial ? "*" : ""}</span>}
        </div>
      ))}
    </div>
  );
}

/** VF-11 scatter / bubble. points [{ x, y, r?, label }]. */
export function Scatter({ points, height = 240, xLabel, yLabel, xFormat = v => v.toFixed(1), yFormat = v => v.toFixed(1), summary, diagonal = false, onPoint, labelPoints = true }) {
  const t = useT();
  const [ref, width] = useWidth();
  const [hov, setHov] = useState(null);
  const padL = 44, padB = 30, padT = 10, padR = 12;
  const [x0, x1] = extent(points.map(p => p.x).concat(diagonal ? points.map(p => p.y) : []), 0.08);
  const [y0, y1] = extent(points.map(p => p.y).concat(diagonal ? points.map(p => p.x) : []), 0.08);
  const lo = Math.min(x0, y0), hi = Math.max(x1, y1);
  const X = scale(diagonal ? lo : x0, diagonal ? hi : x1, padL, width - padR), Y = scale(diagonal ? lo : y0, diagonal ? hi : y1, height - padB, padT);
  const rMax = Math.max(1e-9, ...points.map(p => p.r ?? 0));
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <svg width={width} height={height} role="img" aria-label={summary} style={{ display: "block" }}>
        {niceTicks(diagonal ? lo : y0, diagonal ? hi : y1, 4).map(v => <g key={`y${v}`}><line x1={padL} x2={width - padR} y1={Y(v)} y2={Y(v)} stroke={v === 0 ? t.borderStrong : t.chartGrid} /><text x={padL - 5} y={Y(v) + 3} textAnchor="end" fontSize={9} fill={t.chartAxis} fontFamily={FONT.mono}>{yFormat(v)}</text></g>)}
        {niceTicks(diagonal ? lo : x0, diagonal ? hi : x1, 5).map(v => <g key={`x${v}`}><line y1={padT} y2={height - padB} x1={X(v)} x2={X(v)} stroke={v === 0 ? t.borderStrong : t.chartGrid} /><text y={height - padB + 12} x={X(v)} textAnchor="middle" fontSize={9} fill={t.chartAxis} fontFamily={FONT.mono}>{xFormat(v)}</text></g>)}
        {diagonal && <line x1={X(lo)} y1={Y(lo)} x2={X(hi)} y2={Y(hi)} stroke={t.textFaint} strokeDasharray="4 3" />}
        {points.map((p, i) => {
          const r = p.r != null ? 3 + Math.sqrt(p.r / rMax) * 12 : 2.5;
          return (
            <g key={p.label ?? i} onMouseEnter={() => setHov(p)} onMouseLeave={() => setHov(null)} onClick={() => onPoint?.(p)} style={{ cursor: onPoint ? "pointer" : "default" }}>
              <circle cx={X(p.x)} cy={Y(p.y)} r={r} fill={soft(p.colour ?? cat(t, 0), p.r != null ? 45 : 70)} stroke={p.colour ?? cat(t, 0)} strokeWidth={1} />
              {labelPoints && p.r != null && <text x={X(p.x) + r + 2} y={Y(p.y) + 3} fontSize={9.5} fill={t.textSecondary} fontFamily={FONT.mono}>{p.label}</text>}
            </g>
          );
        })}
        {xLabel && <text x={width - padR} y={height - 4} textAnchor="end" fontSize={9.5} fill={t.textMuted} fontFamily={FONT.sans}>{xLabel}</text>}
        {yLabel && <text x={padL} y={padT + 2} fontSize={9.5} fill={t.textMuted} fontFamily={FONT.sans} dy={-2}>{yLabel}</text>}
      </svg>
      <Tooltip visible={!!hov} x={hov ? X(hov.x) : 0} y={hov ? Y(hov.y) : 0} width={width}>{hov && <><div style={{ color: t.text }}>{hov.label}</div><div>{xLabel}: {xFormat(hov.x)}</div><div>{yLabel}: {yFormat(hov.y)}</div></>}</Tooltip>
    </div>
  );
}

/** VF-13 fan chart: bands [{ year, p5, p25, p50, p75, p95 }], optional goal line. */
export function FanChart({ bands, goal, height = 240, summary, format = v => `£${Math.round(v / 1000)}k` }) {
  const t = useT();
  const [ref, width] = useWidth();
  const padL = 56, padB = 22, padT = 10, padR = 10;
  const all = bands.flatMap(b => [b.p5, b.p95]).concat(goal != null ? [goal] : []);
  const [lo, hi] = extent(all.concat([0]), 0.04);
  const X = scale(bands[0]?.year ?? 0, bands[bands.length - 1]?.year ?? 1, padL, width - padR), Y = scale(Math.max(0, lo), hi, height - padB, padT);
  const area = (a, b) => `M${bands.map(x => `${X(x.year)},${Y(x[a])}`).join("L")}L${[...bands].reverse().map(x => `${X(x.year)},${Y(x[b])}`).join("L")}Z`;
  const line = k => bands.map((x, i) => `${i ? "L" : "M"}${X(x.year)},${Y(x[k])}`).join("");
  return (
    <div ref={ref}>
      <svg width={width} height={height} role="img" aria-label={summary} style={{ display: "block" }}>
        {niceTicks(Math.max(0, lo), hi, 4).map(v => <g key={v}><line x1={padL} x2={width - padR} y1={Y(v)} y2={Y(v)} stroke={t.chartGrid} /><text x={padL - 5} y={Y(v) + 3} textAnchor="end" fontSize={9} fill={t.chartAxis} fontFamily={FONT.mono}>{format(v)}</text></g>)}
        <path d={area("p95", "p5")} fill={soft(cat(t, 0), 16)} />
        <path d={area("p75", "p25")} fill={soft(cat(t, 0), 34)} />
        <path d={line("p50")} fill="none" stroke={cat(t, 0)} strokeWidth={2} />
        {goal != null && <g><line x1={padL} x2={width - padR} y1={Y(goal)} y2={Y(goal)} stroke={t.warning} strokeDasharray="5 4" /><text x={width - padR} y={Y(goal) - 4} textAnchor="end" fontSize={9.5} fill={t.warning} fontFamily={FONT.mono}>goal {format(goal)}</text></g>}
        {bands.filter((b, i) => i % Math.ceil(bands.length / 6) === 0 || i === bands.length - 1).map(b => <text key={b.year} x={X(b.year)} y={height - 6} textAnchor="middle" fontSize={9} fill={t.chartAxis} fontFamily={FONT.mono}>{b.year.toFixed(b.year % 1 ? 1 : 0)}y</text>)}
      </svg>
      <div style={{ display: "flex", gap: 12, fontSize: 9.5, color: t.textMuted, fontFamily: FONT.mono }}>
        <span>— median</span><span style={{ color: t.textSecondary }}>▮ 25th–75th</span><span>▯ 5th–95th</span>
      </div>
    </div>
  );
}

export { hatch };
