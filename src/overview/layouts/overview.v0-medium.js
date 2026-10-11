// Overview layout "v0-medium" — the same components arranged as the Opus 5.5
// Medium study does (layout-spec-fable.md, section 5): headline and chart,
// what moved today, leaders and laggards, health beside target drift, largest
// positions, events, headlines with exposure. Only this file differs.
export default {
  page: "overview",
  name: "v0-medium",
  note: "Disposable draft. Arrangement borrowed from Opus 5.5 Medium.",
  maxWidth: 1180,
  rows: [
    { id: "M1", items: [{ component: "HeroTotal", span: 4, size: "m" }, { component: "PerformanceChart", span: 8, props: { periodStrip: true } }] },
    { id: "M2", items: [{ component: "StatTiles", span: 12, props: { tiles: ["value", "invested", "cash", "unrealised", "day", "return"], variant: "strip" } }] },
    { id: "M3", items: [{ component: "DayContribution", span: 6 }, { component: "LeadersLaggards", span: 6 }] },
    { id: "M4", items: [{ component: "HealthAxes", span: 6 }, { component: "TargetDrift", span: 6 }] },
    { id: "M5", items: [{ component: "TopHoldings", span: 12, props: { n: 8 } }] },
    { id: "M6", items: [{ component: "CalendarNext30", span: 6, props: { notesLane: true } }, { component: "NewsTouchingBook", span: 6, props: { compact: true } }] },
    { id: "M7", items: [{ component: "BriefingDigest", span: 6 }, { component: "Composition", span: 6 }] },
    { id: "M8", items: [{ component: "ConcentrationSnapshot", span: 4 }, { component: "CashLiquidity", span: 4 }, { component: "AccountsCards", span: 4 }] },
    { id: "M9", items: [{ component: "WatchlistStrip", span: 6 }, { component: "GoalProgress", span: 6 }] },
  ],
};
