// Overview layout "v0-fable" — structure from the Claude Fable 5.1 Max study
// (docs/overnight/layout-spec-fable.md, section 3). A disposable draft: to
// rearrange the page, edit this data, nothing else.
export default {
  page: "overview",
  name: "v0-fable",
  note: "Disposable draft. Structure from Claude Fable 5.1 Max.",
  maxWidth: 1180,
  rows: [
    { id: "A0", items: [{ component: "BriefingDigest", span: 12 }] },
    { id: "A", items: [{ component: "HeroTotal", span: 5 }, { component: "StatTiles", span: 7, props: { tiles: ["totalReturn", "netGain", "ytd", "income", "cash", "risk"] } }] },
    { id: "B", items: [{ component: "PerformanceChart", span: 8, props: { periodStrip: true } }, { component: "HealthAxes", span: 4 }] },
    { id: "C", items: [{ component: "LeadersLaggards", span: 4 }, { component: "DayContribution", span: 4 }, { component: "Composition", span: 4, props: { views: ["sunburst", "treemap"] } }] },
    { id: "D", items: [{ component: "TopHoldings", span: 7, props: { n: 8 } }, { component: "CalendarNext30", span: 5 }] },
    { id: "E", items: [{ component: "NewsTouchingBook", span: 12 }] },
    { id: "F", items: [{ component: "ConcentrationSnapshot", span: 4 }, { component: "WatchlistStrip", span: 4 }, { component: "AccountsCards", span: 4 }] },
    { id: "G", items: [{ component: "CashLiquidity", span: 6 }, { component: "GoalProgress", span: 6 }] },
  ],
};
