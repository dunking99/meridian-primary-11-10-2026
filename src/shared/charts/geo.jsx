// VF-20 world map, VF-21 globe, VF-19 distance-from-home bubbles.
//
// Geometry is bundled here, not fetched: a set of deliberately low-polygon
// land outlines (hand-authored, schematic — accurate to a few degrees, which
// is all a region-level shading needs) rasterised once into a dot grid. No
// CDN, no topojson dependency. Each dot is assigned to one of the listing-venue
// regions the look-through engine reports; a region with no measured exposure
// is drawn plain, and "not disclosed" is never given a place on the map.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useT, FONT, soft, mix, cat } from "../theme.jsx";
import { useWidth } from "./core.jsx";
import { useReducedMotion } from "../ui.jsx";

// [lon, lat] rings, anticlockwise-ish; schematic.
const LAND = [
  [[-168, 65], [-160, 71], [-140, 70], [-125, 72], [-95, 75], [-80, 73], [-65, 62], [-55, 52], [-66, 45], [-75, 38], [-81, 31], [-80, 25], [-90, 29], [-97, 26], [-97, 20], [-90, 16], [-83, 9], [-78, 8], [-86, 14], [-105, 20], [-110, 24], [-117, 32], [-124, 40], [-124, 48], [-135, 58], [-150, 60], [-165, 60]],
  [[-50, 60], [-40, 62], [-20, 70], [-20, 80], [-40, 83], [-60, 80], [-70, 77], [-55, 70]],
  [[-80, 8], [-72, 12], [-60, 10], [-50, 0], [-35, -5], [-38, -15], [-48, -26], [-58, -38], [-66, -55], [-72, -50], [-74, -40], [-71, -20], [-76, -12], [-81, -5], [-78, 2]],
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [3, 51], [8, 54], [10, 57], [5, 62], [15, 69], [28, 71], [40, 68], [42, 60], [30, 55], [40, 47], [30, 45], [28, 41], [24, 38], [20, 40], [15, 38], [12, 44], [8, 44], [3, 43], [-3, 37]],
  [[-5.5, 50], [1.5, 51], [2, 53], [-1.5, 56], [-3.5, 58.5], [-6, 57.5], [-5, 54.5], [-3, 53]],
  [[-10, 51.5], [-6, 52], [-6, 55], [-8.5, 55]],
  [[-17, 21], [-16, 28], [-10, 32], [-5, 36], [10, 37], [11, 33], [20, 32], [32, 31], [35, 28], [43, 12], [51, 12], [40, -3], [40, -15], [35, -25], [28, -34], [18, -34], [12, -17], [9, -2], [9, 4], [-8, 4], [-15, 11]],
  [[35, 28], [35, 33], [43, 37], [48, 30], [56, 26], [59, 22], [52, 16], [44, 12], [38, 20]],
  [[30, 45], [40, 47], [48, 42], [55, 38], [62, 25], [68, 24], [72, 20], [77, 8], [80, 15], [88, 22], [92, 21], [98, 16], [100, 7], [104, 1], [106, 10], [109, 12], [108, 21], [117, 23], [121, 28], [122, 31], [121, 40], [128, 38], [129, 35], [127, 40], [130, 42], [135, 44], [142, 47], [141, 52], [137, 54], [141, 59], [155, 60], [163, 62], [178, 65], [180, 70], [140, 73], [110, 77], [80, 73], [60, 70], [50, 68], [42, 66], [40, 68], [28, 71], [30, 60], [30, 55]],
  [[130, 31], [132, 34], [136, 34], [140, 36], [142, 40], [141, 43], [145, 44], [142, 45], [140, 42], [139, 38], [136, 36], [131, 34]],
  [[109, 1], [117, 7], [119, 1], [116, -4], [110, -3]],
  [[95, 5], [98, 4], [106, -6], [102, -4]],
  [[131, -1], [141, -3], [150, -10], [141, -9], [132, -4]],
  [[120, 18], [122, 18], [126, 7], [122, 7]],
  [[113, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [151, -34], [146, -39], [138, -35], [131, -31], [115, -34], [114, -26]],
  [[172, -34], [178, -38], [175, -42], [170, -46], [167, -45], [172, -40]],
];

