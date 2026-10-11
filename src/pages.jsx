// The four Portfolio sub-pages, each a layout file over a registry.
import React from "react";
import { SubPage } from "./shared/SubPage.jsx";
import { overviewRegistry } from "./overview/registry.js";
import overviewFable from "./overview/layouts/overview.v0-fable.js";
import overviewMedium from "./overview/layouts/overview.v0-medium.js";
import { holdingsRegistry } from "./holdings/registry.js";
import holdingsV0 from "./holdings/layouts/holdings.v0.js";
import { performanceRegistry } from "./performance/registry.js";
import performanceV0 from "./performance/layouts/performance.v0.js";
import { analysisRegistry } from "./analysis/registry.js";
import analysisV0 from "./analysis/layouts/analysis.v0.js";

export const OVERVIEW_LAYOUTS = { "v0-fable": overviewFable, "v0-medium": overviewMedium };

export function OverviewPage(props) {
  return <SubPage {...props} layouts={OVERVIEW_LAYOUTS} registry={overviewRegistry} />;
}

export const HOLDINGS_LAYOUTS = { v0: holdingsV0 };
export function HoldingsPage(props) {
  // Overview components are available to this page's layout too (one
  // registry per page, merged), so a layout can reuse any of them.
  return <SubPage {...props} layouts={HOLDINGS_LAYOUTS} registry={{ ...overviewRegistry, ...holdingsRegistry }} />;
}

export const PERFORMANCE_LAYOUTS = { v0: performanceV0 };
export function PerformancePage(props) {
  return <SubPage {...props} layouts={PERFORMANCE_LAYOUTS} registry={{ ...overviewRegistry, ...performanceRegistry }} />;
}

export const ANALYSIS_LAYOUTS = { v0: analysisV0 };
export function AnalysisPage(props) {
  return <SubPage {...props} layouts={ANALYSIS_LAYOUTS} registry={{ ...overviewRegistry, ...analysisRegistry }} />;
}
