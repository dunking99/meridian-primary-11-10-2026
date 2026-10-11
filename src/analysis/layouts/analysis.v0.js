// Analysis layout v0. No favourite design exists for this page, so this is a
// plain default in the master brief's order.
export default {
  page: "analysis",
  name: "v0",
  maxWidth: 1240,
  rows: [
    { id: "A1", items: [{ component: "ScenarioLab", span: 12 }] },
    { id: "A2", items: [{ component: "ConcentrationFull", span: 5, props: { full: true } }, { component: "Correlation", span: 7 }] },
    { id: "A3", items: [{ component: "FundOverlap", span: 12 }] },
    { id: "A4", items: [{ component: "Scorecard", span: 12, props: { expanded: true } }] },
    { id: "A5", items: [{ component: "Rebalance", span: 7 }, { component: "AllocationBreakdown", span: 5 }] },
    { id: "A6", items: [{ component: "RiskFigures", span: 12 }] },
    { id: "A7", items: [{ component: "MonteCarlo", span: 7 }, { component: "RiskContribution", span: 5 }] },
    { id: "A8", items: [{ component: "CrisisReplay", span: 12 }] },
  ],
};
