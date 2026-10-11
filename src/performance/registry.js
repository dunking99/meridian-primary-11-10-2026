import * as P from "./hooks/usePerformance.js";
import * as V from "./views/PerformanceViews.jsx";
export const performanceRegistry = {
  KeyNumbers: { checklist: "PF-08", title: "Key numbers", useData: P.useKeyNumbers, View: V.KeyNumbersView, spec: P.keyNumbersSpec },
  ReturnChart: { checklist: "PF-01", title: "Return chart vs benchmark", useData: P.useReturnChart, View: V.ReturnChartView, spec: P.returnChartSpec },
  PeriodsTable: { checklist: "PF-05", title: "Returns by period", useData: P.usePeriodsTable, View: V.PeriodsTableView, spec: P.periodsSpec },
  CalendarYears: { checklist: "PF-09", title: "Calendar-year returns", useData: P.useCalendarYears, View: V.CalendarYearsView, spec: P.calendarReturnsSpec },
  MonthlyReturns: { checklist: "PF-04", title: "Monthly returns", useData: P.useMonthly, View: V.MonthlyView, spec: P.calendarReturnsSpec },
  Drawdowns: { checklist: "PF-02", title: "Drawdowns", useData: P.useDrawdowns, View: V.DrawdownsView, spec: P.drawdownsSpec },
  Attribution: { checklist: "PF-03", title: "Contribution / attribution", useData: P.useAttribution, View: V.AttributionView, spec: P.attributionSpec },
  RiskAdjusted: { checklist: "PF-06", title: "Risk-adjusted metrics", useData: P.useRiskAdjusted, View: V.RiskAdjustedView, spec: P.riskAdjSpec },
  TimingGap: { checklist: "PF-11", title: "Principal vs gains / timing gap", useData: P.useBridge, View: V.BridgeView, spec: P.bridgeSpec },
  Capture: { checklist: "PF-14", title: "Up / down capture", useData: P.useCapture, View: V.CaptureView, spec: P.captureSpec },
};