export const REGIONS = ["North America", "Latin America", "UK", "Europe", "Africa / Middle East", "Asia-Pacific"];
export const REGION_CENTRES = {
  "North America": [-100, 42], "Latin America": [-62, -12], UK: [-2, 54], Europe: [12, 50],
  "Africa / Middle East": [25, 8], "Asia-Pacific": [115, 15],
};
const HOME = REGION_CENTRES.UK;

function inRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function regionOf(lon, lat) {
  if (lon >= -8.5 && lon <= 2 && lat >= 49.5 && lat <= 59) return "UK";
  if (lon < -30) return lat > 14 && !(lon > -118 && lon < -86 && lat < 31) ? "North America" : "Latin America";
  if (lat < 36 && lon >= -20 && lon <= 60) return "Africa / Middle East";
  if (lon >= 35 && lon <= 60 && lat < 42) return "Africa / Middle East";
  if (lon >= -11 && lon <= 42 && lat >= 35) return "Europe";
  return "Asia-Pacific";
}

let DOTS = null;
function dots(step = 3) {
  if (DOTS) return DOTS;
  const out = [];
  for (let lat = -56; lat <= 82; lat += step) {
    for (let lon = -180; lon < 180; lon += step) {
      if (LAND.some(r => inRing(lon, lat, r))) out.push({ lon, lat, region: regionOf(lon, lat) });
    }
  }
  DOTS = out;
  return out;
}

const shade = (t, share, max) => (share == null || share <= 0 ? t.surfaceInset : mix(t.info, t.surfaceInset, 30 + (share / (max || 1)) * 70));

/** VF-20 equirectangular dot map. `shares` { region: fraction }; `selected` highlights one. */
export function WorldMap({ shares = {}, selected, onSelect, height, summary }) {
  const t = useT();
  const [ref, width] = useWidth();
  const h = height ?? Math.min(340, Math.round(width * 0.46));
  const all = dots();
  const max = Math.max(0, ...Object.values(shares).filter(Number.isFinite));
  // Keep the projection's aspect when the height is capped: centre it.
  const w = Math.min(width, h / 0.46), x0 = (width - w) / 2;
  const X = lon => x0 + ((lon + 180) / 360) * w, Y = lat => ((84 - lat) / 142) * h;
  const r = Math.max(1.2, w / 360 * 1.15);
  return (
    <div ref={ref}>
      <svg width={width} height={h} role="img" aria-label={summary} style={{ display: "block" }}>
        {all.map((d, i) => (
          <circle key={i} cx={X(d.lon)} cy={Y(d.lat)} r={r} fill={shade(t, shares[d.region], max)}
            opacity={selected && selected !== d.region ? 0.35 : 1} onClick={onSelect ? () => onSelect(d.region) : undefined} style={{ cursor: onSelect ? "pointer" : "default" }} />
        ))}
      </svg>
    </div>
  );
}

/**
 * VF-21 globe: orthographic projection of the same dots on a canvas. Drag or
 * arrow keys rotate; with reduced motion it never spins on its own. Falls back
 * to nothing heavier than the map if canvas is unavailable.
 */
