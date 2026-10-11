// OV-12 / OV-24 hooks. The chart and the period strip share the page's period
// and benchmark (PG-07), so clicking "3M" in the strip moves the chart.
import { useState } from "react";
import { useSpec, primary } from "../../shared/layout.jsx";
import { EP } from "../../shared/endpoints.js";

const RANGE_FOR_PERIOD = { "1W": "1M", "1M": "1M", "3M": "3M", "6M": "6M", YTD: "YTD", "1Y": "1Y", "3Y": "3Y", "5Y": "5Y", ITD: "MAX", MAX: "MAX" };

/** Days whose move is unusual for this book's own history (|z| >= 2.5 within the window). */
export function unusualDays(points) {
  const r = [];
  for (let i = 1; i < points.length; i++) r.push({ i, v: points[i].value / points[i - 1].value - 1 });
  if (r.length < 30) return [];
  const m = r.reduce((a, x) => a + x.v, 0) / r.length;
  const sd = Math.sqrt(r.reduce((a, x) => a + (x.v - m) ** 2, 0) / (r.length - 1)) || 1;
  return r.filter(x => Math.abs((x.v - m) / sd) >= 2.5).map(x => ({ i: x.i, z: (x.v - m) / sd, pct: x.v * 100 }));
}

export const performanceChartSpec = {
  names: ["main", "periods", "benchmarks", "bridge", "goal"],
  endpoints: (props, page, basis = "reconstructed") => ({
    main: EP.series(RANGE_FOR_PERIOD[page.period] ?? "1Y", page.benchmark, basis),
    periods: EP.periods(page.benchmark),
    benchmarks: EP.benchmarks,
    bridge: EP.bridge,
    goal: props.goalOverlay === false ? null : EP.goal,
  }),
  deps: { main: ["book", "bars"], periods: ["book", "bars"], benchmarks: ["bars"], bridge: ["flows", "prices", "book"], goal: ["goal", "book", "bars"] },
  staleAfterMs: 5 * 86400_000,
  select: ({ main, periods, benchmarks, bridge, goal }) => {
    const d = main.data;
    const pts = d?.points ?? [];
    const markers = [];
    if (d?.peak && pts.length) {
      const i = pts.findIndex(p => p.date === d.peak.date);
      if (i >= 0) markers.push({ i, label: "record high", kind: "peak" });
    }
    const flows = bridge.status === "ready" ? bridge.data.markers ?? [] : (bridge.data?.markers ?? []);
    for (const f of flows) {
      const i = pts.findIndex(p => p.date >= f.date);
      if (i > 0) markers.push({ i, label: `${f.amount >= 0 ? "+" : "−"}£${Math.abs(f.amount / 1000).toFixed(0)}k ${f.kind === "withdrawal" ? "out" : "in"}`, kind: "flow" });
    }
    const unusual = unusualDays(pts.map(p => ({ value: p.value })));
    return {
      ...primary({ main }),
      data: d,
      fillable: d?.fillable ?? main.data?.fillable ?? null,
      periods: periods.status === "ready" ? periods.data : null,
      periodsState: primary({ main: periods }),
      benchmarks: benchmarks.status === "ready" ? benchmarks.data.benchmarks : [],
      markers, unusual,
      flowsRecorded: bridge.status === "ready",
      goal: goal.status === "ready" ? goal.data : null,
      goalReason: goal.status === "refused" ? goal.reason : null,
    };
  },
};

export function usePerformanceChart(props, page) {
  const [basis, setBasis] = useState("reconstructed");
  const spec = { ...performanceChartSpec, endpoints: (p, pg) => performanceChartSpec.endpoints(p, pg, basis) };
  const out = useSpec(spec, props, page);
  return { ...out, basisMode: basis, setBasisMode: setBasis, rangeFor: RANGE_FOR_PERIOD };
}

export const periodReturnsSpec = {
  endpoints: (props, page) => ({ main: EP.periods(page.benchmark) }),
  deps: { main: ["book", "bars"] },
  staleAfterMs: 5 * 86400_000,
  select: ({ main }) => ({ ...primary({ main }), data: main.data }),
};
export const usePeriodReturns = (props, page) => useSpec(periodReturnsSpec, props, page);
