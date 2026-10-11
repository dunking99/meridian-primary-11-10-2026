# Meridian - Portfolio Page: Component-by-Component Build Checklist

Scope: **the Portfolio page only** (its four design sub-pages - Overview, Holdings, Performance, Analysis - plus the
existing Portfolio tabs that must keep working: X-Ray, Allocate, Rebuild). Everything else in Meridian is out of scope here.

Companion to `UI-BUILD-CHECKLIST.md` (general plan). That file remains the source for: guardrails **G-xx**, decisions **D-xx**,
backend items **B-xx**. This file is the deep list: every component, every visual form, its data, its maths, its behaviour, its
honest-failure rules. It was generated from the Component Finder catalogue (86 components), the saved favourites/likes in
`meridian-data.json`, and the Claude-group audit (`component-audit/claude-group.md`), then hand-specified per component.

Provenance caveat: "Status" and "Data" lines are a first-pass mapping from route/function names; Phase 1 verifies each.

**Status key:** S supported today - P partly supported - N new backend work - X blocked or needs a decision - C client-side only.

## How every component is checked
Every component block ends with **SC-1..5 pass**, defined once here:
- **SC-1 States.** Loading skeleton; empty portfolio; exactly one holding; partial coverage (missing holdings *named*, coverage % shown); stale data (as-of older than threshold flagged); server error and honest refusal (`available:false` + reason). Each with written wording, British English, no false reassurance.
- **SC-2 Provenance.** A footer line: source, as-of time, basis (reconstructed / recorded / estimate). Every derived figure has an "explain this figure" popover (method, window, coverage).
- **SC-3 Themes.** Renders in dark, light and the third scaffolded theme with zero literal colours; gain/loss colour is separate from brand accent and never the only signal.
- **SC-4 Accessibility.** Keyboard reachable and operable; every chart has a text alternative summarising its actual numbers; respects reduced motion.
- **SC-5 Tests.** Playwright with three fixtures (populated / thin / empty), screenshots at 1280, 1440, 1920; plus an engine test with hand-worked answers wherever new maths is introduced.