export function Globe({ shares = {}, selected, size = 300, summary, autoSpin = true }) {
  const t = useT();
  const reduced = useReducedMotion();
  const canvas = useRef(null);
  const rot = useRef({ lon: -10, lat: 25 });
  const drag = useRef(null);
  const [, force] = useState(0);
  const all = dots();
  const max = Math.max(0, ...Object.values(shares).filter(Number.isFinite));

  const draw = () => {
    const c = canvas.current; if (!c?.getContext) return;
    const ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    c.width = size * dpr; c.height = size * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const R = size / 2 - 4, cx = size / 2, cy = size / 2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = t.surfaceAlt; ctx.fill();
    ctx.strokeStyle = t.border; ctx.stroke();
    const l0 = rot.current.lon * Math.PI / 180, p0 = rot.current.lat * Math.PI / 180;
    for (const d of all) {
      const l = d.lon * Math.PI / 180, p = d.lat * Math.PI / 180;
      const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l - l0);
      if (cosc <= 0) continue;
      const x = cx + R * Math.cos(p) * Math.sin(l - l0);
      const y = cy - R * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l - l0));
      const s = shares[d.region];
      ctx.globalAlpha = (selected && selected !== d.region ? 0.3 : 1) * (0.45 + 0.55 * cosc);
      ctx.fillStyle = s > 0 ? t.info : t.textFaint;
      ctx.globalAlpha *= s > 0 ? 0.35 + 0.65 * (s / (max || 1)) : 0.35;
      ctx.beginPath(); ctx.arc(x, y, 1.6 + cosc * 0.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  useEffect(() => { draw(); });
  useEffect(() => {
    if (reduced || !autoSpin) return undefined;
    let raf, last = performance.now();
    const step = now => {
      if (!drag.current) { rot.current.lon += (now - last) * 0.006; draw(); }
      last = now; raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduced, autoSpin, shares, selected, t]);  // eslint-disable-line react-hooks/exhaustive-deps

  const onKey = e => {
    const k = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, 8], ArrowDown: [0, -8] }[e.key];
    if (!k) return;
    e.preventDefault();
    rot.current = { lon: rot.current.lon + k[0], lat: Math.max(-60, Math.min(60, rot.current.lat + k[1])) };
    force(n => n + 1);
  };
  return (
    <canvas ref={canvas} width={size} height={size} tabIndex={0} role="img" aria-label={`${summary ?? "Globe"}. Arrow keys rotate.`}
      style={{ width: size, height: size, cursor: "grab", display: "block", borderRadius: "50%" }}
      onKeyDown={onKey}
      onPointerDown={e => { drag.current = { x: e.clientX, y: e.clientY, ...rot.current }; e.currentTarget.setPointerCapture?.(e.pointerId); }}
      onPointerMove={e => {
        if (!drag.current) return;
        rot.current = { lon: drag.current.lon - (e.clientX - drag.current.x) * 0.5, lat: Math.max(-60, Math.min(60, drag.current.lat + (e.clientY - drag.current.y) * 0.4)) };
        draw();
      }}
      onPointerUp={() => { drag.current = null; }} />
  );
}

function greatCircleKm([lon1, lat1], [lon2, lat2]) {
  const rad = x => x * Math.PI / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/** VF-19: home (UK) at the centre; each region at a radius set by distance, sized by weight. */
export function DistanceBubbles({ shares = {}, size = 260, summary }) {
  const t = useT();
  const entries = REGIONS.filter(r => r !== "UK").map((r, i) => ({ r, km: greatCircleKm(HOME, REGION_CENTRES[r]), share: shares[r] ?? 0, i }));
  const maxKm = Math.max(...entries.map(e => e.km));
  const cx = size / 2, cy = size / 2, R = size / 2 - 30;
  const bubble = s => 4 + Math.sqrt(Math.max(0, s)) * 34;
  return (
    <svg width={size} height={size} role="img" aria-label={summary} style={{ display: "block" }}>
      {[0.33, 0.66, 1].map(f => <circle key={f} cx={cx} cy={cy} r={R * f} fill="none" stroke={t.chartGrid} strokeDasharray="2 3" />)}
      <circle cx={cx} cy={cy} r={bubble(shares.UK ?? 0)} fill={soft(cat(t, 1), 55)} stroke={cat(t, 1)} />
      <text x={cx} y={cy + 3} textAnchor="middle" fontSize={9.5} fill={t.text} fontFamily={FONT.mono}>UK {((shares.UK ?? 0) * 100).toFixed(0)}%</text>
      {entries.map((e, k) => {
        const ang = (k / entries.length) * Math.PI * 2 - Math.PI / 2;
        const rr = (e.km / maxKm) * R;
        const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
        return (
          <g key={e.r}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke={t.chartGrid} />
            <circle cx={x} cy={y} r={bubble(e.share)} fill={e.share > 0 ? soft(t.info, 55) : "none"} stroke={e.share > 0 ? t.info : t.borderStrong} />
            <text x={x} y={y + bubble(e.share) + 11} textAnchor="middle" fontSize={9} fill={t.textSecondary} fontFamily={FONT.mono}>{e.r.replace(" / ", "/")} {(e.share * 100).toFixed(0)}%</text>
          </g>
        );
      })}
    </svg>
  );
}
