// Every Portfolio-page component, keyed by id, for the gallery.
import { overviewRegistry } from "./overview/registry.js";
import { holdingsRegistry } from "./holdings/registry.js";
import { performanceRegistry } from "./performance/registry.js";
import { analysisRegistry } from "./analysis/registry.js";
export const PAGES = { overview: overviewRegistry, holdings: holdingsRegistry, performance: performanceRegistry, analysis: analysisRegistry };
