// OV-08 headlines touching the book. Forms: relevant list with exposure %,
// helps/hurts tag, editorial dispatch, pinned-today strip, per-holding chips,
// compact night-feed. Headline and link only — no article text reproduced.
import React, { useState } from "react";
import { useT, FONT, soft, signColour } from "../../shared/theme.jsx";
import { Frame, StateView, ProvenanceFooter, Segmented, Muted, StaleBadge, Chip, SrOnly } from "../../shared/ui.jsx";
import { age } from "../../shared/format.js";

function Tag({ dir }) {
  const t = useT();
  const map = { helps: [t.positive, "helps"], hurts: [t.negative, "hurts"], neutral: [t.textMuted, "neutral"], unscored: [t.textFaint, "unscored"] };
  const [c, l] = map[dir] ?? map.neutral;
  return <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, padding: "1px 5px", borderRadius: 3, border: `1px solid ${soft(c, 60)}`, color: c }}>{l.toUpperCase()}</span>;
}

function Story({ s, read, markRead, page, lead = false, compact = false }) {
  const t = useT();
  const isRead = read.includes(s.guid);
  return (
    <div role="listitem" style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 80px", gap: 10, padding: "8px 0", borderBottom: `1px solid ${t.borderSubtle}`, opacity: isRead ? 0.6 : 1 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: t.textFaint, display: "flex", gap: 6, alignItems: "center" }}>
          <span aria-hidden style={{ color: s.direction === "helps" ? t.positive : s.direction === "hurts" ? t.negative : t.textFaint }}>●</span>
          {s.source} · {age(s.published)} <Tag dir={s.direction} />{s.alsoReported ? ` · +${s.alsoReported} similar` : ""}
        </div>
        <a href={s.url} target="_blank" rel="noopener noreferrer" onClick={() => markRead(s.guid)}
          style={{ display: "block", fontFamily: FONT.serif, fontSize: lead ? 19 : compact ? 12.5 : 14, color: t.text, textDecoration: "none", margin: "3px 0", lineHeight: 1.3 }}>{s.title}</a>
        {!compact && s.why && <div style={{ fontSize: 10.5, color: t.textMuted }}>{s.why}</div>}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 }}>
          {s.holdings.map(h => <Chip key={h.symbol} onClick={() => page?.onOpenHolding?.(h.symbol)} weight={`${h.weight?.toFixed(1)}%`}>{h.symbol}</Chip>)}
          {!isRead && <button onClick={() => markRead(s.guid)} style={{ background: "transparent", border: "none", color: t.textFaint, fontSize: 10, cursor: "pointer" }}>mark read</button>}
        </div>
      </div>
      {!compact && (
        <div aria-label={`${s.touchedPct}% of the book touched`}>
          <div style={{ fontFamily: FONT.serif, fontSize: 18, color: t.text }}>{s.touchedPct.toFixed(1)}%</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 8.5, color: t.textFaint, letterSpacing: 1 }}>OF BOOK TOUCHED</div>
          <div style={{ height: 3, background: t.surfaceInset, marginTop: 3 }}><div style={{ height: 3, width: `${Math.min(100, s.touchedPct * 3)}%`, background: t.text }} /></div>
        </div>
      )}
    </div>
  );
}

