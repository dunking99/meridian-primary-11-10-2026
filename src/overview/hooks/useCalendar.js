// OV-03 hook: dated events for held and watched instruments with stake, a
// 7/30/60-day window, and category filters.
import { useState } from "react";
import { useSpec, primary } from "../../shared/layout.jsx";
import { EP } from "../../shared/endpoints.js";

export const calendarSpec = {
  endpoints: (props, page, days = 30) => ({ main: EP.calendar(days) }),
  deps: { main: ["calendar", "book", "watch"] },
  staleAfterMs: 2 * 86400_000,
  select: ({ main }, props, page, filter = "all") => {
    const d = main.data;
    const events = (d?.events ?? []).filter(e => filter === "all" || e.category === filter);
    const byDay = {};
    for (const e of events) (byDay[e.date] ??= []).push(e);
    const byWeek = {};
    for (const e of events) { const w = Math.floor(e.daysAway / 7); (byWeek[w] ??= []).push(e); }
    const direct = [...events].filter(e => e.stakePct != null).sort((a, b) => b.stakePct - a.stakePct).slice(0, 3);
    return {
      ...primary({ main }), data: d, events, byDay, byWeek, direct,
      textAlt: d ? `${events.length} dated events in the next ${d.days} days${filter !== "all" ? ` (${filter})` : ""}: ${events.slice(0, 5).map(e => `${e.title} on ${e.date}`).join("; ")}. ${d.noDate.length} symbols have no date published or not looked up. Macro releases are not covered.` : "",
    };
  },
};

export function useCalendarNext30(props, page) {
  const [days, setDays] = useState(props.days ?? 30);
  const [filter, setFilter] = useState("all");
  const spec = { ...calendarSpec, endpoints: (p, pg) => calendarSpec.endpoints(p, pg, days), select: (r, p, pg) => calendarSpec.select(r, p, pg, filter) };
  return { ...useSpec(spec, props, page), days, setDays, filter, setFilter };
}
