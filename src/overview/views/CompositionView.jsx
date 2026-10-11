// OV-02 composition. Forms: donut with lens switch, sunburst <-> treemap,
// stacked ribbon, weighted map (treemap), bars with target ticks, asset-class
// ribbon split by listing venue, and a target-status chip row. Unclassified
// is always a visible slice with its weight.
import React, { useState } from "react";
import { useT, FONT, cat } from "../../shared/theme.jsx";
import { Frame, StateView, ProvenanceFooter, Segmented, Muted, StaleBadge, Chip, SrOnly } from "../../shared/ui.jsx";
import { Donut, Sunburst, Treemap } from "../../shared/charts/shapes.jsx";
import { Ribbon, BarList } from "../../shared/charts/bars.jsx";
import { gbpCompact } from "../../shared/format.js";

const LENSES = [{ value: "class", label: "Class" }, { value: "sector", label: "Sector" }, { value: "region", label: "Region" }, { value: "wrapper", label: "Wrapper" }, { value: "account", label: "Account" }, { value: "currency", label: "Ccy" }];

export function CompositionView({ status, data: d, reason, asOf, source, basis, coverage, stale, targets, targetsReason, domicile, textAlt, lens, setLens, includeCash, setIncludeCash, size = "m", props = {}, page, refetch }) {
  const t = useT();
  const views = props.views ?? ["sunburst", "treemap"];
  const [form, setForm] = useState(views[0] ?? "sunburst");
  const groups = d?.groups ?? [];
  const colourFor = (g, i) => g.label === "Cash" ? t.textFaint : g.label === "Unclassified" || g.label === "Not disclosed" ? null : cat(t, i);
  const legend = (
    <div style={{ display: "grid", gridTemplateColumns: size === "s" ? "1fr" : "1fr 1fr", gap: "3px 12px", marginTop: 8 }}>
      {groups.map((g, i) => (
        <button key={g.label} onClick={() => page?.setSelected?.(page.selected === `grp:${g.label}` ? null : `grp:${g.label}`)} aria-pressed={page?.selected === `grp:${g.label}`}
          style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, background: page?.selected === `grp:${g.label}` ? t.surfaceInset : "transparent", border: "none", padding: "1px 2px", cursor: "pointer", color: t.textSecondary, textAlign: "left" }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: colourFor(g, i) ?? t.surfaceInset, border: colourFor(g, i) ? "none" : `1px dashed ${t.borderStrong}` }} />
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.label}</span>
          <span style={{ fontFamily: FONT.mono, color: t.text }}>{(g.weight * 100).toFixed(1)}%</span>
          <span style={{ fontFamily: FONT.mono, color: t.textFaint, fontSize: 9.5 }}>/ {g.count}</span>
        </button>
      ))}
    </div>
  );
  const byClassTarget = (targets?.byClass ?? []).filter(c => c.targetPct != null);
  const formOptions = [...new Set([...views, "donut", "ribbon", "bars", "domicile", "status"])];
  return (
    <Frame id="composition" index={4} label="Composition" title="Allocation at a glance"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Composition form" value={form} onChange={setForm} options={formOptions.map(v => ({ value: v, label: { sunburst: "Sunburst", treemap: "Treemap", donut: "Donut", ribbon: "Ribbon", bars: "Targets", domicile: "Domicile", status: "Status" }[v] }))} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Weights sum to one at every level (tested). A holding with no label sits in an explicit Unclassified node; for the region lens, the part of a fund that is not disclosed is its own node and never assigned a region." />}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
        <Segmented label="Lens" value={lens} onChange={setLens} options={LENSES} />
        <label style={{ fontSize: 10.5, color: t.textMuted, display: "flex", gap: 4, alignItems: "center" }}><input type="checkbox" checked={includeCash} onChange={e => setIncludeCash(e.target.checked)} /> include cash</label>
      </div>
      <StateView status={status} reason={reason} onRetry={refetch} height={220}>
        {d && (
          <>
            {form === "sunburst" && (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Sunburst tree={d.tree} size={size === "s" ? 200 : 240} centreLabel="Whole book" centreValue={gbpCompact(d.total)} summary={textAlt}
                  onSelect={n => n.symbol ? page?.onOpenHolding?.(n.symbol) : null} />
              </div>
            )}
            {form === "treemap" && (
              <Treemap height={size === "s" ? 200 : 240} summary={textAlt} colourMode="categorical" legendLabel="Group"
                items={d.tree.flatMap((c, ci) => (c.children ?? []).flatMap(g => g.leaf ? [{ key: g.id, label: g.label, sub: g.name, value: g.value, share: g.weight * 100, colourValue: ci, group: c.label }]
                  : (g.children ?? []).map(h => ({ key: h.id, label: h.label, sub: `${g.label} · ${h.name ?? ""}`, value: h.value, share: h.weight * 100, colourValue: ci, group: c.label }))))}
                grouped onSelect={r => r.label && r.label !== "Cash" && page?.onOpenHolding?.(r.label)} />
            )}
            {form === "donut" && (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Donut slices={groups.map((g, i) => ({ key: g.label, label: g.label, value: g.value, colour: colourFor(g, i) ?? t.surfaceInset }))} size={size === "s" ? 170 : 200}
                  centre={gbpCompact(d.total)} sub={d.lensLabel} summary={textAlt} selected={page?.selected?.startsWith("grp:") ? page.selected.slice(4) : null}
                  onSelect={k => page?.setSelected?.(k ? `grp:${k}` : null)} minShare={0.01} />
              </div>
            )}
            {form === "ribbon" && (
              <Ribbon summary={textAlt} segments={groups.map((g, i) => ({ key: g.label, label: g.label, value: g.weight, colour: colourFor(g, i) ?? undefined, hatched: !colourFor(g, i) }))}
                selected={page?.selected?.startsWith("grp:") ? page.selected.slice(4) : null} onSelect={k => page?.setSelected?.(k ? `grp:${k}` : null)} />
            )}
            {form === "bars" && (targets ? (
              <BarList summary="Weight by instrument type against the targets you set" format={v => `${v.toFixed(1)}%`}
                rows={targets.byClass.map((c, i) => ({ key: c.label, label: c.label, value: c.weight, target: c.targetPct, colour: cat(t, i) }))} />
            ) : <Muted>{targetsReason ?? "No targets set."} Bars show weight only until targets exist.</Muted>)}
            {form === "domicile" && (
              <div role="list" aria-label="Each instrument type split by where the holding itself is listed">
                {Object.entries(domicile).map(([cls, parts]) => {
                  const total = Object.values(parts).reduce((a, v) => a + v, 0);
                  return (
                    <div key={cls} role="listitem" style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 10.5, color: t.textSecondary, marginBottom: 2 }}>{cls} <span style={{ color: t.textFaint, fontFamily: FONT.mono }}>{gbpCompact(total)}</span></div>
                      <Ribbon labels={false} height={12} segments={Object.entries(parts).map(([v, x], i) => ({ key: v, label: v, value: x / total, colour: v === "Listing unknown" ? undefined : cat(t, i + 2), hatched: v === "Listing unknown" }))} />
                      <div style={{ fontSize: 9.5, color: t.textFaint, fontFamily: FONT.mono }}>{Object.entries(parts).map(([v, x]) => `${v} ${(x / total * 100).toFixed(0)}%`).join(" · ")}</div>
                    </div>
                  );
                })}
                <Muted size={10}>Where each holding itself is listed (its suffix) — a London-listed world tracker counts as UK here. For what the funds hold, use the Region lens.</Muted>
              </div>
            )}
            {form === "status" && (targets ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {targets.rows.map(r => <Chip key={r.symbol} title={r.targetPct == null ? "No target set" : `${r.weight.toFixed(1)}% vs target ${r.targetPct}%`} onClick={() => page?.onOpenHolding?.(r.symbol)}>
                  {r.symbol} {r.status === "within 2pp" ? "✓" : r.status === "over" ? "▲" : r.status === "under" ? "▼" : "—"}
                </Chip>)}
                <Muted size={10}>✓ within 2pp of target · ▲ over · ▼ under · — no target set</Muted>
                {byClassTarget.length === 0 && null}
              </div>
            ) : <Muted>{targetsReason ?? "No targets set."}</Muted>)}
            {["sunburst", "donut", "treemap"].includes(form) && legend}
            {d.unclassifiedWeight > 0 && <Muted size={10.5} style={{ marginTop: 4 }}>{(d.unclassifiedWeight * 100).toFixed(1)}% has no {d.lensLabel.toLowerCase()} label and is shown as Unclassified.</Muted>}
            <SrOnly>{textAlt}</SrOnly>
          </>
        )}
      </StateView>
    </Frame>
  );
}
