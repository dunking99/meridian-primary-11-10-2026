// OV-06 hook: the five scorecard axes (the engine's overall figure is removed
// server-side), plus the key risk figures for the dual instrument cluster.
import { useSpec, primary } from "../../shared/layout.jsx";
import { EP } from "../../shared/endpoints.js";

export const healthSpec = {
  names: ["main", "risk"],
  endpoints: () => ({ main: EP.scorecard, risk: EP.risk("1Y") }),
  deps: { main: ["book", "bars"], risk: ["book", "bars"] },
  staleAfterMs: 2 * 86400_000,
  select: ({ main, risk }) => {
    const d = main.data;
    const axes = (d?.axes ?? []).map(a => ({
      key: a.key, label: a.label, description: a.description,
      score: a.scoreOutOf100, coverage: a.coverage, note: a.note, mandateWeight: a.mandateWeight,
      lifting: a.lifting ?? [], holdingBack: a.holdingBack ?? [], missing: a.missing ?? [],
      pullSum: [...(a.lifting ?? []), ...(a.holdingBack ?? [])].reduce((s, c) => s + c.pull, 0),
    }));
    return {
      ...primary({ main }), data: d, axes,
      mandate: d?.mandate ?? null, regime: d?.regime ?? null,
      risk: risk.status === "ready" ? risk.data : null, riskReason: risk.status === "refused" ? risk.reason : null,
      textAlt: axes.map(a => `${a.label} ${a.score == null ? "not measured" : `${a.score} of 100, covering ${a.coverage}% of invested value`}`).join("; "),
    };
  },
};
export const useHealthAxes = (props, page) => useSpec(healthSpec, props, page);