Item anatomy: **Data** (source, what's missing) - **Compute** (the maths and the rule that keeps it honest) - **Build forms** (one checkbox per visual variant) - **Interact** - **Honesty rules** - **SC-1..5**.

---
## PG - Portfolio page shell
- [ ] PG-01 Page header: title, as-of clock, data-freshness pill (worst-stale input), "thin holdings excluded" banner (existing behaviour kept).
- [ ] PG-02 Sub-page navigation: Overview / Holdings / Performance / Analysis / X-Ray / Allocate / Rebuild; deep-linkable by URL hash; remembers last tab per viewer; sidebar sub-items jump correctly (existing `tabJump`).
- [ ] PG-03 Global filters bar shared by all sub-pages: account, wrapper, currency, benchmark, period; URL-synced; applied consistently; "clear" and "what is filtered" indicator.
- [ ] PG-04 Cross-highlighting: selecting a holding/slice/tile/row highlights it in every visible component; Esc clears; one shared selection state.
- [ ] PG-05 Holding side panel available from anywhere on the page (existing `HoldingSidePanel`), opens once, swaps contents on second selection.
- [ ] PG-06 Layout-as-data: each sub-page rendered from a layout schema (component id, span, min height); default layouts for 1440 and 1920; unsupported components render an explained placeholder, never fake data.
- [ ] PG-07 Period selector state shared between chart, period table and calendars on a sub-page.
- [ ] PG-08 Empty-portfolio first-run state (import statement / add position / add cash) and one-holding state for every sub-page.
- [ ] PG-09 Currency and number formatting utilities (GBP, pence, signs, compact, tabular numerals, en-GB dates).
- [ ] PG-10 Poll behaviour: 60 s price poll updates values without re-rendering the whole page; charts do not redraw from scratch.
- [ ] PG-11 Keyboard map + "?" help overlay for the page.
- [ ] PG-12 Print/report look of the page aligned with `reports.js` self-contained HTML.

## PX - Existing Portfolio features that must keep working through the redesign
- [ ] PX-01 Summary strip (total, invested + cash, profit + today, return tile) and its caveat that the fourth tile is a reconstruction, not an IRR.
- [ ] PX-02 Portfolio value chart and "by type" box.
- [ ] PX-03 Holdings rows: add, edit, delete, refresh names, currency/geography/sector/wrapper breakdown panels.
- [ ] PX-04 Performance tab: money-weighted vs time-weighted, timing gap, versus-benchmark, cash-flow ledger add/delete.
- [ ] PX-05 Analysis tab: scorecard with lifting/holding-back attribution; correlation pairs; all-holdings detail.
- [ ] PX-06 X-Ray tab: "you bought N, you own M", underlying companies, reached-more-than-once, blended sectors, could-not-be-seen-through list, coverage bar.
- [ ] PX-07 Allocate tab (cash deployment) and Rebuild tab (mandate, funnel, diligence, construction, risk compare, data gaps, history) including `RebuildErrorBoundary`.
- [ ] PX-08 Statement importer (preview then apply) and Reports generation/archive entry points reachable from the page.
- [ ] PX-09 Regression proof: before/after Playwright screenshots of each of these against the Phase 0 baseline; all `scripts/test-*.mjs` still green.

## VF - Shared visual forms (build each once; every component below reuses them)
Each form: props contract, all SC states, hover/focus/tooltip, keyboard, text alternative, theme tokens only, performance budget, visual test.
- [ ] **VF-01 Line / area chart** - benchmark + deposits overlays, basis tag, range selector, crosshair, event markers, log/linear option, dual-axis avoided
- [ ] **VF-02 Bars (vertical/horizontal, grouped, paired, diverging)** - target ticks, notches, negative values, labels that never overlap
- [ ] **VF-03 Stacked bar / ribbon** - current vs target, group-by, cross-highlight, tiny-slice handling
- [ ] **VF-04 Donut** - lens switching, centre label, "Other" tail rule
- [ ] **VF-05 Sunburst** - two/three rings, drill in/out, toggle with treemap
- [ ] **VF-06 Treemap** - squarified, grouped, colour modes with legend, tiny-tile label rule, click/hover
- [ ] **VF-07 Heatmap grid** - year x month, sector tiles, correlation cells; symmetric diverging scale; null cells hatched
- [ ] **VF-08 Win/loss calendar** - monthly grid with hit-rate summary
- [ ] **VF-09 Waterfall / bridge** - sums exactly; start/steps/end labelled; negative steps
- [ ] **VF-10 Dumbbell / range track** - two-point comparison; out-of-range aware marker (past the end, not pinned)
- [ ] **VF-11 Scatter / bubble** - risk vs return, depth vs recovery; bubble = weight; label collision avoidance
- [ ] **VF-12 Histogram** - return distribution, tail shading, sample size shown
- [ ] **VF-13 Fan chart** - percentile bands, goal line, sliders drive it
- [ ] **VF-14 Gauge / dial / ring** - band shown relative to a stated range, never an invented score; accessible value text
- [ ] **VF-15 Radar** - axes with coverage, no fill implying totals
- [ ] **VF-16 Lorenz / Pareto** - cumulative weight, HHI marker
- [ ] **VF-17 Sparkline / spark-bars** - closes-only, no axis, direction colour
- [ ] **VF-18 Radial wheel** - monthly income polar bars
- [ ] **VF-19 Distance-from-home bubbles** - radial layout, home at centre
- [ ] **VF-20 World map** - offline geometry, region shading, unknown-region hatch
- [ ] **VF-21 Globe** - 3D rotating, drag, keyboard rotate, reduced-motion static fallback, no CDN, low-end fallback to map, Map/Globe multi-state toggle
- [ ] **VF-22 Timeline / date wall** - stake-sized events, importance dots, notes lane
- [ ] **VF-23 Data table** - sort, column chooser, group headers, sticky header, sparkline/range/bar cells, selection, virtualised, CSV of visible view
- [ ] **VF-24 Stat tile / strip** - value, delta, caption, provenance, explain
- [ ] **VF-25 Cards (insight, news, event)** - materiality dot, tags, exposure %, new-since-read badge
- [ ] **VF-26 Slider controls** - scenario, horizon, contribution; live update without jank; keyboard stepping
- [ ] **VF-27 Coverage bar + missing chips** - draws the unseen share; names missing holdings
- [ ] **VF-28 Toggle / segmented / tabs** - view switching that persists per viewer
- [ ] **VF-29 Drawer / modal / toast-with-undo** - focus trap, Esc, restore focus

---
## Overview sub-page (27 components)
The page that answers "how am I doing and what needs my attention?". **Blocked on decision D-01** (what Overview is relative to What Changed / Briefing) - do not build placement until answered, but components below can be built and tested in isolation.

- [ ] OV-LAYOUT Default layout for this sub-page at 1440 and 1920 built from the components below as layout data; order chosen by the UX spec (Phase 4).
- [ ] OV-EMPTY Whole-page empty, one-holding and thin-data renderings verified.

### OV-01 Key info / headline numbers  [S: supported today]
_Signal:_ in 45 designs - _Backend:_ B-10, B-18
- [ ] **Data** - /portfolio, /performance, snapshots; day change = API previous close (never last poll)
- [ ] **Compute** - total, invested, cash, unrealised GBP and %, day GBP and %, return since start (basis-tagged), net deposits
- [ ] **Build form** - Stat-tile strip (value, invested, cash, unrealised P&L, day move, return)
- [ ] **Build form** - Hero figure + one composed sentence ("worth X, up Y% over the year")
- [ ] **Build form** - 40-session spark-bar strip under the hero
- [ ] **Build form** - Net-deposits and income tiles (only once ledger/income exist)
- [ ] **Interact** - Tile hover = explain popover; click cash -> Allocate, click return -> Performance tab, click day move -> What Changed
- [ ] **Honesty rules** - Return tile says reconstructed unless a cash-flow ledger exists; no ledger = no money-weighted return; under ~1 week of history is refused not annualised
- [ ] **SC-1..5 pass**

### OV-02 Allocation / composition  [P: partly supported]
_Signal:_ in 44 designs, 7 saved favourites - _Backend:_ B-22
- [ ] **Data** - /portfolio breakdowns exist; hierarchy endpoint new
- [ ] **Compute** - weights sum to 1 (asserted); small-tail "Other" bucket with a stated cut-off; cash included/excluded toggle
- [ ] **Build form** - Donut with lens switch (class, sector, region, wrapper, account, currency)
- [ ] **Build form** - Sunburst <-> treemap toggle (class > sector > holding)
- [ ] **Build form** - Stacked allocation ribbon
- [ ] **Build form** - Weighted map (tile size = weight)
- [ ] **Build form** - Bars list with target ticks
- [ ] **Build form** - Asset-class ribbon with domicile split
- [ ] **Build form** - "Target allocation status" chip row
- [ ] **Interact** - Hover links to the same holding in every panel; click slice filters the page; lens toggle by keyboard
- [ ] **Honesty rules** - Unknown sector/region = visible "Unclassified" slice with its weight, never dropped or spread
- [ ] **SC-1..5 pass**

### OV-03 Coming up / calendar (most-liked family)  [P: partly supported]
_Signal:_ in 34 designs, liked x3, 27 saved favourites - _Backend:_ B-61
- [ ] **Data** - /calendar (earnings, ex-div, pay dates, ISA deadline); stake and income amounts new
- [ ] **Compute** - stake = holding weight at event date; income amount from income model when known; window 7/30/60 days; group by day or week
- [ ] **Build form** - Date wall (grid of upcoming days)
- [ ] **Build form** - Session timeline strip
- [ ] **Build form** - List with importance dots
- [ ] **Build form** - Ruler view (+0d ... +30d) with markers
- [ ] **Build form** - Next-five-weeks dot timeline sized by money involved
- [ ] **Build form** - "Three events with a direct line to your holdings" cards
- [ ] **Build form** - Personal-notes lane alongside events
- [ ] **Build form** - Earnings / dividends / macro filter chips
- [ ] **Interact** - Click event -> holding side panel or Research; add a dated note; filter chips; keyboard arrow navigation across days
- [ ] **Honesty rules** - Macro dates not covered -> a permanent visible notice (no free feed); instruments with no published date are listed as "no date published", never given one
- [ ] **SC-1..5 pass**

### OV-04 Top holdings / largest positions  [S: supported today]
_Signal:_ in 31 designs
- [ ] **Data** - /portfolio, /risk risk contributions
- [ ] **Compute** - top N, cumulative weight, risk share
- [ ] **Build form** - Ranked table (top 8) with price, day, weight, value
- [ ] **Build form** - Largest-position tiles with target-weight tick
- [ ] **Build form** - Pareto bars + cumulative-weight line
- [ ] **Build form** - Risk-share column beside weight
- [ ] **Interact** - Row click -> side panel; "All holdings" -> Holdings tab
- [ ] **Honesty rules** - Cash excluded from ranking; N configurable
- [ ] **SC-1..5 pass**

### OV-05 Leaders & laggards / movers  [P: partly supported]
_Signal:_ in 29 designs - _Backend:_ B-21, B-62
- [ ] **Data** - multi-window per-holding returns (new); news link table
- [ ] **Compute** - contribution = weight x return; rank by contribution or by % (toggle)
- [ ] **Build form** - Two-column leaders/laggards lists
- [ ] **Build form** - Diverging bar list
- [ ] **Build form** - Movers with sparkline
- [ ] **Build form** - Window toggle 1D / 1M / YTD / 1Y and % / GBP toggle
- [ ] **Build form** - Mover rows with a one-line linked-story reason
- [ ] **Interact** - Row -> side panel; window toggle persists per viewer
- [ ] **Honesty rules** - A "reason" line appears only when a real linked story exists, else nothing; holdings without prices are named as excluded
- [ ] **SC-1..5 pass**

### OV-06 Health (five axes, no grade)  [X: blocked / needs decision]
_Signal:_ in 28 designs
- [ ] **Data** - /portfolio/scorecard
- [ ] **Compute** - portfolio-weighted axis averages; pulls sum to zero across holdings (existing test)
- [ ] **Build form** - Ring/gauge per axis (quality, trend, technicals, precedent, cost)
- [ ] **Build form** - Report-card grid with coverage per axis
- [ ] **Build form** - "What lifts / holds back" attribution list per axis
- [ ] **Build form** - Dual risk+health instrument cluster (axes only)
- [ ] **Interact** - Click axis -> holdings lifting/holding back it; hover -> method
- [ ] **Honesty rules** - D-03: no overall letter grade or 0-100 total. Axis coverage shown; holdings with no reading named, never scored as neutral
- [ ] **SC-1..5 pass**

### OV-07 Income / dividends  [N: new backend work]
_Signal:_ in 28 designs - _Backend:_ B-30..B-35
- [ ] **Data** - new income ledger + dividend history x quantity
- [ ] **Compute** - received total; TTM yield; forward estimate; concentration of income
- [ ] **Build form** - Bar timeline: received (past) vs estimated (projected), visibly different
- [ ] **Build form** - Income by source (holding) bars
- [ ] **Build form** - Payment calendar strip
- [ ] **Build form** - Radial monthly income wheel
- [ ] **Build form** - Forward income + trailing-12-month yield tiles
- [ ] **Build form** - Top payers table with share
- [ ] **Interact** - Bar click -> that month payments; payer click -> holding
- [ ] **Honesty rules** - Estimated never mixed into received totals; coverage = share of book with a usable dividend record; no history = excluded and named
- [ ] **SC-1..5 pass**

### OV-08 News touching the book  [P: partly supported]
_Signal:_ in 26 designs, 2 saved favourites - _Backend:_ B-62
- [ ] **Data** - /news (AI relevance, symbols, sentiment), briefing
- [ ] **Compute** - combined weight of tagged holdings; sentiment direction; dedupe by title signature
- [ ] **Build form** - Relevant-headlines list with exposure %
- [ ] **Build form** - Helps / hurts / mixed tag per story
- [ ] **Build form** - Editorial "daily dispatch/deck" layout
- [ ] **Build form** - Pinned-today strip
- [ ] **Build form** - Per-holding tag chips
- [ ] **Build form** - Compact night-feed list
- [ ] **Interact** - Story -> filtered News page / external link; mark read
- [ ] **Honesty rules** - Untracked-ticker stories excluded; without an AI key the lexicon fallback is labelled as a filter aid
- [ ] **SC-1..5 pass**

### OV-09 Cash / liquidity  [S: supported today]
_Signal:_ in 25 designs - _Backend:_ B-24
- [ ] **Data** - cash table via /portfolio
- [ ] **Compute** - cash %, deployable cash after mandate buffer, FX conversion with rate date
- [ ] **Build form** - Cash tile with accounts
- [ ] **Build form** - Cash-and-composition combined card
- [ ] **Build form** - Liquidity meter (share of book in cash)
- [ ] **Build form** - Cash by currency list
- [ ] **Interact** - Deploy -> Allocate tab
- [ ] **Honesty rules** - Stale FX rate flagged
- [ ] **SC-1..5 pass**

### OV-10 Risk profile  [P: partly supported]
_Signal:_ in 21 designs - _Backend:_ B-54
- [ ] **Data** - /risk; comfort band from mandate
- [ ] **Compute** - shown relative to the user's stated tolerance; VaR method named
- [ ] **Build form** - Dial/band with narrative caption
- [ ] **Build form** - Key risk figures strip (vol, beta, VaR, max drawdown, effective holdings)
- [ ] **Build form** - Four small instrument gauges (Sharpe, vol, beta, drawdown)
- [ ] **Build form** - Risk vs stated comfort band
- [ ] **Interact** - Click figure -> Risk page detail
- [ ] **Honesty rules** - No invented 0-100 risk score; refuse below history threshold; method statement on hover
- [ ] **SC-1..5 pass**

### OV-11 What changed today / contribution  [P: partly supported]
_Signal:_ in 21 designs, 1 saved favourites - _Backend:_ B-21
- [ ] **Data** - prices + previous close; attribution
- [ ] **Compute** - contribution_i = prior weight x return; sums to the portfolio day return (asserted)
- [ ] **Build form** - Waterfall of today's P&L by holding
- [ ] **Build form** - Session contribution bars
- [ ] **Build form** - Movers with linked reasons
- [ ] **Build form** - Day-range slider per holding
- [ ] **Build form** - "19 up / 1 flat / 11 down" proportional ribbon
- [ ] **Interact** - Bar -> side panel
- [ ] **Honesty rules** - Market-closed state; missing prices excluded and named
- [ ] **SC-1..5 pass**

### OV-12 Performance chart  [P: partly supported]
_Signal:_ in 20 designs, 2 saved favourites - _Backend:_ B-10, B-11
- [ ] **Data** - /performance/series (new)
- [ ] **Compute** - rebased to 100, joined on date, basis tag
- [ ] **Build form** - Line/area vs benchmark (S&P, world, deposits)
- [ ] **Build form** - Value / return / relative view toggle
- [ ] **Build form** - Range selector 1M ... MAX (disables unfillable ranges)
- [ ] **Build form** - Event markers (earnings, big moves, notes)
- [ ] **Build form** - Altitude-ruler variant (positions along low/high)
- [ ] **Build form** - Goal glide-path overlay (only if a goal exists)
- [ ] **Interact** - Crosshair, range keys, benchmark switch
- [ ] **Honesty rules** - Basis tag reconstructed/recorded always visible; 19 bars are never labelled 1Y
- [ ] **SC-1..5 pass**

### OV-13 Signals / insights / pulse  [S: supported today]
_Signal:_ in 20 designs - _Backend:_ B-72
- [ ] **Data** - /briefing, /signals
- [ ] **Compute** - materiality = 100 x strength x stake x kind weight
- [ ] **Build form** - Ranked insight cards with materiality dot
- [ ] **Build form** - Session verdict pulse (quiet vs notable)
- [ ] **Build form** - New-since-last-read badge
- [ ] **Build form** - Conviction + exposure ranked list
- [ ] **Interact** - Mark read; snooze
- [ ] **Honesty rules** - "Nothing notable today" is a first-class state; no confidence ratings
- [ ] **SC-1..5 pass**

### OV-14 Concentration snapshot  [S: supported today]
_Signal:_ in 12 designs
- [ ] **Data** - portfolio.js concentration
- [ ] **Compute** - thresholds from mandate caps
- [ ] **Build form** - Largest / top-3 / HHI / effective-holdings tiles
- [ ] **Build form** - Breach banner
- [ ] **Interact** - Click -> Analysis concentration
- [ ] **Honesty rules** - Banner only on a real breach
- [ ] **SC-1..5 pass**

### OV-15 Recent activity / transactions  [P: partly supported]
_Signal:_ in 11 designs - _Backend:_ B-40
- [ ] **Data** - GET /transactions + cash_flows
- [ ] **Compute** - merge trades and cash movements
- [ ] **Build form** - Compact log (last N)
- [ ] **Build form** - Filterable full log
- [ ] **Build form** - Cash-balance chart
- [ ] **Build form** - Money in / out chart
- [ ] **Interact** - Filter by type/account; click -> holding
- [ ] **Honesty rules** - Activity predating the log is absent and stated
- [ ] **SC-1..5 pass**

### OV-16 Add position / actions  [S: supported today]
_Signal:_ in 10 designs
- [ ] **Data** - POST /holdings, importer
- [ ] **Compute** - name resolution; pence check
- [ ] **Build form** - Primary "+ Add" with ticker search
- [ ] **Build form** - Quick-actions menu (add, import statement, add cash, log deposit, set alert)
- [ ] **Build form** - Add-position modal
- [ ] **Interact** - Import previews before applying; undo toast
- [ ] **Honesty rules** - Unrecognised ticker imports flagged "no stored history", never remapped
- [ ] **SC-1..5 pass**

### OV-17 Geography / currency exposure  [P: partly supported]
_Signal:_ in 8 designs - _Backend:_ B-52
- [ ] **Data** - /lookthrough listing venue, currency
- [ ] **Compute** - listing-venue look-through with coverage
- [ ] **Build form** - Region bars
- [ ] **Build form** - Mini world map
- [ ] **Build form** - Currency donut
- [ ] **Build form** - Distance-from-home bubble chart
- [ ] **Interact** - Region click filters
- [ ] **Honesty rules** - Disclosed share drawn; undisclosed drawn as unknown; revenue lens omitted (D-06)
- [ ] **SC-1..5 pass**

### OV-18 Sector performance / heatmap  [P: partly supported]
_Signal:_ in 8 designs, 1 saved favourites
- [ ] **Data** - sector ETFs (Markets) x weights
- [ ] **Compute** - weight-overlaid day move per sector
- [ ] **Build form** - Sector tile heatmap with portfolio-weight overlay
- [ ] **Build form** - Sector movers list
- [ ] **Interact** - Tile -> sector holdings
- [ ] **Honesty rules** - Proxy ETF named per sector
- [ ] **SC-1..5 pass**

### OV-19 Benchmark / alpha stats  [P: partly supported]
_Signal:_ in 6 designs - _Backend:_ B-17
- [ ] **Data** - analytics beta/alpha/capture
- [ ] **Compute** - joined on date
- [ ] **Build form** - Alpha strip (beta, alpha, tracking error, information ratio, capture)
- [ ] **Build form** - Excess-return pill
- [ ] **Interact** - Benchmark switch
- [ ] **Honesty rules** - Refuse below 120 overlapping bars
- [ ] **SC-1..5 pass**

### OV-20 Asset research quick look  [S: supported today]
_Signal:_ in 5 designs
- [ ] **Data** - /research/overview
- [ ] **Build form** - Search-to-card lookup
- [ ] **Build form** - Mini research header
- [ ] **Interact** - Open full Research
- [ ] **Honesty rules** - No-coverage states per instrument type
- [ ] **SC-1..5 pass**

### OV-21 Watchlist strip  [S: supported today]
_Signal:_ in 5 designs - _Backend:_ B-66
- [ ] **Data** - /watchlist, /alerts
- [ ] **Build form** - Tiered compact list with price and day
- [ ] **Build form** - Inline add + quick alert
- [ ] **Interact** - Row -> Research
- [ ] **Honesty rules** - Missing price shown absent
- [ ] **SC-1..5 pass**

### OV-22 Accounts  [P: partly supported]
_Signal:_ in 3 designs - _Backend:_ B-65
- [ ] **Data** - holdings wrapper/account; contributions by wrapper
- [ ] **Compute** - per-account value, allowance used (tax year)
- [ ] **Build form** - Account cards (ISA / SIPP / GIA totals)
- [ ] **Build form** - Wrapper split bar
- [ ] **Build form** - ISA allowance remaining meter
- [ ] **Interact** - Card filters page
- [ ] **Honesty rules** - Allowance constants labelled with the tax year they apply to
- [ ] **SC-1..5 pass**

### OV-23 Goal / target progress  [P: partly supported]
_Signal:_ in 2 designs - _Backend:_ B-64
- [ ] **Data** - /goal + persisted goal
- [ ] **Compute** - probability from bootstrap, glide path
- [ ] **Build form** - Progress bar to target
- [ ] **Build form** - Glide-path chart vs actual
- [ ] **Build form** - Required monthly contribution
- [ ] **Interact** - Edit goal
- [ ] **Honesty rules** - No goal set = an invitation, never a fake bar
- [ ] **SC-1..5 pass**

### OV-24 Period returns / range row  [N: new backend work]
_Signal:_ in 2 designs, 2 saved favourites - _Backend:_ B-12
- [ ] **Data** - /performance/periods
- [ ] **Compute** - per-period return and excess
- [ ] **Build form** - 1W / 1M / 3M / YTD / 1Y strip with vs-benchmark
- [ ] **Build form** - Range-of-returns bar
- [ ] **Interact** - Click period -> chart range
- [ ] **Honesty rules** - A period the history cannot fill is disabled
- [ ] **SC-1..5 pass**

### OV-25 Alerts summary  [S: supported today]
_Signal:_ in 1 designs
- [ ] **Data** - /signals, /alerts
- [ ] **Build form** - Armed / triggered counts
- [ ] **Build form** - Recently fired list with snooze
- [ ] **Interact** - Snooze/rearm
- [ ] **Honesty rules** - Delivery is in-app only and says so
- [ ] **SC-1..5 pass**

### OV-26 Contributors vs detractors  [S: supported today]
_Signal:_ in 1 designs
- [ ] **Data** - /attribution
- [ ] **Compute** - Carino-linked contribution
- [ ] **Build form** - Two-sided carrying/dragging bars
- [ ] **Interact** - Bar -> holding
- [ ] **Honesty rules** - Labelled relative to the portfolio's own average
- [ ] **SC-1..5 pass**

### OV-27 Plain-English summary  [S: supported today]
_Signal:_ in 1 designs - _Backend:_ B-70, B-71
- [ ] **Data** - composed narrative / analyst brief
- [ ] **Compute** - sentence emitted only if every number in it exists
- [ ] **Build form** - Composed one-paragraph summary
- [ ] **Build form** - Optional AI read with Regenerate
- [ ] **Interact** - Regenerate
- [ ] **Honesty rules** - May conclude nothing happened; no unsourced figure
- [ ] **SC-1..5 pass**

---
## Holdings sub-page (24 components)
Strongest design signal (your typed labels: Allocation Strip, Treemap, World Map / Globe, Holdings Table). Build first.

- [ ] HO-LAYOUT Default layout for this sub-page at 1440 and 1920 built from the components below as layout data; order chosen by the UX spec (Phase 4).
- [ ] HO-EMPTY Whole-page empty, one-holding and thin-data renderings verified.

### HD-01 Full holdings table  [P: partly supported]
_Signal:_ in 41 designs, 1 saved favourites - _Backend:_ B-20
- [ ] **Data** - /holdings/enriched (new)
- [ ] **Compute** - value, weight, day, total gain GBP/%, pence-normalised prices
- [ ] **Build form** - Dense table (name, symbol, qty, avg cost, price, day, value, weight, gain)
- [ ] **Build form** - Extended columns (52-week range, 30D trend, target/drift, fees drag, news count)
- [ ] **Build form** - Group headers by class / sector / wrapper
- [ ] **Build form** - Table <-> treemap toggle
- [ ] **Build form** - Row expand with transactions and own chart
- [ ] **Build form** - Column chooser and saved column sets
- [ ] **Interact** - Sort, multi-select, keyboard rows, inline edit, delete with undo, row -> side panel
- [ ] **Honesty rules** - Missing price = absent with reason; stale-price marker; virtualised past ~200 rows
- [ ] **SC-1..5 pass**

### HD-02 Cash breakdown  [S: supported today]
_Signal:_ in 31 designs - _Backend:_ B-24
- [ ] **Data** - cash table
- [ ] **Compute** - GBP conversion with rate date
- [ ] **Build form** - Tiles by account/currency
- [ ] **Build form** - Editable balances
- [ ] **Build form** - FX-converted total
- [ ] **Interact** - Edit inline; deploy shortcut
- [ ] **SC-1..5 pass**

### HD-03 Quantity and average cost columns  [S: supported today]
_Signal:_ in 29 designs - _Backend:_ B-41
- [ ] **Data** - holdings, transactions
- [ ] **Compute** - avg cost method stated
- [ ] **Build form** - Qty and avg-cost columns
- [ ] **Build form** - Cost-basis tooltip listing transactions
- [ ] **Interact** - Tooltip on hover/focus
- [ ] **Honesty rules** - Method (average vs lot) stated; fees inclusion stated
- [ ] **SC-1..5 pass**

### HD-04 Key info strip  [S: supported today]
_Signal:_ in 26 designs, liked x1
- [ ] **Data** - /portfolio
- [ ] **Build form** - Market value / cost basis / unrealised / day P&L
- [ ] **Build form** - Positions count + up/down
- [ ] **Build form** - Best and worst performer tiles
- [ ] **SC-1..5 pass**

### HD-05 Filters / grouping  [C: client-side only]
_Signal:_ in 25 designs - _Backend:_ B-41
- [ ] **Data** - client-side
- [ ] **Build form** - Chips (class, sector, region, wrapper, account, currency, type)
- [ ] **Build form** - View tabs (General / Returns / Fundamentals / Income / Tax lots)
- [ ] **Build form** - Search box
- [ ] **Build form** - Saved views
- [ ] **Interact** - URL-synced; combinable; clear-all
- [ ] **Honesty rules** - Tax-lots tab only when a lot engine exists (otherwise hidden, not empty)
- [ ] **SC-1..5 pass**

### HD-06 Portfolio map / treemap (liked x4)  [S: supported today]
_Signal:_ in 24 designs, liked x4, 1 saved favourites - _Backend:_ B-22, B-23
- [ ] **Data** - enriched holdings
- [ ] **Compute** - squarified layout; symmetric colour scale with legend
- [ ] **Build form** - Treemap grouped by class/sector, size = value
- [ ] **Build form** - Colour modes: today, 1W, 1M, YTD, total gain, drift-from-target
- [ ] **Build form** - Sunburst alternative
- [ ] **Build form** - Currency tiles variant
- [ ] **Build form** - Map paired with holding-inspector side panel
- [ ] **Build form** - Tile labels degrade to hover on small tiles
- [ ] **Interact** - Click tile -> inspector; cross-highlight with ribbon/table
- [ ] **Honesty rules** - Colour scale and mode always labelled; missing return = neutral hatch, not grey-as-zero
- [ ] **SC-1..5 pass**

### HD-07 Geographic exposure (map / globe) - liked x2  [P: partly supported]
_Signal:_ in 17 designs, liked x2, 5 saved favourites - _Backend:_ B-52
- [ ] **Data** - /lookthrough listing venue + fund geography
- [ ] **Compute** - region weights with coverage; home-bias = UK share (listing and look-through)
- [ ] **Build form** - 2D world map with region shading
- [ ] **Build form** - 3D rotating globe
- [ ] **Build form** - Map/Globe toggle (multi-state)
- [ ] **Build form** - Region bars with look-through home-bias check
- [ ] **Build form** - Clickable region cards with mini dot-grids
- [ ] **Build form** - Distance-from-home radial bubbles
- [ ] **Interact** - Region click filters table; drag-rotate globe; keyboard region list
- [ ] **Honesty rules** - Offline geometry, no CDN; reduced-motion = static map; undisclosed regions shown unknown; look-through is a floor
- [ ] **SC-1..5 pass**

### HD-08 Holdings income  [N: new backend work]
_Signal:_ in 17 designs - _Backend:_ B-30..B-35
- [ ] **Data** - income model
- [ ] **Compute** - see OV-07
- [ ] **Build form** - Income column (yield, next payment)
- [ ] **Build form** - Projected income timeline
- [ ] **Build form** - Top payers table
- [ ] **Build form** - All-in costs stat beside income
- [ ] **Honesty rules** - Estimate vs received distinction
- [ ] **SC-1..5 pass**

### HD-09 Weight / allocation ribbon (liked x2)  [P: partly supported]
_Signal:_ in 17 designs, liked x2 - _Backend:_ B-23
- [ ] **Data** - enriched holdings + targets
- [ ] **Compute** - drift = weight - target
- [ ] **Build form** - Single stacked ribbon current weights
- [ ] **Build form** - Current vs target with notches
- [ ] **Build form** - Group-by toggle (position, class, sector, region)
- [ ] **Build form** - Over/underweight highlight
- [ ] **Interact** - Click slice traces it through map and table (cross-highlight)
- [ ] **Honesty rules** - Holdings with no target shown as such
- [ ] **SC-1..5 pass**

### HD-10 Winners / losers  [S: supported today]
_Signal:_ in 13 designs
- [ ] **Data** - enriched holdings
- [ ] **Compute** - ranked by GBP or % (toggle)
- [ ] **Build form** - Two lists (top/bottom by gain)
- [ ] **Build form** - Unrealised P&L waterfall per position
- [ ] **Build form** - Bars
- [ ] **Interact** - Row -> panel
- [ ] **SC-1..5 pass**

### HD-11 52-week range column  [P: partly supported]
_Signal:_ in 11 designs - _Backend:_ B-20
- [ ] **Data** - stored bars
- [ ] **Compute** - position in range
- [ ] **Build form** - Range bar with price marker
- [ ] **Build form** - Out-of-range marker (past the ends)
- [ ] **Interact** - Hover shows low/high dates
- [ ] **Honesty rules** - Price outside range says "past", not pinned to the end
- [ ] **SC-1..5 pass**

### HD-12 Allocation vs target  [P: partly supported]
_Signal:_ in 11 designs - _Backend:_ B-23
- [ ] **Data** - targets + /rebalance
- [ ] **Compute** - drift and suggested move size
- [ ] **Build form** - Drift bars
- [ ] **Build form** - Dot-vs-tick per asset class
- [ ] **Build form** - Target and drift columns
- [ ] **Build form** - Treemap coloured by drift
- [ ] **Interact** - Edit targets inline
- [ ] **Honesty rules** - No target set = prompt, no fake target
- [ ] **SC-1..5 pass**

### HD-13 Export CSV  [C: client-side only]
_Signal:_ in 9 designs - _Backend:_ B-25
- [ ] **Data** - client-side
- [ ] **Compute** - UTF-8, GBP explicit
- [ ] **Build form** - Export visible view as CSV
- [ ] **Build form** - Dated JSON backup shortcut
- [ ] **Honesty rules** - Export matches what is on screen incl. filters
- [ ] **SC-1..5 pass**

### HD-14 Add position  [S: supported today]
_Signal:_ in 8 designs
- [ ] **Data** - -
- [ ] **Build form** - See OV-16 (same modal)
- [ ] **SC-1..5 pass**

### HD-15 Trend column (30D sparkline)  [P: partly supported]
_Signal:_ in 8 designs - _Backend:_ B-20
- [ ] **Data** - /history/batch
- [ ] **Compute** - closes only
- [ ] **Build form** - 30D sparkline
- [ ] **Build form** - 3M sparkline option
- [ ] **Honesty rules** - No series = blank cell with reason on hover
- [ ] **SC-1..5 pass**

### HD-16 Concentration (compact)  [S: supported today]
_Signal:_ in 7 designs
- [ ] **Data** - -
- [ ] **Build form** - Compact tiles + warnings (see AN-02)
- [ ] **SC-1..5 pass**

### HD-17 Fees / drag  [P: partly supported]
_Signal:_ in 6 designs - _Backend:_ B-43
- [ ] **Data** - expense ratios (scorecard cost axis)
- [ ] **Compute** - ratio x value
- [ ] **Build form** - Expense-ratio column
- [ ] **Build form** - Total annual GBP drag tile
- [ ] **Build form** - Drag bars by holding
- [ ] **Honesty rules** - No published expense ratio = absent, never zero/free
- [ ] **SC-1..5 pass**

### HD-18 Look-through teaser  [S: supported today]
_Signal:_ in 5 designs
- [ ] **Data** - /xray
- [ ] **Compute** - floors not estimates
- [ ] **Build form** - "You bought N, you own M disclosed companies"
- [ ] **Build form** - Top underlying companies list
- [ ] **Build form** - Hidden-overlap flag
- [ ] **Interact** - -> X-Ray tab
- [ ] **Honesty rules** - Partial disclosure never scaled up to look complete
- [ ] **SC-1..5 pass**

### HD-19 Per-holding news  [S: supported today]
_Signal:_ in 5 designs
- [ ] **Data** - /news
- [ ] **Build form** - News-count badge on rows
- [ ] **Build form** - News block in side panel
- [ ] **SC-1..5 pass**

### HD-20 Position detail panel / inspector  [S: supported today]
_Signal:_ in 4 designs
- [ ] **Data** - /portfolio/holding
- [ ] **Build form** - Right-hand drawer (price, qty, cost, value, weight vs target, unrealised, income, risk share, look-through, 52-week range, news)
- [ ] **Build form** - Inspector beside the map
- [ ] **Build form** - Own price chart
- [ ] **Build form** - Transactions and thesis blocks
- [ ] **Interact** - Second row click swaps contents; Esc closes
- [ ] **Honesty rules** - Each block degrades independently
- [ ] **SC-1..5 pass**

### HD-21 Watchlist  [S: supported today]
_Signal:_ in 4 designs
- [ ] **Data** - -
- [ ] **Build form** - See OV-21
- [ ] **SC-1..5 pass**

### HD-22 Up / down today ribbon  [S: supported today]
_Signal:_ in 3 designs, 1 saved favourites
- [ ] **Data** - prices
- [ ] **Build form** - Proportional ribbon by count and by weight
- [ ] **Interact** - Segment filters table
- [ ] **SC-1..5 pass**

### HD-23 Closed / realised positions  [N: new backend work]
_Signal:_ in 2 designs - _Backend:_ B-41, B-42
- [ ] **Data** - transactions -> lot engine
- [ ] **Compute** - lot matching (method decision D-04)
- [ ] **Build form** - Realised log with hit rate
- [ ] **Build form** - Realised P&L by holding
- [ ] **Honesty rules** - Coverage note when history predates the log; ISA/SIPP gains flagged non-taxable
- [ ] **SC-1..5 pass**

### HD-24 Trade ideas (advisory)  [X: blocked / needs decision]
_Signal:_ in 1 designs
- [ ] **Data** - /rebalance, /allocate, rebuild
- [ ] **Compute** - engine output only
- [ ] **Build form** - Trim/add list from Allocate/Rebuild with "Plan" link
- [ ] **Interact** - -> Allocate
- [ ] **Honesty rules** - D-08: never free text; never writes holdings
- [ ] **SC-1..5 pass**

---
## Performance sub-page (14 components)
Highest-frequency component across designs is the return chart vs benchmark (45). Every series carries a basis tag (reconstructed vs recorded).

- [ ] PE-LAYOUT Default layout for this sub-page at 1440 and 1920 built from the components below as layout data; order chosen by the UX spec (Phase 4).
- [ ] PE-EMPTY Whole-page empty, one-holding and thin-data renderings verified.

### PF-01 Return chart vs benchmark (most common)  [P: partly supported]
_Signal:_ in 45 designs - _Backend:_ B-10, B-11
- [ ] **Data** - /performance/series
- [ ] **Compute** - joined on date; basis tag
- [ ] **Build form** - Line/area vs benchmark
- [ ] **Build form** - Excess-return ribbon
- [ ] **Build form** - Growth of 100
- [ ] **Build form** - Cumulative return view
- [ ] **Build form** - Drawdown underlay toggle
- [ ] **Build form** - Rolling-volatility toggle
- [ ] **Build form** - Multiple benchmarks
- [ ] **Build form** - Deposits line
- [ ] **Build form** - Goal glide-path line
- [ ] **Interact** - Range selector, crosshair, benchmark picker
- [ ] **Honesty rules** - Basis visible; refuse ranges history cannot fill
- [ ] **SC-1..5 pass**

### PF-02 Drawdowns / worst drops  [P: partly supported]
_Signal:_ in 36 designs - _Backend:_ B-14
- [ ] **Data** - /performance/drawdowns
- [ ] **Compute** - episode detection
- [ ] **Build form** - Underwater area chart
- [ ] **Build form** - Episodes table (peak, trough, depth, recovery)
- [ ] **Build form** - Depth-vs-recovery-days scatter
- [ ] **Build form** - Mini recovery sparkline per episode
- [ ] **Build form** - Current / longest / average-recovery stats
- [ ] **Interact** - Row highlights span on chart
- [ ] **Honesty rules** - Ongoing drawdown shown as ongoing
- [ ] **SC-1..5 pass**

### PF-03 Contribution / attribution  [S: supported today]
_Signal:_ in 33 designs - _Backend:_ B-19
- [ ] **Data** - /attribution
- [ ] **Compute** - Carino-linked; parts sum to compounded return
- [ ] **Build form** - Contribution bars by holding
- [ ] **Build form** - Holding / sector / class toggle
- [ ] **Build form** - Waterfall
- [ ] **Build form** - Allocation vs selection (against own average)
- [ ] **Build form** - Contribution over time (bars + bridge)
- [ ] **Build form** - "Timing and cash flows" line
- [ ] **Interact** - Bar -> holding
- [ ] **Honesty rules** - Labelled relative to the portfolio's own average; group selection spread not zero-sum
- [ ] **SC-1..5 pass**

### PF-04 Monthly returns  [N: new backend work]
_Signal:_ in 32 designs - _Backend:_ B-13
- [ ] **Data** - /performance/calendar
- [ ] **Compute** - monthly from history
- [ ] **Build form** - Year x month heatmap
- [ ] **Build form** - Table view
- [ ] **Build form** - Win/loss calendar with hit rate
- [ ] **Build form** - Seasonality (average per month) row
- [ ] **Interact** - Cell hover -> value; click -> chart range
- [ ] **Honesty rules** - Partial current month hatched; sparse years flagged
- [ ] **SC-1..5 pass**

### PF-05 Returns by period  [N: new backend work]
_Signal:_ in 20 designs - _Backend:_ B-12
- [ ] **Data** - /performance/periods
- [ ] **Build form** - Table with benchmark and excess
- [ ] **Build form** - Ladder bars
- [ ] **Build form** - 8-window mini sparkline + bar comparison
- [ ] **Build form** - Dual-bar view
- [ ] **Honesty rules** - Unfillable periods disabled
- [ ] **SC-1..5 pass**

### PF-06 Risk-adjusted metrics  [P: partly supported]
_Signal:_ in 20 designs - _Backend:_ B-16, B-17
- [ ] **Data** - analytics + rolling series
- [ ] **Compute** - risk-free rate stated
- [ ] **Build form** - Stats grid (CAGR, vol, Sharpe, Sortino, Calmar, max drawdown, beta, alpha)
- [ ] **Build form** - Rolling Sharpe / vol / beta mini charts
- [ ] **Build form** - Small instrument gauges
- [ ] **Interact** - Window selector
- [ ] **Honesty rules** - Minimum-window refusal
- [ ] **SC-1..5 pass**

### PF-07 Income received  [N: new backend work]
_Signal:_ in 17 designs - _Backend:_ B-32
- [ ] **Data** - income ledger
- [ ] **Build form** - Monthly bars
- [ ] **Build form** - Ranked payer list
- [ ] **Build form** - Radial income wheel
- [ ] **Honesty rules** - Received only, never estimates
- [ ] **SC-1..5 pass**

### PF-08 Key numbers strip  [S: supported today]
_Signal:_ in 14 designs
- [ ] **Data** - /performance
- [ ] **Build form** - TWR, MWR, benchmark, excess, max drawdown, vol, Sharpe
- [ ] **Honesty rules** - Both returns shown; gap explained
- [ ] **SC-1..5 pass**

### PF-09 Calendar-year returns  [N: new backend work]
_Signal:_ in 12 designs - _Backend:_ B-13
- [ ] **Data** - /performance/calendar
- [ ] **Build form** - Bars vs benchmark
- [ ] **Build form** - Dumbbell dots
- [ ] **Honesty rules** - Partial years labelled
- [ ] **SC-1..5 pass**

### PF-10 Fees / costs paid  [P: partly supported]
_Signal:_ in 10 designs - _Backend:_ B-43
- [ ] **Data** - transactions.fees, expense ratios
- [ ] **Build form** - Costs by period bars
- [ ] **Build form** - Fund charges vs trading fees split
- [ ] **Honesty rules** - Platform fees only if user enters them
- [ ] **SC-1..5 pass**

### PF-11 Principal vs gains / cash-flow / timing gap  [P: partly supported]
_Signal:_ in 8 designs - _Backend:_ B-18
- [ ] **Data** - /performance + flows ledger
- [ ] **Compute** - bridge sums exactly (asserted)
- [ ] **Build form** - Value bridge (start, deposits, price gain, dividends, interest, fees, now)
- [ ] **Build form** - MWR vs TWR timing-gap card
- [ ] **Build form** - Deposit/withdrawal markers on chart
- [ ] **Honesty rules** - No ledger = explained refusal
- [ ] **SC-1..5 pass**

### PF-12 Best / worst days and seasonality  [N: new backend work]
_Signal:_ in 7 designs - _Backend:_ B-15
- [ ] **Data** - /performance/distribution
- [ ] **Build form** - Best/worst days table
- [ ] **Build form** - Month-of-year seasonality bars
- [ ] **Honesty rules** - Minimum sample
- [ ] **SC-1..5 pass**

### PF-13 Return distribution  [N: new backend work]
_Signal:_ in 6 designs - _Backend:_ B-15
- [ ] **Data** - /performance/distribution
- [ ] **Build form** - Daily-return histogram
- [ ] **Build form** - Tail stats (skew, kurtosis, worst 5%)
- [ ] **Honesty rules** - Minimum sample
- [ ] **SC-1..5 pass**

### PF-14 Up / down capture  [P: partly supported]
_Signal:_ in 2 designs - _Backend:_ B-17
- [ ] **Data** - captureRatios
- [ ] **Build form** - Two capture bars
- [ ] **Build form** - Portfolio-vs-benchmark daily scatter
- [ ] **Honesty rules** - Refuse under 120 overlapping bars
- [ ] **SC-1..5 pass**

---
## Analysis sub-page (21 components)
No favourite design yet - most exposed to the undecided visual direction. Build the components; layout later.

- [ ] AN-LAYOUT Default layout for this sub-page at 1440 and 1920 built from the components below as layout data; order chosen by the UX spec (Phase 4).
- [ ] AN-EMPTY Whole-page empty, one-holding and thin-data renderings verified.

### AN-01 Scenario lab / stress / what-if (most common)  [P: partly supported]
_Signal:_ in 34 designs - _Backend:_ B-53
- [ ] **Data** - /stress, /stress/shock, /scenarios
- [ ] **Compute** - stress reports coverage; unmapped holdings beta-estimated and flagged
- [ ] **Build form** - Preset scenario cards
- [ ] **Build form** - Selected-scenario per-holding impact table
- [ ] **Build form** - Build-your-own shock sliders with live impact
- [ ] **Build form** - Market-move simulator (beta-based)
- [ ] **Build form** - Currency sensitivity
- [ ] **Build form** - "The Bill" summary (loss in GBP, recovery time, what held up)
- [ ] **Build form** - Multi-factor macro sliders (rates, USD, oil, AI capex, China) - only if a model is defensible
- [ ] **Interact** - Slider drag updates live; preset buttons
- [ ] **Honesty rules** - Beta-based limitation stated; macro-factor sliders blocked otherwise
- [ ] **SC-1..5 pass**

### AN-02 Concentration  [S: supported today]
_Signal:_ in 30 designs - _Backend:_ B-51
- [ ] **Data** - portfolio.js + new arrays
- [ ] **Compute** - HHI, effective N
- [ ] **Build form** - Rank bands
- [ ] **Build form** - Lorenz curve + HHI
- [ ] **Build form** - Pareto bars + cumulative line
- [ ] **Build form** - Top-5 / effective-N tiles
- [ ] **Build form** - Policy-breach banner
- [ ] **Honesty rules** - Banner only when a cap is actually breached
- [ ] **SC-1..5 pass**

### AN-03 Correlation / move together  [S: supported today]
_Signal:_ in 27 designs
- [ ] **Data** - /correlation*, /portfolio/correlations
- [ ] **Compute** - joined on date; null not 0
- [ ] **Build form** - Most/least correlated pairs with combined weights (disjoint lists)
- [ ] **Build form** - Full matrix heatmap (Risk page)
- [ ] **Build form** - Windows drift (3m/6m/1y/all)
- [ ] **Build form** - Calm vs stressed split
- [ ] **Build form** - Blocs (clusters)
- [ ] **Build form** - Independent-bets dial
- [ ] **Build form** - Crowded-pairs list
- [ ] **Interact** - Pair click -> both holdings
- [ ] **Honesty rules** - Insufficient overlap = null; assessed/unassessed holdings named
- [ ] **SC-1..5 pass**

### AN-04 Fund overlap / look-through  [S: supported today]
_Signal:_ in 25 designs
- [ ] **Data** - /xray*, /rebuild/exposure
- [ ] **Compute** - floors, exact vs floor markers
- [ ] **Build form** - Overlap matrix
- [ ] **Build form** - Bubble grid
- [ ] **Build form** - Pairwise detail
- [ ] **Build form** - "Held twice over" list
- [ ] **Build form** - Look-through top companies
- [ ] **Build form** - As-labelled vs in-truth paired bars
- [ ] **Build form** - De-duplicate suggestion (advisory)
- [ ] **Honesty rules** - Coverage bar draws undisclosed remainder
- [ ] **SC-1..5 pass**

### AN-05 Health scorecard (axes)  [X: blocked / needs decision]
_Signal:_ in 24 designs
- [ ] **Data** - /portfolio/scorecard
- [ ] **Build form** - See OV-06, expanded with attribution lists
- [ ] **Honesty rules** - D-03
- [ ] **SC-1..5 pass**

### AN-06 Factor / style exposure (liked)  [X: blocked / needs decision]
_Signal:_ in 21 designs, liked x1 - _Backend:_ B-56
- [ ] **Data** - new factor engine
- [ ] **Compute** - regression on factor-proxy ETFs with R-squared
- [ ] **Build form** - Radar
- [ ] **Build form** - Four-axis dumbbell vs benchmark
- [ ] **Build form** - Style box (size x style)
- [ ] **Build form** - Tilt bars
- [ ] **Honesty rules** - D-07; refuse low fit; method statement
- [ ] **SC-1..5 pass**

### AN-07 Sector exposure vs benchmark  [X: blocked / needs decision]
_Signal:_ in 21 designs - _Backend:_ B-55
- [ ] **Data** - /xray/sectors + proxy ETF composition
- [ ] **Build form** - Paired bars you vs proxy
- [ ] **Build form** - Active weights
- [ ] **Build form** - Gaps (sectors absent vs world)
- [ ] **Build form** - Blended sectors from look-through
- [ ] **Honesty rules** - D-05: proxy labelled; never claimed as index weights
- [ ] **SC-1..5 pass**

### AN-08 Rebalance / target vs actual / trades  [S: supported today]
_Signal:_ in 20 designs
- [ ] **Data** - /rebalance, /contribute, /allocate
- [ ] **Build form** - Drift bars
- [ ] **Build form** - Trade plan table
- [ ] **Build form** - Rebalance studio (sliders -> live trades)
- [ ] **Build form** - Full vs new-money-only toggle
- [ ] **Build form** - Policy drift view
- [ ] **Build form** - CSV of advisory list
- [ ] **Honesty rules** - Advisory, never writes holdings; no broker export
- [ ] **SC-1..5 pass**

### AN-09 Allocation / exposure breakdown  [S: supported today]
_Signal:_ in 19 designs - _Backend:_ B-22
- [ ] **Data** - /portfolio
- [ ] **Build form** - Donut with lens
- [ ] **Build form** - Stacked sector bars by position
- [ ] **Build form** - Asset-class mix
- [ ] **SC-1..5 pass**

### AN-10 Currency exposure & home bias  [P: partly supported]
_Signal:_ in 19 designs - _Backend:_ B-52
- [ ] **Data** - lookthrough, holdings
- [ ] **Build form** - Currency donut
- [ ] **Build form** - "What you are really long"
- [ ] **Build form** - Home-bias meter
- [ ] **Build form** - Listing-vs-revenue toggle (revenue side blocked, D-06)
- [ ] **Honesty rules** - Hedge suggestion is advisory only
- [ ] **SC-1..5 pass**

### AN-11 Insights / verdict / what needs attention  [S: supported today]
_Signal:_ in 12 designs - _Backend:_ B-70..B-72
- [ ] **Data** - /briefing, /signals, /brief
- [ ] **Build form** - Flagged-insight cards
- [ ] **Build form** - AI briefing paragraph with Regenerate
- [ ] **Build form** - Priority action
- [ ] **Build form** - Prioritised moves tagged (lowers risk / improves diversification / cost)
- [ ] **Interact** - Regenerate
- [ ] **Honesty rules** - Can conclude nothing notable; no confidence rating
- [ ] **SC-1..5 pass**

### AN-12 Risk level / key risk figures  [S: supported today]
_Signal:_ in 12 designs
- [ ] **Data** - /risk
- [ ] **Build form** - Risk strip
- [ ] **Build form** - Diversification ratio and average correlation
- [ ] **SC-1..5 pass**

### AN-13 Monte Carlo / possible futures  [S: supported today]
_Signal:_ in 11 designs - _Backend:_ B-64
- [ ] **Data** - /montecarlo, /goal
- [ ] **Compute** - bootstrapped from real returns
- [ ] **Build form** - Fan chart (percentile bands)
- [ ] **Build form** - Lucky / base / rough bands with goal line
- [ ] **Build form** - Contribution and horizon sliders
- [ ] **Build form** - Probability-of-goal tile
- [ ] **Interact** - Slider drag
- [ ] **Honesty rules** - Labelled as described sample, not forecast
- [ ] **SC-1..5 pass**

### AN-14 Risk vs return  [P: partly supported]
_Signal:_ in 11 designs - _Backend:_ B-50
- [ ] **Data** - per-holding pairs, /frontier
- [ ] **Build form** - Per-holding scatter (bubble = weight)
- [ ] **Build form** - Efficient-frontier overlay
- [ ] **Build form** - Stock/bond spectrum line
- [ ] **Interact** - Hover -> holding
- [ ] **Honesty rules** - Holdings with short history omitted and named
- [ ] **SC-1..5 pass**

### AN-15 Risk contribution  [S: supported today]
_Signal:_ in 9 designs
- [ ] **Data** - /risk
- [ ] **Compute** - Euler contributions sum to 1
- [ ] **Build form** - Weight vs risk-share paired bars
- [ ] **Build form** - "Money versus risk" stacked pair
- [ ] **SC-1..5 pass**

### AN-16 Geographic exposure (analysis)  [P: partly supported]
_Signal:_ in 7 designs
- [ ] **Data** - -
- [ ] **Build form** - See HD-07
- [ ] **SC-1..5 pass**

### AN-17 Income engine (analysis)  [N: new backend work]
_Signal:_ in 7 designs - _Backend:_ B-33
- [ ] **Data** - income model
- [ ] **Build form** - Forward distributions
- [ ] **Build form** - Income by source
- [ ] **Build form** - Payment calendar
- [ ] **SC-1..5 pass**

### AN-18 Fees & costs (analysis)  [P: partly supported]
_Signal:_ in 5 designs - _Backend:_ B-43
- [ ] **Data** - expense ratios, transactions
- [ ] **Build form** - All-in cost of ownership
- [ ] **Build form** - Fee blend vs a stated reference
- [ ] **Build form** - Duplicate-fund fee saving (only from X-ray duplicates)
- [ ] **Honesty rules** - D-08
- [ ] **SC-1..5 pass**

### AN-19 Cash / liquidity (analysis)  [S: supported today]
_Signal:_ in 3 designs
- [ ] **Data** - mandate + cash
- [ ] **Build form** - Buffer vs mandate
- [ ] **Build form** - Deployable cash
- [ ] **Interact** - -> Allocate
- [ ] **SC-1..5 pass**

### AN-20 News / signals tied to holdings  [P: partly supported]
_Signal:_ in 3 designs - _Backend:_ B-63
- [ ] **Data** - /news/divergence
- [ ] **Build form** - News-sentiment exposure (positive/negative/neutral/no-coverage by weight)
- [ ] **Build form** - Tone vs price divergence panel
- [ ] **Honesty rules** - Thin coverage refused, renders nothing on ordinary days
- [ ] **SC-1..5 pass**

### AN-21 Replay a crisis / historical stress  [S: supported today]
_Signal:_ in 3 designs
- [ ] **Data** - /stress
- [ ] **Build form** - Six historical windows list
- [ ] **Build form** - Modelled path chart
- [ ] **Build form** - Per-class impact
- [ ] **Honesty rules** - Coverage per window reported
- [ ] **SC-1..5 pass**

---
## EX - Extra components found in the audit (not in the 86-component catalogue)

### EX-01 Decisions review / trade journal  [X: blocked / needs decision]
_Backend:_ B-44
- [ ] **Data** - transactions + holdings.thesis
- [ ] **Compute** - description not grade
- [ ] **Build form** - Each past trade with later return vs benchmark over fixed horizons
- [ ] **Honesty rules** - Never a "hit-rate score" that implies skill from tiny samples; minimum count
- [ ] **SC-1..5 pass**

### EX-02 Tax view  [X: blocked / needs decision]
_Backend:_ B-41
- [ ] **Data** - lot engine
- [ ] **Build form** - Realised/unrealised by wrapper
- [ ] **Build form** - Harvestable losses (GIA only)
- [ ] **Honesty rules** - D-04; no tax estimates until decided
- [ ] **SC-1..5 pass**

### EX-03 Rule checks (guardrails pass/fail)  [P: partly supported]
- [ ] **Data** - rebuild mandate
- [ ] **Compute** - each rule pass/fail with the number
- [ ] **Build form** - Mandate constraints checklist (position cap, sector cap, cash buffer, max holdings)
- [ ] **Honesty rules** - Unsatisfiable mandates flagged
- [ ] **SC-1..5 pass**

### EX-04 Momentum & trend strip  [P: partly supported]
- [ ] **Data** - stored bars
- [ ] **Build form** - 6-month sparkline per holding in a strip
- [ ] **SC-1..5 pass**

### EX-05 Goal planner  [P: partly supported]
_Backend:_ B-64
- [ ] **Data** - /goal
- [ ] **Build form** - Target amount/year form
- [ ] **Build form** - Required monthly contribution
- [ ] **Interact** - Edit
- [ ] **Honesty rules** - Refuse when inputs missing
- [ ] **SC-1..5 pass**

### EX-06 Notes lane (personal dated notes on calendar and charts)  [P: partly supported]
- [ ] **Data** - research_notes pattern
- [ ] **Build form** - Add/edit/delete notes shown on calendar and price charts
- [ ] **SC-1..5 pass**

### EX-07 "Explain this figure" popover (every derived number)  [C: client-side only]
_Backend:_ B-01
- [ ] **Data** - response provenance
- [ ] **Build form** - Method, source, window, coverage
- [ ] **Interact** - Hover/focus/keyboard
- [ ] **Honesty rules** - Mandatory on derived figures
- [ ] **SC-1..5 pass**

### EX-08 Export-to-broker button  [X: blocked / needs decision]
- [ ] **Data** - -
- [ ] **Build form** - (rejected: CSV of advisory list only)
- [ ] **Honesty rules** - No broker integration; cannot verify
- [ ] **SC-1..5 pass**

---
## DUP - One component, several homes
Build once, place several times (compact variants share the same engine and tests):
- [ ] Concentration: OV-14 (snapshot), HD-16 (compact), AN-02 (full). Verified to use one shared component/engine.
- [ ] Income / dividends: OV-07, HD-08, PF-07 (received), AN-17 (forward). Verified to use one shared component/engine.
- [ ] Allocation / composition: OV-02, HD-09, AN-09. Verified to use one shared component/engine.
- [ ] Geographic exposure: OV-17, HD-07, AN-16. Verified to use one shared component/engine.
- [ ] Health scorecard: OV-06, AN-05 (same five axes, no grade). Verified to use one shared component/engine.
- [ ] Fees: HD-17, PF-10, AN-18. Verified to use one shared component/engine.
- [ ] Watchlist: OV-21, HD-21. Verified to use one shared component/engine.
- [ ] Add position: OV-16, HD-14. Verified to use one shared component/engine.
- [ ] Cash: OV-09, HD-02, AN-19. Verified to use one shared component/engine.
- [ ] News: OV-08, HD-19, AN-20. Verified to use one shared component/engine.

---
## DONE - Portfolio page complete when
- [ ] Every component above is implemented on a real endpoint, deferred with a written reason, or rejected with a cited principle.
- [ ] Every visual form VF-01..29 exists once and is reused (no per-page copies).
- [ ] SC-1..5 pass for every component in three themes.
- [ ] No fabricated data: fixtures are shaped from real responses; nothing US/USD sample data remains.
- [ ] PX-09 regression proof is green.
- [ ] The four sub-pages can be re-arranged and re-themed by editing layout data and tokens only.
