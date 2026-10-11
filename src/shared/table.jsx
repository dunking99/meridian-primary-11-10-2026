// VF-23 data table.
//
// Columns: [{ key, label, align, width, sortValue(row), render(row), csv(row),
//             group, optional, defaultHidden }]
// - sort by clicking a header (or Enter on it); null values always sort last;
// - column chooser for `optional` columns, remembered per viewer;
// - optional grouping rows by a key, with a group header and subtotal slot;
// - sticky header; Up/Down move the active row, Enter opens it;
// - CSV export of exactly what is visible (filters and hidden columns applied);
// - windowed rendering past 200 rows so a long table stays responsive.

import React, { useMemo, useRef, useState } from "react";
import { useT, FONT } from "./theme.jsx";
import { useLocalPref } from "./ui.jsx";

const byNull = (a, b, dir) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return (typeof a === "string" ? a.localeCompare(b) : a - b) * dir;
};

export function toCsv(columns, rows) {
  const esc = v => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map(c => esc(c.csvLabel ?? c.label)).join(",");
  const body = rows.map(r => columns.map(c => esc(c.csv ? c.csv(r) : (c.sortValue ? c.sortValue(r) : r[c.key]))).join(",")).join("\n");
  return `${head}\n${body}\n`;
}

export function downloadCsv(filename, text) {
  const blob = new Blob(["﻿", text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DataTable({ id, columns, rows, rowKey = r => r.id ?? r.symbol, groupBy = null, groupLabel = g => g, groupFooter = null,
  onOpen, selectedKey, onSelect, initialSort = null, maxHeight = 560, caption, dense = false, footer = null, rowTone = null }) {
  const t = useT();
  const [sort, setSort] = useState(initialSort);
  const [hidden, setHidden] = useLocalPref(`table_${id}_hidden`, columns.filter(c => c.defaultHidden).map(c => c.key));
  const [chooser, setChooser] = useState(false);
  const [active, setActive] = useState(-1);
  const [scrollTop, setScrollTop] = useState(0);
  const body = useRef(null);
  const visibleCols = columns.filter(c => !hidden.includes(c.key));

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find(c => c.key === sort.key);
    const get = col?.sortValue ?? (r => r[sort.key]);
    return [...rows].sort((a, b) => byNull(get(a), get(b), sort.dir));
  }, [rows, sort, columns]);

  const flat = useMemo(() => {
    if (!groupBy) return sorted.map(r => ({ kind: "row", row: r }));
    const groups = new Map();
    for (const r of sorted) { const g = groupBy(r) ?? "Unclassified"; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(r); }
    const out = [];
    for (const [g, rs] of groups) { out.push({ kind: "group", key: g, rows: rs }); rs.forEach(r => out.push({ kind: "row", row: r })); }
    return out;
  }, [sorted, groupBy]);

  const rowH = dense ? 30 : 38;
  const windowed = flat.length > 200;
  const viewRows = windowed ? Math.ceil(maxHeight / rowH) + 10 : flat.length;
  const start = windowed ? Math.max(0, Math.floor(scrollTop / rowH) - 5) : 0;
  const slice = flat.slice(start, start + viewRows);
  const rowItems = flat.filter(f => f.kind === "row");

  const header = key => {
    setSort(s => !s || s.key !== key ? { key, dir: -1 } : s.dir === -1 ? { key, dir: 1 } : null);
  };
  const onKey = e => {
    if (!rowItems.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); const n = Math.min(rowItems.length - 1, active + 1); setActive(n); onSelect?.(rowKey(rowItems[n].row)); }
    if (e.key === "ArrowUp") { e.preventDefault(); const n = Math.max(0, active - 1); setActive(n); onSelect?.(rowKey(rowItems[n].row)); }
    if (e.key === "Enter" && active >= 0) onOpen?.(rowItems[active].row);
    if (e.key === "Escape") { setActive(-1); onSelect?.(null); }
  };
  const grid = visibleCols.map(c => c.width ?? "minmax(70px, 1fr)").join(" ");
  const cellBase = { padding: dense ? "5px 8px" : "8px 8px", fontSize: 11.5, fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 6, position: "relative" }}>
        {columns.some(c => c.optional) && (
          <button onClick={() => setChooser(o => !o)} aria-expanded={chooser}
            style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.textSecondary, borderRadius: 3, padding: "3px 9px", fontSize: 10.5, cursor: "pointer", fontFamily: FONT.mono }}>
            Columns ▾
          </button>
        )}
        <button onClick={() => downloadCsv(`meridian-${id}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(visibleCols, rowItems.map(f => f.row)))}
          title="Download exactly what is shown, as UTF-8 CSV with GBP amounts"
          style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.textSecondary, borderRadius: 3, padding: "3px 9px", fontSize: 10.5, cursor: "pointer", fontFamily: FONT.mono }}>
          CSV ↓
        </button>
        {chooser && (
          <div role="dialog" aria-label="Choose columns" style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 30, background: t.tooltipBg, border: `1px solid ${t.borderStrong}`, borderRadius: 6, padding: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 14px" }}>
            {columns.filter(c => c.optional).map(c => (
              <label key={c.key} style={{ fontSize: 11, color: t.textSecondary, display: "flex", gap: 6, alignItems: "center", whiteSpace: "nowrap" }}>
                <input type="checkbox" checked={!hidden.includes(c.key)} onChange={e => setHidden(h => e.target.checked ? h.filter(k => k !== c.key) : [...h, c.key])} />
                {c.label}
              </label>
            ))}
          </div>
        )}
      </div>
      <div role="grid" aria-label={caption} aria-rowcount={rowItems.length} tabIndex={0} onKeyDown={onKey}
        ref={body} onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
        style={{ maxHeight, overflow: "auto", border: `1px solid ${t.borderSubtle}`, borderRadius: 6, outline: "none" }}
        onFocus={e => { e.currentTarget.style.boxShadow = `0 0 0 2px ${t.focusRing}`; }} onBlur={e => { e.currentTarget.style.boxShadow = "none"; }}>
        <div role="row" style={{ display: "grid", gridTemplateColumns: grid, position: "sticky", top: 0, zIndex: 2, background: t.surface, borderBottom: `1px solid ${t.borderStrong}` }}>
          {visibleCols.map(c => (
            <div key={c.key} role="columnheader" aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
              tabIndex={c.sortable === false ? -1 : 0} onClick={c.sortable === false ? undefined : () => header(c.key)}
              onKeyDown={e => { if (e.key === "Enter" && c.sortable !== false) header(c.key); }}
              style={{ ...cellBase, fontSize: 9.5, letterSpacing: 1, color: t.textMuted, textTransform: "uppercase", cursor: c.sortable === false ? "default" : "pointer", textAlign: c.align ?? "left", userSelect: "none" }}>
              {c.label}{sort?.key === c.key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
            </div>
          ))}
        </div>
        {windowed && <div style={{ height: start * rowH }} />}
        {slice.map(f => {
          if (f.kind === "group") {
            return (
              <div key={`g-${f.key}`} role="row" style={{ display: "grid", gridTemplateColumns: grid, background: t.surfaceInset, borderBottom: `1px solid ${t.border}` }}>
                <div role="rowheader" style={{ ...cellBase, gridColumn: `1 / span ${Math.max(1, visibleCols.length - 2)}`, fontFamily: FONT.sans, fontWeight: 700, color: t.text }}>{groupLabel(f.key)} <span style={{ color: t.textFaint, fontWeight: 400 }}>· {f.rows.length}</span></div>
                {groupFooter && <div style={{ ...cellBase, gridColumn: `span 2`, textAlign: "right", color: t.textSecondary }}>{groupFooter(f.rows)}</div>}
              </div>
            );
          }
          const k = rowKey(f.row);
          const idx = rowItems.indexOf(f);
          const on = selectedKey != null && selectedKey === k;
          const focus = idx === active;
          return (
            <div key={k} role="row" aria-selected={on} onClick={() => { setActive(idx); onSelect?.(k); onOpen?.(f.row); }}
              style={{ display: "grid", gridTemplateColumns: grid, borderBottom: `1px solid ${t.borderSubtle}`, minHeight: rowH, alignItems: "center", cursor: onOpen ? "pointer" : "default",
                background: on ? t.accentSoft : focus ? t.surfaceInset : rowTone ? rowTone(f.row) : "transparent", outline: focus ? `1px solid ${t.focusRing}` : "none", outlineOffset: -1 }}>
              {visibleCols.map(c => (
                <div key={c.key} role="gridcell" style={{ ...cellBase, textAlign: c.align ?? "left", color: t.text }}>{c.render ? c.render(f.row) : f.row[c.key]}</div>
              ))}
            </div>
          );
        })}
        {windowed && <div style={{ height: Math.max(0, (flat.length - start - viewRows) * rowH) }} />}
        {footer && <div role="row" style={{ display: "grid", gridTemplateColumns: grid, borderTop: `1px solid ${t.borderStrong}`, background: t.surface, position: "sticky", bottom: 0 }}>{footer(visibleCols, cellBase)}</div>}
      </div>
    </div>
  );
}
