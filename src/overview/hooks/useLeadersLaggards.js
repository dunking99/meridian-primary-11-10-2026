// OV-05 hook: per-holding returns over windows, ranked by return or by
// contribution. The window and rank mode are per-viewer preferences.
import { useSpec, primary } from "../../shared/layout.jsx";
import { useLocalPref } from "../../shared/ui.jsx";
import { EP } from "../../shared/endpoints.js";

export const leadersSpec = {
  endpoints: (props, page) => ({ main: EP.returns(page.benchmark) }),
  deps: { main: ["prices", "book", "bars", "news"] },
  staleAfterMs: 3 * 86400_000,
  select: ({ main }, props, page, prefs = { window: "1M", rank: "return", unit: "pct" }) => {
    const d = main.data;
    if (!d) return { ...primary({ main }), data: null };
    const w = prefs.window;
    const winMeta = d.windows?.[w];
    const measure = r => {
      if (w === "1D" && r.live.dayPct != null) return prefs.rank === "contribution" ? r.live.dayGBP : r.live.dayPct;
      const x = r.windows?.[w];
      return prefs.rank === "contribution" ? (prefs.unit === "gbp" ? x?.gbp : x?.contributionPct) : x?.returnPct;
    };
    const rows = d.rows.filter(r => r.included).map(r => ({ ...r, m: measure(r) })).filter(r => r.m != null);
    const sorted = [...rows].sort((a, b) => b.m - a.m);
    const n = props.n ?? 5;
    const leaders = sorted.filter(r => r.m > 0).slice(0, n);
    const laggards = [...sorted].reverse().filter(r => r.m < 0).slice(0, n);
    const excluded = d.rows.filter(r => !r.included).map(r => ({ symbol: r.symbol, reason: r.reason }));
    return {
      ...primary({ main }), data: d, leaders, laggards, excluded, winMeta,
      textAlt: `Over ${w}, leaders: ${leaders.map(r => `${r.symbol} ${r.m.toFixed(2)}`).join(", ") || "none"}; laggards: ${laggards.map(r => `${r.symbol} ${r.m.toFixed(2)}`).join(", ") || "none"}.`,
    };
  },
};

export function useLeadersLaggards(props, page) {
  const [window, setWindow] = useLocalPref("ll_window", "1M");
  const [rank, setRank] = useLocalPref("ll_rank", "return");
  const [unit, setUnit] = useLocalPref("ll_unit", "pct");
  const spec = { ...leadersSpec, select: (r, p, pg) => leadersSpec.select(r, p, pg, { window, rank, unit }) };
  return { ...useSpec(spec, props, page), prefs: { window, rank, unit }, setWindow, setRank, setUnit };
}
