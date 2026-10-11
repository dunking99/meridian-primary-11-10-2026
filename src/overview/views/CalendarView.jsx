// OV-03 "next 30 days". Forms: date wall, session timeline strip, list with
// importance dots, ruler +0d..+Nd, next-five-weeks dot timeline sized by money,
// "three events with a direct line to your holdings", a personal-notes lane,
// and earnings / dividends / macro filter chips. Macro is never invented: the
// chip exists so its absence is stated where people look for it.
import React, { useRef, useState } from "react";
import { useT, FONT, soft, cat } from "../../shared/theme.jsx";
import { Frame, StateView, ProvenanceFooter, Segmented, Muted, StaleBadge, Chip, SrOnly, Placeholder } from "../../shared/ui.jsx";
import { gbpCompact, date } from "../../shared/format.js";

const dotFor = (t, e) => e.category === "earnings" ? { c: t.text, g: "●" } : e.category === "dividends" ? { c: t.positive, g: "◆" } : { c: t.warning, g: "■" };

function EventLine({ e, page, compact }) {
  const t = useT();
  const d = dotFor(t, e);
  return (
    <button onClick={() => e.symbol ? page?.onOpenHolding?.(e.symbol) : null} title={`${e.title} · ${e.source}`}
      style={{ display: "grid", gridTemplateColumns: compact ? "14px 1fr auto" : "14px 1fr auto", gap: 6, alignItems: "baseline", width: "100%", background: "transparent", border: "none", padding: "3px 0", textAlign: "left", cursor: e.symbol ? "pointer" : "default", color: "inherit" }}>
      <span aria-hidden style={{ color: d.c, fontSize: 9 }}>{d.g}</span>
      <span style={{ fontSize: 11.5, color: t.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {e.title}{e.symbol && e.stakePct != null && <span style={{ marginLeft: 6, fontFamily: FONT.mono, fontSize: 10, color: t.info }}>{e.symbol} {e.stakePct.toFixed(1)}%</span>}
        {e.relevance === "watched" && <span style={{ marginLeft: 6, fontSize: 9.5, color: t.textFaint }}>watched</span>}
      </span>
      <span style={{ fontFamily: FONT.mono, fontSize: 10, color: t.textFaint }}>{e.amount == null && e.amountReason ? "amount n/a" : ""}</span>
    </button>
  );
}

export function CalendarView({ status, data: d, reason, asOf, source, basis, coverage, stale, events = [], byDay = {}, byWeek = {}, direct = [], textAlt, days, setDays, filter, setFilter, size = "m", props = {}, page, refetch }) {
  const t = useT();
  const [form, setForm] = useState(props.notesLane ? "notes" : "list");
  const [focusDay, setFocusDay] = useState(0);
  const wallRef = useRef(null);
  const today = new Date();
  const iso = k => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + k)).toISOString().slice(0, 10);
  const maxStake = Math.max(1, ...events.map(e => e.stakeGBP ?? 0));
  const chips = [["all", "All"], ["earnings", "Earnings"], ["dividends", "Dividends"], ["macro", "Macro"]];
  const onWallKey = e => {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }[e.key];
    if (step == null) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(days - 1, focusDay + step));
    setFocusDay(next);
    wallRef.current?.querySelector(`[data-day="${next}"]`)?.focus();
  };
  return (
    <Frame id="calendar" index={6} label={`Next ${days} days`} title="Dates worth keeping in view"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Window" value={days} onChange={setDays} options={[7, 30, 60].map(v => ({ value: v, label: `${v}d` }))} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} extra={d?.lastRefresh ? `dates refreshed ${date(d.lastRefresh.at)}` : "never refreshed"} />}>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6, alignItems: "center" }} role="group" aria-label="Filter events">
        {chips.map(([k, l]) => <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>{l}{d?.counts?.[k] != null ? ` ${d.counts[k]}` : ""}</Chip>)}
        <span style={{ flex: 1 }} />
        <Segmented label="Calendar form" value={form} onChange={setForm} options={[{ value: "list", label: "List" }, { value: "wall", label: "Wall" }, { value: "strip", label: "Strip" }, { value: "ruler", label: "Ruler" }, { value: "weeks", label: "Weeks" }, { value: "direct", label: "Top 3" }, { value: "notes", label: "Notes" }]} />
      </div>
      <div role="note" style={{ fontSize: 10.5, color: t.warning, marginBottom: 6 }}>{d?.macroNotice ?? "Macro releases aren't included. There is no free structured source."}</div>
      <StateView status={status} reason={reason} onRetry={refetch} height={200}>
        {d && filter === "macro" && <Muted>No macro events are shown because none are sourced — nothing here is invented.</Muted>}
        {d && filter !== "macro" && events.length === 0 && <Muted>No dated events for held or watched instruments in the next {days} days.</Muted>}
        {d && filter !== "macro" && events.length > 0 && (
          <>
            {form === "list" && (
              <div role="list">
                {Object.entries(byDay).map(([day, es]) => (
                  <div role="listitem" key={day} style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: 8, borderBottom: `1px solid ${t.borderSubtle}`, padding: "5px 0" }}>
                    <div><div style={{ fontFamily: FONT.serif, fontSize: 18, color: t.text, lineHeight: 1 }}>{Number(day.slice(8))}</div><div style={{ fontFamily: FONT.mono, fontSize: 9, color: t.textFaint }}>{date(day, { withYear: false, weekday: true }).split(" ").slice(0, 1)} · {es[0].daysAway}d</div></div>
                    <div>{es.map(e => <EventLine key={e.id} e={e} page={page} />)}</div>
                  </div>
                ))}
              </div>
            )}
            {form === "wall" && (
              <div ref={wallRef} role="grid" aria-label="Date wall" onKeyDown={onWallKey} style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 3 }}>
                {Array.from({ length: days }, (_, k) => {
                  const day = iso(k), es = byDay[day] ?? [];
                  return (
                    <div key={k} role="gridcell" data-day={k} tabIndex={k === focusDay ? 0 : -1} onFocus={() => setFocusDay(k)} aria-label={`${date(day)}: ${es.length ? es.map(e => e.title).join(", ") : "nothing"}`}
                      style={{ minHeight: 44, borderRadius: 4, padding: 3, background: es.length ? soft(t.info, 14) : t.surfaceInset, border: `1px solid ${k === focusDay ? t.focusRing : "transparent"}`, fontSize: 9.5, overflow: "hidden" }}>
                      <div style={{ fontFamily: FONT.mono, color: t.textFaint }}>{day.slice(8)}</div>
                      {es.slice(0, 2).map(e => <div key={e.id} style={{ color: dotFor(t, e).c, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dotFor(t, e).g} {e.symbol ?? "ISA"}</div>)}
                    </div>
                  );
                })}
              </div>
            )}
            {form === "strip" && (
              <div role="list" style={{ display: "flex", overflowX: "auto", gap: 4, paddingBottom: 4 }}>
                {events.map(e => (
                  <div role="listitem" key={e.id} style={{ minWidth: 110, background: t.surfaceInset, borderRadius: 5, padding: 6, borderTop: `3px solid ${dotFor(t, e).c}` }}>
                    <div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: t.textFaint }}>{date(e.date, { withYear: false })} · +{e.daysAway}d</div>
                    <div style={{ fontSize: 11, color: t.text }}>{e.symbol ?? "Account"}</div>
                    <div style={{ fontSize: 10, color: t.textSecondary }}>{e.title.split(" — ")[1] ?? e.title}</div>
                  </div>
                ))}
              </div>
            )}
            {form === "ruler" && (
              <div role="img" aria-label={textAlt} style={{ position: "relative", height: 70, margin: "6px 4px" }}>
                <div style={{ position: "absolute", left: 0, right: 0, top: 34, height: 2, background: t.borderStrong }} />
                {[0, Math.round(days / 4), Math.round(days / 2), Math.round(days * 3 / 4), days].map(k => (
                  <div key={k} style={{ position: "absolute", left: `${k / days * 100}%`, top: 40, fontFamily: FONT.mono, fontSize: 9, color: t.textFaint, transform: "translateX(-50%)" }}>+{k}d</div>
                ))}
                {events.map((e, i) => (
                  <button key={e.id} onClick={() => e.symbol && page?.onOpenHolding?.(e.symbol)} title={`${e.title} · ${e.date}`}
                    style={{ position: "absolute", left: `${e.daysAway / days * 100}%`, top: i % 2 ? 8 : 20, transform: "translateX(-50%)", background: "transparent", border: "none", padding: 0, cursor: "pointer", fontSize: 9.5, fontFamily: FONT.mono, color: dotFor(t, e).c, whiteSpace: "nowrap" }}>
                    {dotFor(t, e).g} {e.symbol ?? "ISA"}
                  </button>
                ))}
              </div>
            )}
            {form === "weeks" && (
              <div role="list" aria-label="Next five weeks, dots sized by the money involved">
                {Array.from({ length: Math.min(5, Math.ceil(days / 7)) }, (_, w) => (
                  <div role="listitem" key={w} style={{ display: "grid", gridTemplateColumns: "70px 1fr", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: `1px solid ${t.borderSubtle}` }}>
                    <span style={{ fontFamily: FONT.mono, fontSize: 10, color: t.textMuted }}>wk of {date(iso(w * 7), { withYear: false })}</span>
                    <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      {(byWeek[w] ?? []).map(e => {
                        const r = 5 + Math.sqrt((e.stakeGBP ?? 0) / maxStake) * 14;
                        return <span key={e.id} title={`${e.title} · ${e.stakeGBP != null ? gbpCompact(e.stakeGBP) : "no stake"}`} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9.5, fontFamily: FONT.mono, color: t.textSecondary }}>
                          <span style={{ width: r, height: r, borderRadius: "50%", background: soft(dotFor(t, e).c, 60), border: `1px solid ${dotFor(t, e).c}` }} />{e.symbol ?? "ISA"}
                        </span>;
                      })}
                      {!(byWeek[w] ?? []).length && <span style={{ fontSize: 10, color: t.textFaint }}>—</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {form === "direct" && (
              <div style={{ display: "grid", gridTemplateColumns: size === "s" ? "1fr" : "repeat(3, minmax(0,1fr))", gap: 8 }}>
                {direct.length ? direct.map(e => (
                  <button key={e.id} onClick={() => page?.onOpenHolding?.(e.symbol)} style={{ textAlign: "left", background: t.surfaceInset, border: `1px solid ${t.border}`, borderRadius: 6, padding: 8, cursor: "pointer", color: "inherit" }}>
                    <div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: t.textFaint }}>{date(e.date)} · in {e.daysAway}d</div>
                    <div style={{ fontSize: 12, color: t.text, margin: "3px 0" }}>{e.title}</div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 10.5, color: t.info }}>{e.stakePct.toFixed(1)}% of the book · {gbpCompact(e.stakeGBP)}</div>
                  </button>
                )) : <Muted>No event in the window touches a held position.</Muted>}
              </div>
            )}
            {form === "notes" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>{events.slice(0, 8).map(e => <EventLine key={e.id} e={e} page={page} compact />)}</div>
                <Placeholder title="Your notes" reason="Notes are stored per instrument, not per date, so there is no dated notes lane yet. Open a holding to add a dated note to it." unblocks="a dated note store" height={100} />
              </div>
            )}
            {d.beyond?.length > 0 && <Muted size={10.5} style={{ marginTop: 6, fontStyle: "italic" }}>Just beyond the window: {d.beyond.map(e => `${e.title} on ${date(e.date, { withYear: false })}`).join(" · ")}.</Muted>}
          </>
        )}
        {d?.noDate?.length > 0 && (
          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
            <Muted size={10}>No date published:</Muted>
            {d.noDate.map(n => <Chip key={n.symbol} title={n.reason} weight={n.stakePct != null ? `${n.stakePct.toFixed(1)}%` : null}>{n.symbol}</Chip>)}
          </div>
        )}
        <SrOnly>{textAlt}</SrOnly>
      </StateView>
    </Frame>
  );
}
