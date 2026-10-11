// Shared chart plumbing: responsive width, linear scales, nice ticks, date
// ticks and a tooltip box. Hand-written SVG throughout (no chart library),
// colours only from theme tokens.

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useT, FONT, soft } from "../theme.jsx";

export function useWidth(initial = 600) {
  const ref = useRef(null);
  const [w, setW] = useState(initial);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const set = () => setW(Math.max(120, Math.floor(el.getBoundingClientRect().width)));
    set();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(set); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export const scale = (d0, d1, r0, r1) => {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return v => r0 + (v - d0) * k;
};

export function niceTicks(lo, hi, n = 5) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [];
  if (lo === hi) { lo -= 1; hi += 1; }
  const span = hi - lo;
  const step0 = span / n;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const start = Math.ceil(lo / step) * step;
  const out = [];
  for (let v = start; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

export function extent(values, pad = 0.04) {
  const xs = values.filter(v => Number.isFinite(v));
  if (!xs.length) return [0, 1];
  let lo = Math.min(...xs), hi = Math.max(...xs);
  if (lo === hi) { lo -= Math.abs(lo) * 0.01 || 1; hi += Math.abs(hi) * 0.01 || 1; }
  const p = (hi - lo) * pad;
  return [lo - p, hi + p];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Date ticks: month starts for short spans, year starts for long ones. */
export function dateTicks(dates, maxTicks = 7) {
  if (dates.length < 2) return [];
  const days = (Date.parse(dates[dates.length - 1]) - Date.parse(dates[0])) / 86400000;
  const out = [];
  let prevKey = null;
  dates.forEach((d, i) => {
    const key = days > 800 ? d.slice(0, 4) : d.slice(0, 7);
    if (key !== prevKey && i > 0) out.push({ i, label: days > 800 ? d.slice(0, 4) : `${MONTHS[Number(d.slice(5, 7)) - 1]}${d.slice(5, 7) === "01" ? ` ${d.slice(2, 4)}` : ""}` });
    prevKey = key;
  });
  const every = Math.max(1, Math.ceil(out.length / maxTicks));
  return out.filter((_, k) => k % every === 0);
}

export function Tooltip({ x, y, width, children, visible }) {
  const t = useT();
  if (!visible) return null;
  const left = Math.min(Math.max(x + 12, 0), Math.max(0, width - 210));
  return (
    <div role="status" aria-live="polite" style={{ position: "absolute", left, top: Math.max(0, y - 10), pointerEvents: "none", zIndex: 20,
      background: t.tooltipBg, border: `1px solid ${t.borderStrong}`, borderRadius: 5, padding: "6px 9px", fontSize: 11, fontFamily: FONT.mono, color: t.textSecondary,
      boxShadow: `0 6px 18px ${soft(t.appBg, 55)}`, minWidth: 120, maxWidth: 220 }}>
      {children}
    </div>
  );
}

/** Keyboard crosshair for a chart: arrows move, Home/End jump, Esc clears. */
export function useCrosshair(n) {
  const [i, setI] = useState(null);
  const onKeyDown = e => {
    if (!n) return;
    if (e.key === "ArrowRight") { e.preventDefault(); setI(v => Math.min(n - 1, (v ?? -1) + 1)); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); setI(v => Math.max(0, (v ?? n) - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setI(0); }
    else if (e.key === "End") { e.preventDefault(); setI(n - 1); }
    else if (e.key === "Escape") setI(null);
  };
  return [i, setI, onKeyDown];
}

export function AxisLabel({ x, y, children, anchor = "middle" }) {
  const t = useT();
  return <text x={x} y={y} textAnchor={anchor} fontSize={10} fill={t.chartAxis} fontFamily={FONT.mono}>{children}</text>;
}

export function useStableId(prefix) {
  const r = useRef(`${prefix}-${Math.random().toString(36).slice(2, 8)}`);
  return r.current;
}

export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
