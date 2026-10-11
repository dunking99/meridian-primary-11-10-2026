// OV-02 hook: the composition tree for a lens (lens and cash toggle are local
// view state the fetch depends on), targets for the target-tick forms, and the
// enriched rows for the listing-venue (domicile) split.
import { useState } from "react";
import { useSpec, primary } from "../../shared/layout.jsx";
import { EP } from "../../shared/endpoints.js";

export const compositionSpec = {
  names: ["main", "targets", "enriched"],
  endpoints: (props, page, lens = "class", includeCash = true) => ({ main: EP.composition(lens, includeCash), targets: EP.targets, enriched: EP.enriched }),
  deps: { main: ["prices", "book", "bars"], targets: ["prices", "book"], enriched: ["prices", "book"] },
  staleAfterMs: 10 * 60_000,
  select: ({ main, targets, enriched }) => {
    const d = main.data;
    // Domicile split: each class divided by where the holding itself is listed.
    const dom = {};
    for (const r of enriched.data?.rows ?? []) {
      if (!r.value) continue;
      const c = r.type ?? "Unclassified", v = r.region ?? "Listing unknown";
      (dom[c] ??= {})[v] = (dom[c][v] ?? 0) + r.value;
    }
    return {
      ...primary({ main }), data: d,
      targets: targets.status === "ready" ? targets.data : null,
      targetsReason: targets.status === "refused" ? targets.reason : null,
      domicile: dom,
      textAlt: d ? `${d.lensLabel}: ${d.groups.map(g => `${g.label} ${(g.weight * 100).toFixed(1)}%`).join(", ")}.` : "",
    };
  },
};

export function useComposition(props, page) {
  const [lens, setLens] = useState(props.lens ?? "class");
  const [includeCash, setIncludeCash] = useState(true);
  const spec = { ...compositionSpec, endpoints: (p, pg) => compositionSpec.endpoints(p, pg, lens, includeCash) };
  return { ...useSpec(spec, props, page), lens, setLens, includeCash, setIncludeCash };
}
