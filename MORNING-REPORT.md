# MORNING REPORT — Portfolio sub-pages build (in progress; updated after each component)

**Where to look:** API on 3101 + Vite on 5273 (restart commands at the bottom). App: http://localhost:5273/#/portfolio/overview · Gallery: http://localhost:5273/#/gallery
**All data on screen is a synthetic test world** (tickers T*.L / TCO, "[Test fixture]" headlines). The real `meridian.db` was never opened.

## Status so far

- Phase A (backend R1-01…R1-11 + extra B-items): **done**, 16/16 test scripts green (682 original assertions unchanged + 532 new).
- Phase B (foundation): **done** — useApi (dedupe, abort, per-part data versions), Skeleton/StaleBadge/BasisTag/ProvenanceFooter/Placeholder/SectionLabel/Explain popover, layout renderer, gallery (#/gallery, six states from recorded responses), shared forms VF-01 line/area, VF-02 bars, VF-03 ribbon, VF-04 donut, VF-05 sunburst, VF-06 treemap, VF-07 heat grid, VF-09 waterfall, VF-10 dumbbell + range track, VF-11 scatter, VF-13 fan, VF-14 ring, VF-16 Pareto/Lorenz, VF-17 sparkline/spark-bars, VF-19 distance bubbles, VF-20 world map, VF-21 globe, VF-23 data table, VF-24 stat tile, VF-27 coverage bar, VF-28 segmented toggle.
- Phase C: Overview **15/15**, Holdings **13/13**, Performance **10/10** Tier 1 components built (+ Goal from Tier 2, since its backend was R1-04). Analysis: in progress.

## Component table

Jobs = every `- [ ]` line in the component's checklist block (Data, Compute, each Build form, Interact, Honesty, SC-1…SC-5).
Verification per component: `scripts/ui-check.mjs` (populated / thin / empty × dark / light at 1440; console errors 0, failed requests 0, charts labelled, keyboard-focusable controls present), `scripts/ui-poll-check.mjs`, `scripts/ui-gallery-check.mjs` (six states × two themes, 0 crashes), `scripts/lint-colours.mjs` (0 literal colours).
SC-3 counts dark + light: the third scaffolded theme is out of scope by the master brief's decision ("both existing themes; no third theme"). SC-5 screenshots at 1440 are done; 1280/1920 page shots are taken at the end of the run.

| ID | Component | Status | Jobs done / total | Skipped or partial (reason) | Screenshots |
|---|---|---|---|---|---|
| OV-01 | Headline numbers + stat tiles | done | 13 / 13 | Explain is a click/focus popover rather than pure hover (keyboard-reachable that way). Net-deposits tile appears only when the ledger has entries; income tile is the explained placeholder, as specified. | overnight-shots/overview-HeroTotal-*, overview-StatTiles-*, gallery-HeroTotal-*, gallery-StatTiles-* |
| OV-12 | Performance chart | partial | 13 / 15 | Event markers: record high, deposits/withdrawals and unusual days (≥2.5σ for the book) are drawn; earnings and notes are not (the calendar holds only future dates; notes are per instrument). Goal glide path: shown as a line of text in the value view, not drawn — the goal lies years ahead of a historical chart and drawing it would crush the scale. | overview-PerformanceChart-*, gallery-PerformanceChart-* |
| OV-24 | Period returns | done | 11 / 11 | — | overview-PerformanceChart-* (strip), gallery-PeriodReturns-* |
| OV-06 | Health, five axes, no total | done | 13 / 13 | — (engine's `overall` is stripped server-side) | overview-HealthAxes-*, gallery-HealthAxes-* |
| OV-05 | Leaders & laggards | done | 14 / 14 | — | overview-LeadersLaggards-*, gallery-LeadersLaggards-* |
| OV-11 | What moved today | done | 14 / 14 | Day-range slider draws only when the quote carries day high/low (the fixture quotes do not, so it says so). | overview-DayContribution-*, gallery-DayContribution-* |
| OV-02 | Composition | partial | 15 / 16 | Interact is partial: clicking a slice highlights it (shared selection, Esc clears) but other panels do not filter by a group, and hovering a holding lights it in Top holdings / Leaders but not inside the composition chart. | overview-Composition-*, gallery-Composition-* |
| OV-04 | Top holdings | done | 13 / 13 | — | overview-TopHoldings-*, gallery-TopHoldings-* |
| OV-03 | Calendar, next 30 days | partial | 16 / 17 | Personal-notes lane: blocked — notes are stored per instrument, not per date; the lane is an explained placeholder. | overview-CalendarNext30-*, gallery-CalendarNext30-* |
| OV-08 | News touching the book | done | 15 / 15 | "Mark read" is per viewer (browser storage): the server tracks reads per briefing finding, not per story. "All news" opens the News page unfiltered. | overview-NewsTouchingBook-*, gallery-NewsTouchingBook-* |
| OV-13 | Briefing digest | done | 13 / 13 | Snooze is offered only on alert findings (the only kind the engine can snooze). | overview-BriefingDigest-*, gallery-BriefingDigest-* |
| OV-14 | Concentration | done | 11 / 11 | — | overview-ConcentrationSnapshot-*, gallery-ConcentrationSnapshot-* |
| OV-09 | Cash / liquidity | done | 13 / 13 | — | overview-CashLiquidity-*, gallery-CashLiquidity-* |
| OV-21 | Watchlist strip | done | 10 / 10 | — | overview-WatchlistStrip-*, gallery-WatchlistStrip-* |
| OV-22 | Accounts | partial | 11 / 12 | ISA allowance meter: blocked (cash_flows has no wrapper column) — explained placeholder with the 2026/27 limit labelled. Card click opens Holdings filtered by account (depends on HD-05). | overview-AccountsCards-*, gallery-AccountsCards-* |
| OV-23 | Goal (Tier 2, built early) | built | — | Backend R1-04; form, progress, fan chart, required monthly. Counted under Tier 2. | overview-GoalProgress-*, gallery-GoalProgress-* |

Overview so far: **205 / 211 jobs**.

| ID | Component | Status | Jobs done / total | Skipped or partial (reason) | Screenshots |
|---|---|---|---|---|---|
| HD-01 | Full holdings table | done | 15 / 15 | Column sets are the General / Returns / Fundamentals tabs plus a remembered column chooser. Multi-select shows the selection's value and weight (no bulk write action — deliberate). Interactions verified by `scripts/ui-interact-holdings.mjs` (7/7). | holdings-HoldingsTable-*, gallery-HoldingsTable-* |
| HD-02 | Cash breakdown | done | 11 / 11 | Same hook and view as OV-09 (DUP rule). | holdings-CashBreakdown-* |
| HD-04 | Key info strip | done | 9 / 9 | — | holdings-KeyInfoStrip-* |
| HD-05 | Filters / grouping | done | 12 / 12 | Income and tax-lot tabs are hidden (not empty) until those records exist, as the honesty rule asks. | holdings-HoldingsFilters-* |
| HD-06 | Treemap | done | 15 / 15 | — | holdings-PortfolioMap-* |
| HD-07 | Geography, map + globe | done | 15 / 15 | Geometry is hand-authored, schematic low-poly outlines rasterised to dots (no CDN, no new dependency). Regions are listing venue, looked through fund disclosures; the undisclosed share is shown as unknown. | holdings-GeoExposure-* |
| HD-09 | Weight ribbon | done | 13 / 13 | — | holdings-WeightRibbon-* |
| HD-10 | Winners / losers | done | 11 / 11 | — | holdings-WinnersLosers-* |
| HD-11 | 52-week range | done | 11 / 11 | — | holdings-Range52-* |
| HD-12 | Allocation vs target | done | 13 / 13 | Pound gap is a size, never advice; trades are on Analysis → Rebalance. | holdings-AllocationVsTarget-* |
| HD-15 | Trend column | done | 10 / 10 | Also a column in the table. | holdings-TrendColumn-* |
| HD-20 | Position inspector | done | 12 / 12 | Two homes: beside the map, and as a pop-out drawer (Esc closes); the existing side panel remains the "full panel". Focus is moved into the drawer but not trapped. | holdings-PositionInspector-* |
| HD-22 | Up / down ribbon | done | 8 / 8 | — | holdings-UpDownRibbon-* |

Holdings: **155 / 155 jobs**.

| ID | Component | Status | Jobs done / total | Skipped or partial (reason) | Screenshots |
|---|---|---|---|---|---|
| PF-01 | Return chart vs benchmark | partial | 17 / 18 | Goal glide-path line: stated in text (probability, target, date) rather than drawn — the goal lies years beyond a historical chart. Everything else (excess, growth of £100, cumulative, drawdown and rolling-vol underlays, up to three benchmarks at once, deposits line) is drawn. | performance-ReturnChart-* |
| PF-02 | Drawdowns | done | 14 / 14 | Hovering an episode draws its peak / trough / recovery on the underwater chart. | performance-Drawdowns-* |
| PF-03 | Attribution | done | 15 / 15 | Contribution over time is new backend B-19 (per-holding monthly contributions that sum exactly to each month; tested). | performance-Attribution-* |
| PF-04 | Monthly returns | done | 13 / 13 | Clicking a month shows exactly that month on the return chart (new custom window on /performance/series; tested). | performance-MonthlyReturns-* |
| PF-05 | Returns by period | done | 11 / 11 | Table carries the chosen benchmark plus three others. | performance-PeriodsTable-* |
| PF-06 | Risk-adjusted | done | 12 / 12 | Risk-free 4% stated; gauges each state their own scale and are never combined. | performance-RiskAdjusted-* |
| PF-08 | Key numbers | done | 8 / 8 | Money-weighted and time-weighted both shown, with the timing gap explained. | performance-KeyNumbers-* |
| PF-09 | Calendar-year returns | done | 9 / 9 | — | performance-CalendarYears-* |
| PF-11 | Timing gap / principal vs gains | done | 11 / 11 | No ledger = explained refusal (thin/empty worlds). | performance-TimingGap-* |
| PF-14 | Capture ratios | done | 9 / 9 | — | performance-Capture-* |

Performance: **119 / 120 jobs**. Interactions verified by `scripts/ui-interact-performance.mjs` (4/4). The existing Performance content (money- and time-weighted cards, cash-flow ledger entry and delete, benchmark comparison, attribution panel with AI commentary button) stays on the same tab below the new page. The existing Holdings content (add position, refresh names, summary strip, value chart, breakdowns, table with side panel) is kept under a "Classic holdings tools" toggle on the same tab.

## Risks to review
- R1-02 changes the day-change figures shown everywhere (they were overstated on up days, understated on down days). Correct, but numbers will differ from yesterday's.
- `POST /goal` now saves a goal and simulates from history; the old invented-input version is gone (nothing in the UI called it).
- New routes: 174 total (was 140).

## Restart commands
```
# three seeded worlds (populated / thin / empty) + price fixtures
for m in populated thin empty; do MERIDIAN_DB=/tmp/mo/$m.test.db node scripts/seed-world.mjs $m /tmp/mo/prices-$m.json; done
MERIDIAN_DB=/tmp/mo/populated.test.db MERIDIAN_PORT=3101 MERIDIAN_PRICE_FIXTURE=/tmp/mo/prices-populated.json MERIDIAN_OFFLINE=1 node server/index.js
VITE_MERIDIAN_API=http://localhost:3101 npx vite --port 5273 --strictPort
```
