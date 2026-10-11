// Overview components: id -> { checklist id, title, hook, view, spec }. The
// registry is the only file that knows both halves of a component.
import { useHeroTotal, useStatTiles, heroSpec, statsSpec } from "./hooks/useHeadline.js";
import { HeroTotalView, StatTilesView } from "./views/HeadlineViews.jsx";
import { usePerformanceChart, usePeriodReturns, performanceChartSpec, periodReturnsSpec } from "./hooks/usePerformanceChart.js";
import { PerformanceChartView, PeriodReturnsView } from "./views/PerformanceChartView.jsx";
import { useHealthAxes, healthSpec } from "./hooks/useHealthAxes.js";
import { HealthAxesView } from "./views/HealthAxesView.jsx";
import { useLeadersLaggards, leadersSpec } from "./hooks/useLeadersLaggards.js";
import { LeadersLaggardsView } from "./views/LeadersLaggardsView.jsx";
import { useDayContribution, daySpec } from "./hooks/useDayContribution.js";
import { DayContributionView } from "./views/DayContributionView.jsx";
import { useComposition, compositionSpec } from "./hooks/useComposition.js";
import { CompositionView } from "./views/CompositionView.jsx";
import { useTopHoldings, topSpec } from "./hooks/useTopHoldings.js";
import { TopHoldingsView } from "./views/TopHoldingsView.jsx";
import { useCalendarNext30, calendarSpec } from "./hooks/useCalendar.js";
import { CalendarView } from "./views/CalendarView.jsx";
import { useNewsTouchingBook, newsSpec } from "./hooks/useNews.js";
import { NewsView } from "./views/NewsView.jsx";
import { useBriefingDigest, briefingSpec } from "./hooks/useBriefingDigest.js";
import { BriefingDigestView } from "./views/BriefingDigestView.jsx";
import { useConcentration, useCash, useWatchlist, useAccounts, useGoal, concentrationSpec, cashSpec, watchlistSpec, accountsSpec, goalSpec } from "./hooks/useBookFacts.js";
import { ConcentrationView, CashView, WatchlistView, AccountsView, GoalView } from "./views/BookFactsViews.jsx";

import { useTargets, targetsSpec } from "../holdings/hooks/useHoldings.js";
import { TargetsView } from "../holdings/views/HoldingsMore.jsx";

export const overviewRegistry = {
  // v0-medium puts target drift beside health; it is the Holdings component.
  TargetDrift: { checklist: "HD-12", title: "Target drift", useData: useTargets, View: TargetsView, spec: targetsSpec, galleryHidden: true },
  HeroTotal: { checklist: "OV-01", title: "Headline numbers", useData: useHeroTotal, View: HeroTotalView, spec: heroSpec },
  StatTiles: { checklist: "OV-01", title: "Stat tiles", useData: useStatTiles, View: StatTilesView, spec: statsSpec },
  PerformanceChart: { checklist: "OV-12", title: "Performance chart", useData: usePerformanceChart, View: PerformanceChartView, spec: performanceChartSpec },
  PeriodReturns: { checklist: "OV-24", title: "Period returns", useData: usePeriodReturns, View: PeriodReturnsView, spec: periodReturnsSpec },
  HealthAxes: { checklist: "OV-06", title: "Health (five axes)", useData: useHealthAxes, View: HealthAxesView, spec: healthSpec },
  LeadersLaggards: { checklist: "OV-05", title: "Leaders & laggards", useData: useLeadersLaggards, View: LeadersLaggardsView, spec: leadersSpec },
  DayContribution: { checklist: "OV-11", title: "What moved today", useData: useDayContribution, View: DayContributionView, spec: daySpec },
  Composition: { checklist: "OV-02", title: "Composition", useData: useComposition, View: CompositionView, spec: compositionSpec },
  TopHoldings: { checklist: "OV-04", title: "Largest positions", useData: useTopHoldings, View: TopHoldingsView, spec: topSpec },
  CalendarNext30: { checklist: "OV-03", title: "Next 30 days", useData: useCalendarNext30, View: CalendarView, spec: calendarSpec },
  NewsTouchingBook: { checklist: "OV-08", title: "Headlines touching the book", useData: useNewsTouchingBook, View: NewsView, spec: newsSpec },
  BriefingDigest: { checklist: "OV-13", title: "Briefing digest", useData: useBriefingDigest, View: BriefingDigestView, spec: briefingSpec },
  ConcentrationSnapshot: { checklist: "OV-14", title: "Concentration", useData: useConcentration, View: ConcentrationView, spec: concentrationSpec },
  CashLiquidity: { checklist: "OV-09", title: "Cash & liquidity", useData: useCash, View: CashView, spec: cashSpec },
  WatchlistStrip: { checklist: "OV-21", title: "Watchlist", useData: useWatchlist, View: WatchlistView, spec: watchlistSpec },
  AccountsCards: { checklist: "OV-22", title: "Accounts", useData: useAccounts, View: AccountsView, spec: accountsSpec },
  GoalProgress: { checklist: "OV-23", title: "Goal", useData: useGoal, View: GoalView, spec: goalSpec },
};
