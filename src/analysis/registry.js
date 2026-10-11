// Analysis components. Concentration (AN-02) and the scorecard (AN-05) reuse
// the Overview hook and view with fuller props (DUP rule: one component,
// several homes).
import * as A from "./hooks/useAnalysis.js";
import * as V from "./views/AnalysisViews.jsx";
import { useConcentration, concentrationSpec } from "../overview/hooks/useBookFacts.js";
import { ConcentrationView } from "../overview/views/BookFactsViews.jsx";
import { useHealthAxes, healthSpec } from "../overview/hooks/useHealthAxes.js";
import { HealthAxesView } from "../overview/views/HealthAxesView.jsx";

export const analysisRegistry = {
  ScenarioLab: { checklist: "AN-01", title: "Scenario lab", useData: A.useScenarioLab, View: V.ScenarioLabView, spec: A.scenariosSpec },
  ConcentrationFull: { checklist: "AN-02", title: "Concentration", useData: useConcentration, View: ConcentrationView, spec: concentrationSpec, gallery: { props: { full: true } } },
  Correlation: { checklist: "AN-03", title: "Correlation", useData: A.useCorrelation, View: V.CorrelationView, spec: A.correlationSpec },
  FundOverlap: { checklist: "AN-04", title: "Fund overlap / look-through", useData: A.useOverlap, View: V.OverlapView, spec: A.overlapSpec },
  Scorecard: { checklist: "AN-05", title: "Health scorecard (axes)", useData: useHealthAxes, View: HealthAxesView, spec: healthSpec, gallery: { props: { expanded: true } } },
  Rebalance: { checklist: "AN-08", title: "Rebalance", useData: A.useRebalance, View: V.RebalanceView, spec: A.rebalanceSpec },
  AllocationBreakdown: { checklist: "AN-09", title: "Allocation breakdown", useData: A.useAllocation, View: V.AllocationView, spec: A.allocationSpec },
  RiskFigures: { checklist: "AN-12", title: "Key risk figures", useData: A.useRiskFigures, View: V.RiskFiguresView, spec: A.riskSpec },
  MonteCarlo: { checklist: "AN-13", title: "Monte Carlo", useData: A.useMonteCarlo, View: V.MonteCarloView, spec: A.monteCarloSpec },
  RiskContribution: { checklist: "AN-15", title: "Risk contribution", useData: A.useRiskContribution, View: V.RiskContributionView, spec: A.riskSpec },
  CrisisReplay: { checklist: "AN-21", title: "Replay a crisis", useData: A.useCrisisReplay, View: V.CrisisReplayView, spec: A.scenariosSpec },
};