export function NewsView({ status, data: d, reason, asOf, source, basis, coverage, stale, stories = [], pinned = [], byHolding = {}, read = [], markRead, textAlt, size = "m", props = {}, page, refetch }) {
  const t = useT();
  const [form, setForm] = useState(props.compact ? "night" : "list");
  const cols = size === "l" && form === "list" ? 2 : 1;
  return (
    <Frame id="news" index={7} label="Headlines touching your book" title="Relevant developments"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="News form" value={form} onChange={setForm} options={[{ value: "list", label: "List" }, { value: "dispatch", label: "Dispatch" }, { value: "pinned", label: "Today" }, { value: "chips", label: "By holding" }, { value: "night", label: "Compact" }]} />
        <button onClick={() => page?.onNavigate?.("news")} style={{ background: "transparent", border: "none", color: t.info, cursor: "pointer", fontSize: 11 }}>All news →</button></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} extra={d ? `last ${d.hours}h · ${d.aiScoring ? "AI-scored" : "lexicon sentiment (filter aid)"}` : null} />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={140}>
        {d && (
          <>
            {!d.aiScoring && <div role="note" style={{ fontSize: 10.5, color: t.warning, marginBottom: 6 }}>No AI key set: helps/hurts comes from a word-list sentiment — a filter aid, not a judgement.</div>}
            {stories.length === 0 && <Muted>{d.note ?? "No stored story names a holding in this window."}</Muted>}
            {stories.length > 0 && (
              <div style={{ display: "flex", gap: 12, fontSize: 10.5, fontFamily: FONT.mono, color: t.textMuted, marginBottom: 6, flexWrap: "wrap" }}>
                <span>{d.touchedPct.toFixed(1)}% of the book touched</span>
                <span style={{ color: t.positive }}>+ {d.exposure.positive.toFixed(1)}%</span>
                <span style={{ color: t.negative }}>− {d.exposure.negative.toFixed(1)}%</span>
                <span>neutral {d.exposure.neutral.toFixed(1)}%</span>
                <span style={{ color: t.textFaint }}>no coverage {d.exposure.noCoverage.toFixed(1)}%</span>
              </div>
            )}
            {form === "list" && <div role="list" style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, columnGap: 20 }}>{stories.map(s => <Story key={s.guid} s={s} read={read} markRead={markRead} page={page} />)}</div>}
            {form === "dispatch" && stories.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: size === "s" ? "1fr" : "1.4fr 1fr", gap: 16 }}>
                <div role="list"><Story s={stories[0]} read={read} markRead={markRead} page={page} lead /></div>
                <div role="list">{stories.slice(1, 6).map(s => <Story key={s.guid} s={s} read={read} markRead={markRead} page={page} compact />)}</div>
              </div>
            )}
            {form === "pinned" && (pinned.length ? (
              <div role="list" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                {pinned.map(s => (
                  <a key={s.guid} role="listitem" href={s.url} target="_blank" rel="noopener noreferrer" onClick={() => markRead(s.guid)}
                    style={{ minWidth: 220, background: t.surfaceInset, borderRadius: 6, padding: 8, textDecoration: "none", borderLeft: `3px solid ${s.direction === "helps" ? t.positive : s.direction === "hurts" ? t.negative : t.border}` }}>
                    <div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: t.textFaint }}>📌 {age(s.published)} · {s.touchedPct.toFixed(1)}%</div>
                    <div style={{ fontSize: 12, color: t.text }}>{s.title}</div>
                  </a>
                ))}
              </div>
            ) : <Muted>Nothing touching the book in the last 24 hours.</Muted>)}
            {form === "chips" && (
              <div role="list">
                {Object.entries(byHolding).map(([sym, ss]) => (
                  <div role="listitem" key={sym} style={{ padding: "5px 0", borderBottom: `1px solid ${t.borderSubtle}` }}>
                    <Chip onClick={() => page?.onOpenHolding?.(sym)}>{sym}</Chip>
                    {ss.map(s => <a key={s.guid} href={s.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: 11.5, color: t.text, textDecoration: "none", margin: "3px 0 0 4px" }}><Tag dir={s.direction} /> {s.title}</a>)}
                  </div>
                ))}
              </div>
            )}
            {form === "night" && (
              <div role="list">
                {stories.map(s => (
                  <a key={s.guid} role="listitem" href={s.url} target="_blank" rel="noopener noreferrer" onClick={() => markRead(s.guid)}
                    style={{ display: "grid", gridTemplateColumns: "44px 1fr 50px", gap: 6, fontSize: 11, padding: "3px 0", textDecoration: "none", color: read.includes(s.guid) ? t.textFaint : t.textSecondary }}>
                    <span style={{ fontFamily: FONT.mono, color: t.textFaint }}>{age(s.published)}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                    <span style={{ fontFamily: FONT.mono, textAlign: "right", color: signColour(t, s.direction === "helps" ? 1 : s.direction === "hurts" ? -1 : 0) }}>{s.touchedPct.toFixed(1)}%</span>
                  </a>
                ))}
              </div>
            )}
            <SrOnly>{textAlt}</SrOnly>
          </>
        )}
      </StateView>
    </Frame>
  );
}
