// OV-13 signals / briefing digest. Forms: ranked insight cards with a
// materiality dot, the session verdict pulse, new-since-read badges, and an
// exposure-ranked list. "Nothing notable" is a first-class state; no
// confidence rating appears anywhere.
import React, { useState } from "react";
import { useT, FONT, soft } from "../../shared/theme.jsx";
import { Frame, StateView, ProvenanceFooter, Segmented, Muted, StaleBadge, SrOnly } from "../../shared/ui.jsx";
import { age } from "../../shared/format.js";

const TONE = t => ({ quiet: [t.textMuted, "Quiet"], mild: [t.info, "Minor"], isolated: [t.warning, "Notable"], broad: [t.warning, "Busy"], action: [t.negative, "Action"] });

export function BriefingDigestView({ status, data: d, reason, asOf, source, basis, coverage, stale, textAlt, markRead, snooze, size = "m", page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("cards");
  const [c, label] = TONE(t)[d?.verdict?.tone] ?? [t.textMuted, "—"];
  const items = d?.items ?? [];
  return (
    <Frame id="briefing-digest" label="Briefing" title="What needs your attention"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Briefing form" value={form} onChange={setForm} options={[{ value: "cards", label: "Cards" }, { value: "pulse", label: "Pulse" }, { value: "ranked", label: "By exposure" }]} />
        <button onClick={() => page?.onNavigate?.("briefing")} style={{ background: "transparent", border: "none", color: t.info, cursor: "pointer", fontSize: 11 }}>Full briefing →</button></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Findings from eight engines scored as 100 × strength × stake × kind weight; 'new' means not in the last briefing you marked as read." />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={100}>
        {d && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span role="status" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.2, color: c }}>
                <span aria-hidden style={{ width: 9, height: 9, borderRadius: "50%", background: c, boxShadow: d.verdict?.tone === "quiet" ? "none" : `0 0 0 3px ${soft(c, 25)}` }} />{label.toUpperCase()}
              </span>
              <span style={{ fontFamily: FONT.serif, fontSize: size === "s" ? 14 : 17, color: t.text, flex: 1, minWidth: 200 }}>{d.verdict?.text}</span>
              {d.counts?.new > 0 && <span style={{ fontFamily: FONT.mono, fontSize: 10, padding: "2px 7px", borderRadius: 10, background: t.infoSoft, color: t.info }}>{d.counts.new} new</span>}
              <button onClick={markRead} disabled={!d.counts?.new} title="Mark every finding shown here as read"
                style={{ background: "transparent", border: `1px solid ${t.border}`, color: d.counts?.new ? t.textSecondary : t.textFaint, borderRadius: 3, fontSize: 10.5, padding: "3px 8px", cursor: d.counts?.new ? "pointer" : "default" }}>Mark read</button>
            </div>
            {items.length === 0 && <Muted style={{ marginTop: 6 }}>Nothing notable — a normal answer on most days.</Muted>}
            {form === "cards" && items.length > 0 && (
              <div role="list" style={{ display: "grid", gridTemplateColumns: `repeat(${size === "l" ? Math.min(3, items.length) : size === "m" ? 2 : 1}, minmax(0,1fr))`, gap: 8, marginTop: 8 }}>
                {items.map(i => (
                  <div role="listitem" key={i.fp} style={{ background: t.surfaceInset, borderRadius: 6, padding: 8, borderLeft: `3px solid ${i.direction === "down" ? t.negative : i.direction === "up" ? t.positive : t.border}` }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", fontFamily: FONT.mono, fontSize: 9.5, color: t.textFaint }}>
                      <span title={`Materiality ${i.materiality}`} aria-label={`materiality ${i.materiality}`} style={{ width: 7 + i.materiality / 12, height: 7 + i.materiality / 12, borderRadius: "50%", background: soft(t.warning, 30 + i.materiality * 0.7) }} />
                      {i.kind.replace("_", " ")}{i.isNew && <span style={{ color: t.info }}> · NEW</span>}{i.weight != null ? ` · ${Number(i.weight).toFixed(1)}% of book` : ""}
                    </div>
                    <button onClick={() => i.symbol && page?.onOpenHolding?.(i.symbol)} style={{ display: "block", textAlign: "left", background: "transparent", border: "none", padding: 0, marginTop: 3, fontSize: 12, color: t.text, cursor: i.symbol ? "pointer" : "default" }}>{i.title}</button>
                    <div style={{ fontSize: 10.5, color: t.textMuted, marginTop: 2 }}>{i.detail}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      {i.url && <a href={i.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: t.info }}>source ↗</a>}
                      {i.alertId && <button onClick={() => snooze(i.alertId)} style={{ background: "transparent", border: "none", color: t.textFaint, fontSize: 10, cursor: "pointer", padding: 0 }}>snooze 7d</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {form === "pulse" && (
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(d.sections ?? []).map(s => (
                  <span key={s.key} title={s.reason ?? s.coverage ?? ""} style={{ fontFamily: FONT.mono, fontSize: 10, padding: "3px 8px", borderRadius: 10, border: `1px solid ${t.border}`, color: s.count ? t.text : t.textFaint, background: s.newCount ? t.infoSoft : "transparent" }}>
                    {s.title}: {s.available ? s.count : "n/a"}{s.newCount ? ` (${s.newCount} new)` : ""}
                  </span>
                ))}
              </div>
            )}
            {form === "ranked" && items.length > 0 && (
              <div role="list" style={{ marginTop: 6 }}>
                {[...items].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)).map(i => (
                  <div role="listitem" key={i.fp} style={{ display: "grid", gridTemplateColumns: "60px 1fr 60px", gap: 8, fontSize: 11.5, padding: "3px 0", borderBottom: `1px solid ${t.borderSubtle}` }}>
                    <span style={{ fontFamily: FONT.mono, color: t.textMuted }}>{i.weight != null ? `${Number(i.weight).toFixed(1)}%` : "—"}</span>
                    <span style={{ color: t.text }}>{i.title}{i.isNew ? <span style={{ color: t.info, fontSize: 9.5 }}> NEW</span> : ""}</span>
                    <span style={{ fontFamily: FONT.mono, textAlign: "right", color: t.textFaint }}>{i.materiality.toFixed(0)}</span>
                  </div>
                ))}
                <Muted size={10}>Sorted by share of the book each finding touches; the right column is materiality (not a confidence).</Muted>
              </div>
            )}
            {d.lastRead && <Muted size={10} style={{ marginTop: 6 }}>Last marked read {age(d.lastRead.readAt)}.</Muted>}
            <SrOnly>{textAlt}</SrOnly>
          </>
        )}
      </StateView>
    </Frame>
  );
}
