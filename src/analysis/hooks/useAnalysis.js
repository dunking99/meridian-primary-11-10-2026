// Analysis-page hooks: thin reads of the existing engines through their
// contract adapters. Slider state that changes a request lives here; slider
// state that only re-applies a linear model (the market-move shock) is done
// client-side on the betas the server returns — the same model, no request
// per drag.
import { useEffect, useState } from "react";
import { useSpec, primary } from "../../shared/layout.jsx";
import { useLocalPref } from "../../shared/ui.jsx";
import { EP } from "../../shared/endpoints.js";

const BOOK = ["prices", "book", "bars"];
const one = (path, deps = BOOK, stale = 86400_000) => ({
  endpoints: () => ({ main: typeof path === "function" ? path() : path }),
  deps: { main: deps }, staleAfterMs: stale,
  select: ({ main }) => ({ ...primary({ main }), data: main.data }),
});

/** Debounce a value so dragging a slider does not fire a request per pixel. */
function useDebounced(v, ms = 350) {
  const [d, setD] = useState(v);
  useEffect(() => { const id = setTimeout(() => setD(v), ms); return () => clearTimeout(id); }, [v, ms]);
  return d;
}

// AN-01 / AN-21
export const scenariosSpec = one(EP.scenarios);
export function useScenarioLab(props, page) {
  const [selected, setSelected] = useLocalPref("scenario_selected", null);
  const [shock, setShock] = useState(-10);
  const [fx, setFx] = useState(0);
  return { ...useSpec(scenariosSpec, props, page), selected, setSelected, shock, setShock, fx, setFx };
}
export const useCrisisReplay = (props, page) => {
  const [selected, setSelected] = useLocalPref("crisis_selected", null);
  return { ...useSpec(scenariosSpec, props, page), selected, setSelected };
};

// AN-02 reuses the concentration hook (overview/hooks/useBookFacts.js).

// AN-03
export const correlationSpec = {
  endpoints: (props, page, window = "1y") => ({ main: EP.correlation(window) }),
  deps: { main: ["book", "bars"] }, staleAfterMs: 2 * 86400_000,
  select: ({ main }) => ({ ...primary({ main }), data: main.data }),
};
export function useCorrelation(props, page) {
  const [window, setWindow] = useLocalPref("corr_window", "1y");
  const spec = { ...correlationSpec, endpoints: (p, pg) => correlationSpec.endpoints(p, pg, window) };
  return { ...useSpec(spec, props, page), window, setWindow };
}

// AN-04
export const overlapSpec = one(EP.overlap, ["book", "bars", "prices"]);
export const useOverlap = (props, page) => useSpec(overlapSpec, props, page);

// AN-05 reuses the health hook (overview/hooks/useHealthAxes.js).

// AN-08
export const rebalanceSpec = {
  names: ["main", "targets"],
  endpoints: (props, page, mode = "full", contribution = 0) => ({ main: EP.rebalance(mode, contribution), targets: EP.targets }),
  deps: { main: ["prices", "book"], targets: ["prices", "book"] }, staleAfterMs: 600_000,
  select: ({ main, targets }) => ({ ...primary({ main }), data: main.data, targets: targets.status === "ready" ? targets.data : null }),
};
export function useRebalance(props, page) {
  const [mode, setMode] = useLocalPref("rebal_mode", "full");
  const [contribution, setContribution] = useState(0);
  const c = useDebounced(contribution);
  const spec = { ...rebalanceSpec, endpoints: (p, pg) => rebalanceSpec.endpoints(p, pg, mode, c) };
  return { ...useSpec(spec, props, page), mode, setMode, contribution, setContribution };
}

// AN-09
export const allocationSpec = {
  names: ["main", "enriched"],
  endpoints: (props, page, lens = "sector") => ({ main: EP.composition(lens, true), enriched: EP.enriched }),
  deps: { main: BOOK, enriched: BOOK }, staleAfterMs: 600_000,
  select: ({ main, enriched }) => ({ ...primary({ main }), data: main.data, rows: enriched.data?.rows ?? [] }),
};
export function useAllocation(props, page) {
  const [lens, setLens] = useLocalPref("an_alloc_lens", "sector");
  const spec = { ...allocationSpec, endpoints: (p, pg) => allocationSpec.endpoints(p, pg, lens) };
  return { ...useSpec(spec, props, page), lens, setLens };
}

// AN-12 / AN-15
export const riskSpec = one(EP.riskProfile, ["book", "bars", "prices"]);
export const useRiskFigures = (props, page) => useSpec(riskSpec, props, page);
export const useRiskContribution = (props, page) => useSpec(riskSpec, props, page);

// AN-13
export const monteCarloSpec = {
  names: ["main", "goal"],
  endpoints: (props, page, years = 10, monthly = 0) => ({ main: EP.montecarlo(years, monthly), goal: EP.goal }),
  deps: { main: BOOK, goal: ["goal", "book", "bars"] }, staleAfterMs: 86400_000,
  select: ({ main, goal }) => ({ ...primary({ main }), data: main.data, goal: goal.status === "ready" ? goal.data : null, goalReason: goal.status === "refused" ? goal.reason : null }),
};
export function useMonteCarlo(props, page) {
  const [years, setYears] = useState(10);
  const [monthly, setMonthly] = useState(0);
  const y = useDebounced(years), m = useDebounced(monthly);
  const spec = { ...monteCarloSpec, endpoints: (p, pg) => monteCarloSpec.endpoints(p, pg, y, m) };
  return { ...useSpec(spec, props, page), years, setYears, monthly, setMonthly };
}
