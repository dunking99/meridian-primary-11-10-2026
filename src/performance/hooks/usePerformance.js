// Performance-page hooks. Every series carries its basis (reconstructed vs
// recorded); the page's period and benchmark are shared (PG-07).
import { useState } from "react";
import { useSpec, primary } from "../../shared/layout.jsx";
import { useLocalPref } from "../../shared/ui.jsx";
import { EP } from "../../shared/endpoints.js";

const BARS = ["book", "bars"];
const RANGE_FOR_PERIOD = { "1W": "1M", "1M": "1M", "3M": "3M", "6M": "6M", YTD: "YTD", "1Y": "1Y", "3Y": "3Y", "5Y": "5Y", ITD: "MAX", MAX: "MAX" };
const OTHERS = ["SWDA.L", "VUSA.L", "^GSPC", "^FTSE"];

/** A period value like "M:2026-08" is a custom one-month window from the heatmap. */
function seriesPath(page, benchmark, basis = "reconstructed") {
  if (String(page.period).startsWith("M:")) {
    const m = page.period.slice(2);
    const [y, mo] = m.split("-").map(Number);
    const prevEnd = new Date(Date.UTC(y, mo - 1, 0)).toISOString().slice(0, 10);
    const end = new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
    return EP.seriesCustom(prevEnd, end, benchmark);
  }
  return EP.series(RANGE_FOR_PERIOD[page.period] ?? "1Y", benchmark, basis);
}

// ─── PF-01 return chart ───────────────────────────────────────
export const returnChartSpec = {
  names: ["main", "b2", "b3", "benchmarks", "bridge", "risk", "goal"],
  endpoints: (props, page, extra = [], basis = "reconstructed") => ({
    main: seriesPath(page, page.benchmark, basis),
    b2: extra[0] ? seriesPath(page, extra[0]) : null,
    b3: extra[1] ? seriesPath(page, extra[1]) : null,
    benchmarks: EP.benchmarks,
    bridge: EP.bridge,
    risk: EP.risk("MAX", page.benchmark),
    goal: EP.goal,
  }),
  deps: { main: BARS, b2: BARS, b3: BARS, benchmarks: ["bars"], bridge: ["flows", "prices", "book"], risk: BARS, goal: ["goal", "book", "bars"] },
  staleAfterMs: 5 * 86400_000,
  select: ({ main, b2, b3, benchmarks, bridge, risk, goal }) => ({
    ...primary({ main }), data: main.data,
    extraSeries: [b2, b3].filter(x => x?.status === "ready").map(x => x.data),
    benchmarks: benchmarks.status === "ready" ? benchmarks.data.benchmarks : [],
    flows: bridge.status === "ready" ? bridge.data.markers : [],
    flowsReason: bridge.status === "refused" ? bridge.reason : null,
    rolling: risk.status === "ready" ? risk.data.rolling : [],
    goal: goal.status === "ready" ? goal.data : null,
  }),
};
export function useReturnChart(props, page) {
  const [extra, setExtra] = useLocalPref("pf_extra_benchmarks", []);
  const [basis, setBasis] = useState("reconstructed");
  const spec = { ...returnChartSpec, endpoints: (p, pg) => returnChartSpec.endpoints(p, pg, extra, basis) };
  return { ...useSpec(spec, props, page), extra, setExtra, basisMode: basis, setBasisMode: setBasis, rangeFor: RANGE_FOR_PERIOD };
}

// ─── PF-02 drawdowns ──────────────────────────────────────────
export const drawdownsSpec = {
  endpoints: (props, page) => ({ main: EP.drawdowns(page.benchmark) }),
  deps: { main: BARS }, staleAfterMs: 5 * 86400_000,
  select: ({ main }) => ({ ...primary({ main }), data: main.data }),
};
export const useDrawdowns = (props, page) => useSpec(drawdownsSpec, props, page);

// ─── PF-03 attribution ────────────────────────────────────────
export const attributionSpec = {
  names: ["main", "overTime", "bridge"],
  endpoints: (props, page, grouping = "sector", lookback = 252) => ({ main: EP.attribution(grouping, lookback), overTime: EP.contribution(12), bridge: EP.bridge }),
  deps: { main: BARS, overTime: BARS, bridge: ["flows", "prices", "book"] },
  adapt: { main: body => body?.available === false ? { available: false, reason: body.reason } : { available: true, asOf: Date.parse(body?.generatedAt ?? "") || Date.now(), source: "attribution.js (Cariño-linked decomposition)", basis: body?.basis, note: body?.caveat, data: body } },
  staleAfterMs: 5 * 86400_000,
  select: ({ main, overTime, bridge }) => ({
    ...primary({ main }), data: main.data,
    overTime: overTime.status === "ready" ? overTime.data : null, overTimeReason: overTime.reason,
    timing: bridge.data?.timing ?? null, timingState: bridge.status, timingReason: bridge.status === "refused" ? bridge.reason : null,
    mwr: bridge.data?.moneyWeighted ?? null, twr: bridge.data?.timeWeighted ?? null,
  }),
};
export function useAttribution(props, page) {
  const [grouping, setGrouping] = useLocalPref("attr_grouping", "sector");
  const [lookback, setLookback] = useLocalPref("attr_lookback", 252);
  const spec = { ...attributionSpec, endpoints: (p, pg) => attributionSpec.endpoints(p, pg, grouping, lookback) };
  return { ...useSpec(spec, props, page), grouping, setGrouping, lookback, setLookback };
}

