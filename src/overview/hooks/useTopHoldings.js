// OV-04 hook: the largest positions (cash excluded) with risk share.
import { useSpec } from "../../shared/layout.jsx";
import { blockSpec } from "./common.js";

export const topSpec = blockSpec("top", {
  deps: ["prices", "book", "bars"], staleAfterMs: 10 * 60_000,
  select: ({ main }) => ({ textAlt: main.data ? `Top ${main.data.rows.length} of ${main.data.total}: ${main.data.rows.map(r => `${r.symbol} ${r.weight.toFixed(1)}%`).join(", ")}; together ${main.data.topWeight}% of the book.` : "" }),
});
export const useTopHoldings = (props, page) => useSpec(topSpec, props, page);
