// OV-11 hook: today's pound change per holding (sums to the headline), plus
// linked stories from the returns read for the "movers with reasons" form.
import { useSpec, primary } from "../../shared/layout.jsx";
import { EP } from "../../shared/endpoints.js";
import { blockSpec } from "./common.js";

const base = blockSpec("day", { deps: ["prices", "book"], staleAfterMs: 10 * 60_000 });
export const daySpec = {
  ...base,
  names: ["main", "returns"],
  endpoints: (props, page) => ({ main: EP.ovBlock("day"), returns: EP.returns(page.benchmark) }),
  deps: { main: ["prices", "book"], returns: ["prices", "book", "bars", "news"] },
  select: ({ main, returns }) => {
    const d = main.data;
    const stories = Object.fromEntries((returns.data?.rows ?? []).filter(r => r.story).map(r => [r.symbol, r.story]));
    const z = Object.fromEntries((returns.data?.rows ?? []).filter(r => r.unusual?.z != null).map(r => [r.symbol, r.unusual.z]));
    const rows = (d?.rows ?? []).map(r => ({ ...r, story: stories[r.symbol] ?? null, z: z[r.symbol] ?? null }));
    const up = rows.filter(r => r.gbp > 0), down = rows.filter(r => r.gbp < 0), flat = rows.filter(r => r.gbp === 0);
    return {
      ...primary({ main }), data: d, rows, counts: { up: up.length, down: down.length, flat: flat.length },
      weights: { up: up.reduce((a, r) => a + r.weight, 0), down: down.reduce((a, r) => a + r.weight, 0), flat: flat.reduce((a, r) => a + r.weight, 0) },
      textAlt: d ? `Today's change ${d.net >= 0 ? "+" : ""}${d.net} pounds: ${rows.slice(0, 4).map(r => `${r.symbol} ${r.gbp >= 0 ? "+" : ""}${r.gbp}`).join(", ")}${rows.length > 4 ? " and others" : ""}.` : "",
    };
  },
};
export const useDayContribution = (props, page) => useSpec(daySpec, props, page);