// ─── PF-04 monthly, PF-09 calendar-year ───────────────────────
export const calendarReturnsSpec = {
  endpoints: (props, page) => ({ main: EP.calendarReturns(page.benchmark) }),
  deps: { main: BARS }, staleAfterMs: 5 * 86400_000,
  select: ({ main }) => ({ ...primary({ main }), data: main.data }),
};
export function useMonthly(props, page) {
  const [mode, setMode] = useLocalPref("monthly_mode", "portfolio");
  return { ...useSpec(calendarReturnsSpec, props, page), mode, setMode };
}
export const useCalendarYears = (props, page) => useSpec(calendarReturnsSpec, props, page);

// ─── PF-05 returns by period (several benchmarks) ─────────────
export const periodsSpec = {
  names: ["main", "o1", "o2", "o3"],
  endpoints: (props, page) => {
    const others = OTHERS.filter(b => b !== page.benchmark).slice(0, 3);
    return { main: EP.periods(page.benchmark), o1: EP.periods(others[0]), o2: EP.periods(others[1]), o3: EP.periods(others[2]) };
  },
  deps: { main: BARS, o1: BARS, o2: BARS, o3: BARS }, staleAfterMs: 5 * 86400_000,
  select: ({ main, o1, o2, o3 }) => ({ ...primary({ main }), data: main.data, others: [o1, o2, o3].filter(x => x.status === "ready").map(x => x.data) }),
};
export const usePeriodsTable = (props, page) => useSpec(periodsSpec, props, page);

// ─── PF-06 risk-adjusted ──────────────────────────────────────
export const riskAdjSpec = {
  endpoints: (props, page, window = "1Y") => ({ main: EP.risk(window, page.benchmark) }),
  deps: { main: BARS }, staleAfterMs: 5 * 86400_000,
  select: ({ main }) => ({ ...primary({ main }), data: main.data }),
};
export function useRiskAdjusted(props, page) {
  const [window, setWindow] = useLocalPref("riskadj_window", "1Y");
  const spec = { ...riskAdjSpec, endpoints: (p, pg) => riskAdjSpec.endpoints(p, pg, window) };
  return { ...useSpec(spec, props, page), window, setWindow };
}

// ─── PF-08 key numbers ────────────────────────────────────────
export const keyNumbersSpec = {
  names: ["main", "risk", "periods", "calendar", "drawdowns"],
  endpoints: (props, page) => ({ main: EP.bridge, risk: EP.risk("1Y", page.benchmark), periods: EP.periods(page.benchmark), calendar: EP.calendarReturns(page.benchmark), drawdowns: EP.drawdowns(page.benchmark) }),
  deps: { main: ["flows", "prices", "book"], risk: BARS, periods: BARS, calendar: BARS, drawdowns: BARS },
  staleAfterMs: 5 * 86400_000,
  select: ({ main, risk, periods, calendar, drawdowns }) => {
    const months = (calendar.data?.months ?? []).filter(m => !m.partial);
    const best = months.reduce((a, m) => (!a || m.pct > a.pct ? m : a), null);
    const worst = months.reduce((a, m) => (!a || m.pct < a.pct ? m : a), null);
    return {
      // The bridge route answers with MWR/TWR even when the ledger is empty
      // (as a refusal whose data carries them), so its status is not the panel's.
      status: [risk, periods].some(x => x.status === "loading") ? "loading" : periods.status === "error" ? "error" : periods.status,
      reason: periods.reason, asOf: periods.asOf, source: "performance.js (ledger + snapshots) and the reconstructed series", basis: periods.basis, coverage: periods.coverage, stale: periods.stale, refetch: periods.refetch,
      mwr: main.data?.moneyWeighted ?? null, twr: main.data?.timeWeighted ?? null, timing: main.data?.timing ?? null,
      risk: risk.status === "ready" ? risk.data : null, riskReason: risk.reason,
      itd: periods.data?.rows?.find(r => r.period === "ITD") ?? null, benchmark: periods.data?.benchmark ?? null,
      best, worst, dd: drawdowns.data?.stats ?? null,
    };
  },
};
export const useKeyNumbers = (props, page) => useSpec(keyNumbersSpec, props, page);

// ─── PF-11 timing gap / bridge ────────────────────────────────
export const bridgeSpec = {
  names: ["main", "series"],
  endpoints: (props, page) => ({ main: EP.bridge, series: EP.series("MAX", page.benchmark) }),
  deps: { main: ["flows", "prices", "book"], series: BARS }, staleAfterMs: 86400_000,
  select: ({ main, series }) => ({ ...primary({ main }), data: main.data, series: series.status === "ready" ? series.data : null }),
};
export const useBridge = (props, page) => useSpec(bridgeSpec, props, page);

// ─── PF-14 capture ────────────────────────────────────────────
export const captureSpec = {
  endpoints: (props, page, window = "max") => ({ main: EP.capture(page.benchmark, window) }),
  deps: { main: BARS }, staleAfterMs: 5 * 86400_000,
  select: ({ main }) => ({ ...primary({ main }), data: main.data }),
};
export function useCapture(props, page) {
  const [window, setWindow] = useLocalPref("capture_window", "max");
  const spec = { ...captureSpec, endpoints: (p, pg) => captureSpec.endpoints(p, pg, window) };
  return { ...useSpec(spec, props, page), window, setWindow };
}
