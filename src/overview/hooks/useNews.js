// OV-08 hook: stories naming held instruments, with the share of the book
// touched and a helps / hurts / neutral / unscored tag. Read state is this
// viewer's own (kept in the browser), as the server tracks reads per briefing
// finding, not per story.
import { useSpec, primary } from "../../shared/layout.jsx";
import { useLocalPref } from "../../shared/ui.jsx";
import { EP } from "../../shared/endpoints.js";

export const newsSpec = {
  endpoints: (props) => ({ main: EP.news(props.hours ?? 72) }),
  deps: { main: ["news", "book"] },
  staleAfterMs: 12 * 3600_000,
  select: ({ main }) => {
    const d = main.data;
    const stories = d?.stories ?? [];
    const pinned = stories.filter(s => Date.now() - (s.published ?? 0) < 24 * 3600_000).slice(0, 3);
    const byHolding = {};
    for (const s of stories) for (const h of s.holdings) (byHolding[h.symbol] ??= []).push(s);
    return {
      ...primary({ main }), data: d, stories, pinned, byHolding,
      textAlt: d ? `${stories.length} stories touch ${d.touchedPct}% of the book: ${stories.slice(0, 3).map(s => `${s.title} (${s.touchedPct}%)`).join("; ")}.` : "",
    };
  },
};

export function useNewsTouchingBook(props, page) {
  const [read, setRead] = useLocalPref("news_read", []);
  const out = useSpec(newsSpec, props, page);
  return { ...out, read, markRead: guid => setRead(r => [...new Set([...r, guid])].slice(-300)) };
}
