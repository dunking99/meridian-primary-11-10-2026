// Performance layout v0, in the master brief's order: key numbers, chart,
// periods, calendar-year, monthly, drawdowns, attribution, risk-adjusted,
// timing gap, capture.
export default {
  page: "performance",
  name: "v0",
  maxWidth: 1240,
  rows: [
    { id: "P1", items: [{ component: "KeyNumbers", span: 12 }] },
    { id: "P2", items: [{ component: "ReturnChart", span: 12 }] },
    { id: "P3", items: [{ component: "PeriodsTable", span: 7 }, { component: "CalendarYears", span: 5 }] },
    { id: "P4", items: [{ component: "MonthlyReturns", span: 12 }] },
    { id: "P5", items: [{ component: "Drawdowns", span: 6 }, { component: "Attribution", span: 6 }] },
    { id: "P6", items: [{ component: "RiskAdjusted", span: 12 }] },
    { id: "P7", items: [{ component: "TimingGap", span: 7 }, { component: "Capture", span: 5 }] },
  ],
};
