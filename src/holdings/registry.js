// Holdings components. Cash (HD-02) reuses the one cash hook/view (DUP rule).
import * as H from "./hooks/useHoldings.js";
import { KeyInfoView, UpDownView, WeightRibbonView, TreemapView, InspectorView } from "./views/HoldingsTop.jsx";
import { GeographyView, FiltersView, HoldingsTableView, WinnersView, Range52View, TargetsView, TrendView } from "./views/HoldingsMore.jsx";
import { useCash, cashSpec } from "../overview/hooks/useBookFacts.js";
import { CashView } from "../overview/views/BookFactsViews.jsx";

export const holdingsRegistry = {
  KeyInfoStrip: { checklist: "HD-04", title: "Key info strip", useData: H.useKeyInfo, View: KeyInfoView, spec: H.keyInfoSpec },
  UpDownRibbon: { checklist: "HD-22", title: "Up / down today", useData: H.useUpDown, View: UpDownView, spec: H.upDownSpec },
  WeightRibbon: { checklist: "HD-09", title: "Weight ribbon", useData: H.useRibbon, View: WeightRibbonView, spec: H.ribbonSpec },
  PortfolioMap: { checklist: "HD-06", title: "Portfolio map / treemap", useData: H.useTreemap, View: TreemapView, spec: H.treemapSpec },
  PositionInspector: { checklist: "HD-20", title: "Position inspector", useData: H.useInspector, View: InspectorView, spec: H.inspectorSpec, gallery: { props: { symbol: "TWLD.L" } } },
  GeoExposure: { checklist: "HD-07", title: "Geographic exposure", useData: H.useGeography, View: GeographyView, spec: H.geoSpec },
  HoldingsFilters: { checklist: "HD-05", title: "Filters / grouping", useData: H.useFilters, View: FiltersView, spec: H.filtersSpec },
  HoldingsTable: { checklist: "HD-01", title: "Full holdings table", useData: H.useHoldingsTable, View: HoldingsTableView, spec: H.tableSpec },
  WinnersLosers: { checklist: "HD-10", title: "Winners / losers", useData: H.useWinnersLosers, View: WinnersView, spec: H.winnersSpec },
  Range52: { checklist: "HD-11", title: "52-week range", useData: H.useRange52, View: Range52View, spec: H.rangeSpec },
  AllocationVsTarget: { checklist: "HD-12", title: "Allocation vs target", useData: H.useTargets, View: TargetsView, spec: H.targetsSpec },
  TrendColumn: { checklist: "HD-15", title: "Trend (30D / 3M)", useData: H.useTrend, View: TrendView, spec: H.trendSpec },
  CashBreakdown: { checklist: "HD-02", title: "Cash breakdown", useData: useCash, View: CashView, spec: cashSpec },
};
