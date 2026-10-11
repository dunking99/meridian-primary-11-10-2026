# Meridian UI/UX Build Checklist

Drafted 2026-09-29 from a fresh read of both folders: `Meridian-Primary` (the app)
and `UI-Design/UI-Design-Editable` (the design-selection workbench). Written to be
executed by an autonomous Claude Code session (e.g. Opus 5.5) working through it
phase by phase, with the owner (Hugo) reviewing at phase boundaries.

**How to read this file.** Every item has an ID, a checkbox and a "Done when"
clause. "Done when" means *demonstrated*, not asserted: test output, a
screenshot from a real browser run, or a query result, pasted into the run log.
Items marked **[DECISION]** must not be resolved by the executing session - stop
and ask (section 1 lists them all with a recommended default).

**Provenance caveat.** Coverage statuses in section 3 were derived from route
names, function names and a handful of source reads. They are a *starting map*,
not verified fact. Phase 1 exists to verify every row before any build work
relies on it.

---

## 0. Standing rules for the whole run

### 0.1 Guardrails (non-negotiable)
- [ ] **G-01 meridian.db is never opened by any test, script or dev server.** All
  work uses throwaway DBs via `MERIDIAN_DB=/tmp/<name>.db` (the repo's existing
  convention). Done when: the run log contains no path to the real `meridian.db`.
- [ ] **G-02 Backups exist before anything starts** (see P0-01..P0-04).
- [ ] **G-03 Merge gate.** Merging to `main` reaches Hugo's Windows machine within
  5 minutes via auto-update. No merge unless: (a) every relevant `scripts/test-*.mjs`
  passes, (b) the app boots against a seeded throwaway DB, (c) for UI changes a
  Playwright run has exercised the changed page and screenshots are attached to the
  PR. Otherwise open the PR and leave it unmerged. Done when: every merged PR
  description lists these three checks with evidence.
- [ ] **G-04 One PR per checklist item (or tight cluster).** Branch, commit, push,
  PR, merge, per CLAUDE.md. Commit messages explain *why*. Attribution lines as the
  harness specifies.
- [ ] **G-05 Data honesty rules apply to everything new** (CLAUDE.md): no fabricated
  or placeholder data; missing data renders via `NoData`; every derived figure states
  source and freshness; AI text must be able to say "nothing notable happened"; no
  overall score/verdict where the weighting can't be defended; honest refusal
  (`available:false` + reason) below data thresholds.
- [ ] **G-06 PowerShell rules** if `scripts/windows/*` is ever touched: ASCII only,
  verify with a real `pwsh`, check `$LASTEXITCODE`. Anything needing real Windows
  Task Scheduler is reported as unverifiable, never claimed tested.
- [ ] **G-07 Run log.** Maintain `RUN-LOG.md` (outside git or gitignored) with, per
  item: what changed, evidence, anything surprising. Update at least at each item.
- [ ] **G-08 Stop conditions.** Stop and report if: a test that passed before now
  fails and the cause isn't understood; a change would touch `meridian.db`,
  `scripts/windows/*`, `.gitattributes` or `package.json` dependencies; an item
  needs a [DECISION]; two consecutive attempts at the same fix fail; the repo isn't
  a real git clone.
- [ ] **G-09 Phase gates.** At the end of each phase, stop, post a summary (done,
  skipped, surprises, proposed changes to the plan) and wait for Hugo before the
  next phase. The only exception: Phase 1 -> Phase 2 may proceed if Phase 1 finds no
  [DECISION] blockers.
- [ ] **G-10 No scope creep.** Ideas found along the way go into `IDEAS.md`, not
  into the current PR.

---

## 1. What has actually been agreed, and what has not

### 1.1 Evidence (read from `meridian-data.json`, 2026-09-29)
There is **no finished layout**. The saved templates are exploratory drafts (Overview
16 blocks, Holdings 9, Performance 15, Analysis empty), full of overlapping duplicates
and stray unlabelled boxes. They are a record of experiments, not a spec. What *is*
signal:

1. **Favourite designs (ranked):** `Claude Fable 5.1 Max` (light "Paper/Ink" editorial,
   single-scroll pages) > `Claude Opus 5.5 Medium` > `Claude Sonnet 5 High (3)` (third
   for Overview only). Fable 5.1 Max is also the top pick for Performance; Opus 5.5
   Medium is the top pick for Holdings. **Analysis has no favourite at all.**
2. **Box labels Hugo typed himself** (the closest thing to a stated wish list):
   - Holdings: *Allocation Strip*, *Treemap*, *World Map / Globe*, *Holdings Table*.
   - Overview: *Calendar / Dates Coming Up*, *News / Recent Developments*.
   - Performance: *Performance Chart*, *Leaders and Laggards*, *News / Headlines /
     Relevant Developments*.
3. **Liked component pictures (13):** Calendar (x3: Opus 5.5 Medium, GPT 6 Luna Max
   (24), one other), Weight/Allocation Ribbon (x2: Opus 5 Low, Opus 5.5 High), Key
   Info Strip (Fable 5.1 Max), Portfolio Map/Treemap (x4: Opus 5 Low, Opus 5 Medium,
   Opus 5.5 Medium, GPT 6 Luna Max (18)), Geographic Exposure (x2: Opus 5.5 Medium,
   Fable 5.1 Max), Factor/Style Exposure (Fable 5.1 Low).
4. **Saved favourite components (101):** heaviest categories - Coming Up/Calendar
   (27), News (21+), Geographic Exposure (10+5), Allocation/Composition (7), Weight
   Ribbon (4), Portfolio Map (4+1). Notable saved multi-state item: Map/Globe toggle.
5. **The component catalogue** (`finder-data.js`, 86 components, ranked by how many
   designs include them) is the closest thing to a "lists we did". Top of each page:
   - Overview: Key Info (45), Allocation/Composition (44), Coming Up/Calendar (34),
     Top Holdings (31), Leaders & Laggards (29), Health Score (28), Income/Dividends
     (28), News (26), Cash/Liquidity (25), Risk Profile (21), What Changed Today (21),
     Performance Chart (20), Signals/Insights (20).
   - Holdings: Full Table (41), Cash Breakdown (31), Qty/Avg Cost columns (29), Key
     Info Strip (26), Filters/Grouping (25), Portfolio Map (24), Geographic (17),
     Income (17), Weight Ribbon (17), Winners/Losers (13).
   - Performance: Return vs Benchmark (45), Drawdowns (36), Contribution (33), Monthly
     Heatmap (32), Returns by Period (20), Risk-adjusted (20), Income Received (17).
   - Analysis: Scenario Lab (34), Concentration (30), Correlation (27), Fund Overlap
     (25), Health Scorecard (24), Factor/Style (21), Sector vs Benchmark (21),
     Rebalance (20), Allocation (19), Currency/Home Bias (19).
6. **Component audit** (`component-audit/claude-group.md`) covers **only the 17-Claude
   group**; the other groups (DeepSeek, GPT, Qwen, Seed, Others, the 4 component
   galleries, Overview-only) are un-audited. It identified ~10 recurring categories the
   old taxonomy misses (Watchlist, Decisions review, Fees advisor, Tax view, Rebalance
   studio, AI narrative briefing, News-sentiment exposure, Look-through as its own
   component, Factor tilts, Home bias/currency).

### 1.2 What this means
The *set of components* is reasonably settled (the catalogue + Hugo's labels). The
*visual direction* is not, and the *arrangement* is not. The build below therefore
treats layout and visual style as **data and tokens that can change late**, and builds
components that are correct regardless of look.

### 1.3 Decisions the executing session must NOT make - ask Hugo
Each has a recommended default; the session proceeds only on an explicit answer.

- [ ] **D-01 What is "Overview"?** The designs' Overview overlaps Meridian's existing
  front pages (What Changed, Briefing) and the Portfolio > Holdings summary strip.
  Options: (a) new Overview page replaces What Changed as front page; (b) Overview is a
  new Portfolio sub-tab, What Changed stays the front page; (c) fold Overview pieces
  into What Changed. *Default: (b).*
- [ ] **D-02 Currency.** Designs are US-persona ($1.27M, NVDA). The app is GBP with
  ISA/SIPP/GIA wrappers. *Default: GBP-first everywhere, no US-persona assumptions,
  pence handled at source (already is).*
- [ ] **D-03 Health "grade".** ~28 designs show a letter grade / overall score. Meridian's
  principles forbid an undefendable weighted score (the scorecard deliberately reports
  five axes, no total). *Default: show the axes and coverage, never an overall grade.*
- [ ] **D-04 Tax features.** Tax view, harvestable losses, CGT estimates. `rebalance.js`
  has CGT; the rebuild pipeline explicitly has none. *Default: show realised P&L and
  wrapper split, defer any tax estimation.*
- [ ] **D-05 "Sector exposure vs benchmark".** No free source publishes index sector
  weights (README, Attribution). *Default: compare against a named proxy ETF's
  published sector split, labelled as such, or against the portfolio's own history; never
  imply true index weights.*
- [ ] **D-06 "Revenue-source" geography lens** (listing vs where revenue is earned).
  No free data source identified. *Default: omit; show listing/domicile lens only.*
- [ ] **D-07 Factor/style tilts** (liked component). Needs a new method (regression
  against factor-proxy ETFs) with R-squared and coverage. *Default: build, with method
  statement and refusal below thresholds - but confirm first.*
- [ ] **D-08 Prescriptive actions** ("Trim NVDA by $28,000", Fix buttons, Add-to-plan).
  Rebuild/Allocate already produce advisory trade lists. *Default: advisory only,
  always sourced from the existing engines, never a free-text recommendation; never
  writes holdings.*
- [ ] **D-09 Theme.** Meridian ships dark + light tokens (`THEMES`). The design work
  leans light/warm for the marketed product. *Default: keep both, build tokens so a
  third "paper" theme is a token set, decide the default later.*
- [ ] **D-10 Layout model.** Fixed pages vs user-arrangeable dashboard (the editor
  canvas idea). *Default: layout-as-data (section 5.6) so both are possible; ship fixed
  first.*
- [ ] **D-11 Devices.** PWA manifest says landscape/desktop. *Default: desktop-first,
  responsive to tablet, phone out of scope for v1.*
- [ ] **D-12 Visual direction.** Undecided. *Default: do not decide; everything below
  works under any direction. Provide Hugo a side-by-side of the working components
  under 2-3 token sets when Phase 5 completes.*
- [ ] **D-13 Merge policy** while Hugo is away (G-03 as written vs open-PR-only).
  *Default: merge only when all G-03 checks pass; otherwise leave open.*
- [ ] **D-14 Macro calendar** (CPI/payrolls/rates) - still no free structured feed.
  *Default: keep the explicit "not covered" statement.*
- [ ] **D-15 Deleting anything** in `UI-Design-Editable` (Next.js node_modules ~3.5GB,
  `.bak` files, sync-conflict files, `Zip Files for Fix`). *Default: never delete;
  produce a list and let Hugo approve.*

---

## 2. Phase 0 - Safety, environment, baseline

- [ ] **P0-01 Back up `meridian.db` (+ `-shm`/`-wal`)** on the Mac copy to a dated
  folder outside the project (checkpoint WAL first via a read-only copy method; do not
  modify the source). Done when: backup opens read-only and `holdings`/`ohlcv` counts
  match the source.
- [ ] **P0-02 Back up `meridian-data.json`** (12.8 MB, the only copy of all design
  decisions) to a dated folder. Done when: checksum matches.
- [ ] **P0-03 Establish which `meridian.db` is authoritative.** CLAUDE.md says the real
  one is on the Windows machine; a 76 MB copy sits on this Mac (last written 20 Sep).
  Ask Hugo which is current. Done when: recorded in the log.
- [ ] **P0-04 Real git clone.** The Mac `Meridian-Primary` folder has no `.git`. Fresh
  `git clone dunking99/Meridian-Primary` into a new working directory, confirm `main`
  builds. Do not manually copy files (CLAUDE.md). Done when: `git status` clean on a
  fresh clone and `npm install` + `npm run server` boot against a throwaway DB.
- [ ] **P0-05 Move checklist/docs into the clone** (`UI-BUILD-CHECKLIST.md`), gitignore
  `RUN-LOG.md`.
- [ ] **P0-06 Baseline tests.** Run every `scripts/test-*.mjs` against seeded throwaway
  DBs (`scripts/seed-dev-db.js`). Record pass/fail counts as the baseline. Done when:
  a table of 11 scripts x assertions passed/failed is in the log. Pre-existing failures
  are recorded, not fixed silently.
- [ ] **P0-07 Baseline UI.** Boot API + Vite against a seeded DB, drive every nav page
  with Playwright, capture one screenshot per page/tab into `baseline-shots/` (gitignored).
  Done when: screenshots exist for all 12 nav pages and every Portfolio and Research tab.
- [ ] **P0-08 Playwright + fixture harness.** Create a reusable harness that boots the
  stack and intercepts Yahoo/Google/SEC calls with fixtures shaped like real responses
  (per CLAUDE.md pattern). Done when: one smoke test runs green in one command.
- [ ] **P0-09 Node version check.** Confirm Node >= 22.5 in the clone environment
  (Mac has v24.14). Note Windows runs whichever Hugo installed; flag if unknown.
- [ ] **P0-10 Freeze list.** Record the current line counts, route count (140), engine
  file count, and table count so drift is measurable.

**Phase 0 gate:** report to Hugo (G-09).

---

## 3. Phase 1 - Gap audit (component x capability matrix)

Goal: for every component in the catalogue, verify what the backend provides today and
what is missing. This produces the work list for Phase 2. **Do not build in this phase.**

### 3.1 Method
- [ ] **P1-01** For each component below, open the relevant engine/route, run it against
  a seeded DB, and record: endpoint(s), response shape, freshness/provenance fields,
  coverage/`available:false` behaviour, and any per-call cost. Update the Status
  column with evidence.
- [ ] **P1-02** Write results to `docs/component-coverage.md` (a table, one row per
  component) plus `docs/component-coverage.json` (machine-readable, used by later phases
  and by the frontend to know what is wired).
- [ ] **P1-03** Verify each "Rejected/Decision" row against section 1.3 and 9.

Status key: **S** supported by existing routes; **P** partly supported (small addition
needed); **N** new backend work; **X** blocked/rejected by a principle or missing free
data; **C** client-side only.

### 3.2 Preliminary map - Overview (27)
| Component | Prelim | Basis / what's missing |
|---|---|---|
| Key Info (headline numbers) | S | `/portfolio`, `/performance`, snapshots; day-change uses API prev-close |
| Allocation / Composition (lenses, sunburst) | P | breakdowns exist by sector/geo/class/wrapper/account/currency; sunburst needs a hierarchy endpoint (class > sector > holding) |
| Coming Up / Calendar | P | `/calendar` = earnings + ex/pay dates + ISA deadline; needs per-event stake (% of book) and 30/60-day windows; macro = D-14 |
| Top Holdings / Largest Positions | S | `/portfolio` |
| Leaders & Laggards / Movers (1D/1M/YTD/1Y, % and GBP) | P | needs multi-window per-holding returns from stored bars |
| Health Score | P/X | five-axis `/portfolio/scorecard` exists; overall grade = D-03 |
| Income / Dividends | N | no dividend ledger, no portfolio-wide received/forward income (known gap in PROJECT_STATE) |
| News / Headlines | S | `/news` (AI relevance/symbols), briefing; "helps/hurts/mixed + % exposure" tag P |
| Cash / Liquidity | S | `cash` table via `/portfolio` |
| Risk Profile (dial + figures) | P | `/risk` has vol/VaR/beta/DD; dial "vs your comfort band" needs stored comfort band (mandate exists in rebuild) |
| What Changed Today / Contribution | P | day contribution = weight x day return per holding; check `/changes` and attribution |
| Performance Chart (vs benchmark) | P | needs dated portfolio-vs-benchmark series endpoint; reconstructed vs recorded must be labelled |
| Signals / Insights / Pulse | S | `/briefing`, `/signals` |
| Concentration | S | `portfolio.js` concentration metrics |
| Recent Activity / Transactions | P | `GET /transactions` exists, no UI, no cash-movement feed |
| Add Position / Actions | S | `POST /holdings`, importer |
| Geography / Currency Exposure | P | `/lookthrough` (listing venue), currency by holding; look-through currency P |
| Sector Performance / Heatmap | P | Markets sector ETFs exist; portfolio-weighted sector move N-small |
| Benchmark / Alpha Stats | P | beta/alpha/TE/capture in `analytics.js`; expose per-benchmark |
| Asset Research (single stock) | S | Research page |
| Watchlist | S | `/watchlist` |
| Accounts | P | wrapper/account on holdings; per-account totals; ISA allowance tracker N (needs contribution ledger by wrapper) |
| Goal / Target Progress | P | `/goal` exists; no persisted goal |
| Period Returns / Range Row | N-small | from bars/snapshots |
| Alerts | S | alerts + signals |
| Contributors vs Detractors | S | attribution |
| Plain-English Summary | S | composed narrative (Research) / AI brief - must keep "nothing happened" |

### 3.3 Preliminary map - Holdings (24)
| Component | Prelim | Basis / what's missing |
|---|---|---|
| Full Holdings Table | S | `/portfolio`, `/holdings` |
| Cash Breakdown | S | cash by account/currency |
| Quantity / Avg Cost columns | S | on `holdings` |
| Key Info Strip | S | |
| Filters / Grouping | C | client-side over existing fields |
| Portfolio Map / Treemap (colour by day / drift) | S | data exists; drift needs target weights (column exists) |
| Geographic Exposure (map/globe) | P | listing-venue look-through exists; map geometry is a frontend asset |
| Income | N | see Overview |
| Weight / Allocation Ribbon (vs target) | S/P | target per holding exists; asset-class targets? verify |
| Winners / Losers | S | |
| 52-Week Range column | P | from bars; batch endpoint |
| Allocation vs Target | P | target field + `/rebalance` |
| Download / Export CSV | P | Backup exports exist; per-table export is client-side (C) |
| Add Position | S | |
| Trend column (30D sparkline) | P | `/history/batch` closes-only exists |
| Concentration | S | |
| Fees / Drag | P | expense ratios stored (scorecard cost axis); GBP annual drag N-small; platform fees not stored |
| Look-Through Exposure | S | `/xray` |
| News (per holding) | S | |
| Position Detail Panel | S | `HoldingSidePanel` + `/portfolio/holding` |
| Watchlist | S | |
| Up / Down Today Ribbon | S | |
| Closed / Realised Positions | N | `transactions` has side/qty/price/fees/wrapper, no lot matching, no realised-P&L view |
| Trade Ideas | X/D-08 | advisory only, from Allocate/Rebuild |

### 3.4 Preliminary map - Performance (14)
| Component | Prelim | Basis / what's missing |
|---|---|---|
| Return Chart vs Benchmark | P | see Overview; selectable benchmark |
| Drawdowns / Worst Drops | P | drawdown series in `analytics.js`; episodes table (start/trough/recovery/depth) N-small |
| Contribution / Attribution | S | `/attribution` (Carino-linked, grouping by holding/sector/class) |
| Monthly Returns heatmap | N-small | from reconstructed/snapshot history |
| Returns by Period | N-small | 1W/1M/3M/6M/YTD/1Y/3Y/ITD |
| Risk-Adjusted Metrics | P | Sharpe/Sortino/Calmar/vol in analytics; rolling variants N-small |
| Income Received | N | no ledger |
| Key Numbers Strip | S | |
| Calendar-Year Returns | N-small | |
| Fees / Costs Paid | P | `transactions.fees`; ongoing fund costs from expense ratios |
| Principal vs Gains / Cash-Flow / Timing Gap | P | `/performance` gives MWR/TWR/timing gap and a flow ledger; bridge (start + deposits + gains = now) N-small |
| Best & Worst Days / Seasonality | N-small | |
| Return Distribution | N-small | histogram + tail stats |
| Up / Down Capture | P | `captureRatios` exists, not exposed |

**Honesty note for all Performance items:** history is a fixed-weight reconstruction
unless a cash-flow ledger exists. Every series must carry a `basis` field
(`reconstructed` | `recorded`) and the UI must show it.

### 3.5 Preliminary map - Analysis (21)
| Component | Prelim | Basis / what's missing |
|---|---|---|
| Scenario Lab / Stress / What-If | S/P | `/stress`, `/stress/shock`, `/scenarios`; multi-factor macro sliders (rates/USD/oil) not supported - beta-based only |
| Concentration (bars, Lorenz, Pareto, HHI) | S | metrics exist; Lorenz/Pareto series N-small |
| Correlation / Move Together | S | `/correlation*` (very complete) |
| Fund Overlap / Look-Through | S | `/xray*`, rebuild exposure |
| Health Scorecard | S/X | axes yes, grade D-03 |
| Factor / Style Exposure | N/D-07 | no engine, method unproven |
| Sector Exposure vs Benchmark | P/D-05 | `/xray/sectors` blended; benchmark sectors D-05 |
| Rebalance / Target vs Actual / Trades | S | `/rebalance`, `/allocate`, `/contribute`; "full vs new-money-only" toggle = existing endpoints |
| Allocation / Exposure Breakdown | S | |
| Currency Exposure & Home Bias | P | UK home bias = share in GBP/UK listings; look-through currency P |
| Insights / Verdict / What Needs Attention | S | briefing + signals |
| Risk Level / Key Risk Figures | S | `/risk` |
| Monte Carlo / Possible Futures / Projection | S | `/montecarlo`, `/goal` (bootstrapped) |
| Risk vs Return scatter | P | per-holding return/vol pairs N-small |
| Risk Contribution | S | |
| Geographic Exposure | S/P | |
| Income / Dividends | N | |
| Fees & Costs | P | |
| Cash / Liquidity | S | |
| News / Signals tied to holdings | S | |
| Replay a Crisis | S | six historical windows in `config.js` |

### 3.6 Phase 1 extra checks
- [ ] **P1-04 New-category triage** (from the audit's list): Watchlist w/ alerts, Decisions
  review/trade journal, Fees advisor, Tax view, Rebalance studio, AI narrative briefing,
  News-sentiment exposure, Look-through component, Factor tilts, Home bias/currency. For each:
  keep / defer / reject with the principle cited. Done when: a row per category in
  `docs/component-coverage.md`.
- [ ] **P1-05 Freshness inventory.** For every input the UI will show, record where it comes
  from (Yahoo, EDGAR, FT, stored bars, user-entered) and its update cadence, so provenance
  labels are accurate. Done when: a source map exists.
- [ ] **P1-06 Volume/performance inventory.** Measure response time and payload size of
  every endpoint the pages will call, on a realistic seeded DB (12 years x ~40 symbols).
  Flag anything over 300 ms or 500 KB. Done when: a table is in the log.
- [ ] **P1-07 Route-count and doc drift.** Reconcile README (84 vs 140 routes),
  PROJECT_STATE (98 routes/17 engines) against reality. List doc fixes for Phase 8.

**Phase 1 gate:** post the coverage table and the list of [DECISION] blockers.

---

## 4. Phase 2 - Backend: data contracts and new engines

Principles for every item: engine in `server/engines/`, thin route in `server/index.js`,
a `scripts/test-<name>.mjs` with assertions whose answers are known analytically *before*
the engine runs (repo convention), `available:false` + `reason` below thresholds, a
`coverage`/`basis`/`asOf` block on every response, null never 0.

### 4.1 Shared response contract
- [ ] **B-01 Define the panel contract**: `{ available, reason?, asOf, source, basis?,
  coverage?:{share,missing:[...]}, data }`. Document in `docs/api-contract.md`.
- [ ] **B-02 Retrofit new endpoints only** (do not rewrite existing ones) to that contract.
  Done when: every new route in this phase returns it, verified by a contract test.
- [ ] **B-03 Contract test** `scripts/test-contract.mjs`: hits every new route against a seeded
  DB and empty DB; asserts shape, no NaN/undefined, and `available:false` (not 500) on empty.

### 4.2 Performance series (reconstructed/recorded, benchmark-aware)
- [ ] **B-10 `GET /performance/series`** - dated portfolio value/return series rebased to
  100 alongside a chosen benchmark, joined **on date**, with `basis`. Done when: test asserts
  date-join (a benchmark with missing days still aligns) and that portfolio == benchmark
  yields a flat relative line.
- [ ] **B-11 Benchmark selector**: allowed list (config), default `GBP_BENCHMARK`, refuse
  unknown symbols with a reason. Done when: three benchmarks return series over the same dates.
- [ ] **B-12 `GET /performance/periods`** - 1W/1M/3M/6M/YTD/1Y/3Y/ITD returns for portfolio
  and benchmark, each with the bars actually available; refuse a period the history can't fill
  (never label 19 bars "1Y"). Test vs closed-form numbers.
- [ ] **B-13 `GET /performance/calendar`** - monthly and calendar-year returns (heatmap +
  bars), partial current period flagged as partial.
- [ ] **B-14 `GET /performance/drawdowns`** - full underwater series + episode table
  (peak date, trough date, depth, recovery date/days, current). Test on a series with a known
  two-episode shape.
- [ ] **B-15 `GET /performance/distribution`** - daily return histogram, best/worst days,
  tail stats, hit rate; min-sample refusal.
- [ ] **B-16 Rolling metrics** - rolling vol/Sharpe/beta series (window param, min windows).
- [ ] **B-17 Capture ratios & alpha/beta exposed** per benchmark via the existing
  `captureRatios`/`beta`/`alpha`; join on date, refuse < 120 overlapping bars (existing rule).
- [ ] **B-18 Value bridge** `GET /performance/bridge` - start value + net deposits + market
  gain (+ income once B-30 exists) = now, from the flow ledger; explicit "no ledger" refusal.
  Test: 100 in, 10 gain -> bridge sums exactly.
- [ ] **B-19 Contribution over time** (period buckets) building on `attribution.js`; keep the
  Carino identity tests green and add a bucketed-sum identity.

### 4.3 Holdings-page data
- [ ] **B-20 `GET /portfolio/holdings/enriched`** - one call: qty, avg cost, price, day
  change, weight, target weight, drift, 52-week low/high/position, 30-day closes, fees drag,
  wrapper/account, type, and per-row coverage. Replaces N round trips. Test with a holding
  that lacks bars (row present, fields null, reason given).
- [ ] **B-21 Multi-window per-holding returns** (1D/1W/1M/YTD/1Y) for leaders/laggards,
  with the benchmark-relative value.
- [ ] **B-22 Composition hierarchy** `GET /portfolio/composition?lens=` - class > sector >
  holding tree with weights summing to 1 (test asserts), lens = class/sector/region/wrapper/
  account/currency.
- [ ] **B-23 Target weights**: confirm per-holding target CRUD; add **asset-class targets**
  if absent (decide with D-04/D-08 context); drift endpoint feeding ribbon/treemap colouring.
- [ ] **B-24 Cash breakdown** endpoint (by account/wrapper/currency, GBP-converted, with FX
  rate provenance/date).
- [ ] **B-25 Export helpers** (server): none needed if client-side; otherwise `GET
  /portfolio/export?table=&format=csv` with UTF-8, GBP formatting explicit.

### 4.4 Income and dividends (biggest missing capability)
- [ ] **B-30 Dividend ledger design** - decide storage: new `income_events` table
  (date, symbol, amount, currency, account, kind: dividend/interest/distribution, source:
  entered/imported/estimated). **Never `estimated` rows in received totals.** Additive
  migration only (`CREATE TABLE IF NOT EXISTS`), per db.js convention.
- [ ] **B-31 Ingest paths**: manual entry; importer support for dividend rows (importer
  already recognises `div`); cash-flow link. Preview-then-apply like the importer.
- [ ] **B-32 Received income** report by period/holding/account; provenance per row.
- [ ] **B-33 Forward income (estimate, clearly labelled)** from dividend history x current
  quantity (Yahoo `fetchCorporateActions`), trailing-12-month yield, upcoming ex/pay dates
  from calendar. Shown as an *estimate from history*, coverage = share of book with a
  usable dividend record. Test on synthetic quarterly payer: TTM and forward match by hand.
- [ ] **B-34 Payment calendar** = B-33 dated events + calendar engine.
- [ ] **B-35 Income by source / concentration of income** (top payers, share).

### 4.5 Activity, realised P&L, fees
- [ ] **B-40 Transactions feed** with cash movements merged (deposits/withdrawals from
  `cash_flows`), filterable, paginated.
- [ ] **B-41 Realised P&L engine.** Lot matching per holding. Start with average-cost;
  **[DECISION D-04]** whether to implement UK share-matching (same-day, 30-day, Section 104)
  for GIA. ISA/SIPP realised gains are not taxable - show but flag. Test with hand-worked
  sequences incl. partial sells and fees.
- [ ] **B-42 Closed positions view** data: entry/exit dates, holding period, realised P&L,
  fees, hit rate. Coverage note when history predates the transaction log.
- [ ] **B-43 Fees & costs**: `transactions.fees` totals by period, fund ongoing-charge GBP
  drag (expense ratio x value), platform fee input (optional, user-entered), 
  "what you would pay at the cheapest equivalent" **only** where the equivalent is a
  duplicate found by X-ray (never a free-text recommendation; D-08).
- [ ] **B-44 Decisions review (optional, D-08)**: for each transaction, subsequent return of
  that symbol vs benchmark over fixed horizons, presented as description not grade.

### 4.6 Risk/analysis additions
- [ ] **B-50 Risk vs return per holding** pairs (annualised return, vol, weight) with
  min-history refusal per holding.
- [ ] **B-51 Concentration series**: Lorenz/Pareto cumulative-weight arrays + HHI/effective N
  (metrics exist; add arrays).
- [ ] **B-52 Home-bias / currency look-through**: share by listing, by currency, UK share of
  look-through where fund geography is disclosed; coverage bar (X-ray rules: floors not
  estimates).
- [ ] **B-53 Stress: multi-factor what-if** - only if D-07-style method can be defended;
  otherwise keep beta-based and label it. Custom shock endpoint exists (`/stress/shock`).
- [ ] **B-54 Risk comfort band**: persist a user "risk tolerance" (link to rebuild mandate),
  return vol/VaR relative to it. No invented "risk score 58/100".
- [ ] **B-55 Sector-vs-benchmark (D-05)** using a proxy ETF composition with source label.
- [ ] **B-56 Factor/style tilts (D-07)** if approved: regression of portfolio and holdings on
  factor-proxy ETF returns, R-squared reported, refuses low fit, method statement in response,
  tests against constructed series with known loadings.

### 4.7 Overview/briefing/news/calendar
- [ ] **B-60 Overview aggregate** `GET /overview` (D-01): headline strip, today's move,
  contributors, leaders/laggards, allocation, next-30-days events, top news touching holdings,
  briefing top items - one call, each block independently degradable.
- [ ] **B-61 Calendar stake weighting**: event value-at-stake as % of book, window selector,
  income amounts from B-33 where known, ISA/tax-year dates.
- [ ] **B-62 News-to-holding exposure**: per story, tagged holdings, combined weight, sentiment
  direction; "no linked story" state for movers (so a mover's one-line "reason" is only shown
  if a real linked story exists).
- [ ] **B-63 News sentiment exposure** aggregate (positive/negative/neutral/no-coverage by
  weight) with the existing thin-coverage refusal rules.
- [ ] **B-64 Goal**: persist a user goal (target, date, contributions); `/goal` probability
  reads it; progress = current vs glide path; refusals when inputs missing.
- [ ] **B-65 Accounts/ISA allowance** (UK): contributions by wrapper per tax year from
  `cash_flows` (needs wrapper on flows - check/add), allowance remaining. Label rates as
  configurable constants with the tax year they apply to.
- [ ] **B-66 Watchlist upgrades**: price alerts on watchlist symbols created inline; per-item
  news/calendar hooks.

### 4.7b AI text
- [ ] **B-70 Every AI text endpoint keeps the "nothing happened" rule**; add tests with quiet
  fixtures asserting a short null-ish answer is accepted and stored.
- [ ] **B-71 "Regenerate" support** for briefing/narrative with request de-dup and a cost cap.
- [ ] **B-72 No confidence ratings** on AI text (rejected component) - assert absent.

### 4.8 Cross-cutting backend
- [ ] **B-80 Caching/perf**: memoise expensive engines per (params, data version) with
  explicit invalidation on sync/holding change; verify endpoints under budgets from P1-06.
- [ ] **B-81 Batch/summary endpoints** where a page would otherwise fire >4 calls.
- [ ] **B-82 Error semantics**: no 500 on empty DB for any new route.
- [ ] **B-83 Data-version header/field** (`dataVersion`) so the UI can cache safely.
- [ ] **B-84 Server-side alerts for the new signals** only via existing `signals.js` kinds; any
  new kind gets the fires/stays-silent test pair.
- [ ] **B-85 Update the seed** (`scripts/seed-dev-db.js` / test worlds) to include dividends,
  transactions with fees, targets, a goal, and a fund with partial composition, so every new
  panel has both populated and thin states to test.

**Phase 2 gate:** report endpoints delivered, tests added (count), refused/deferred items.

---

## 5. Phase 3 - Frontend foundation (no visual decisions)

### 5.1 Structure
- [ ] **F-01 Split `src/App.jsx` (12.6k lines)** into modules with no behaviour change:
  `src/theme/`, `src/api/`, `src/components/` (shared), `src/pages/<page>/`. One PR per page
  extracted, Playwright smoke before/after each (compare against P0-07 baseline shots).
- [ ] **F-02 Keep the "single-file" convenience?** Note the trade-off in the PR; Hugo chose
  one file deliberately. **[Confirm before starting F-01.]**
- [ ] **F-03 API layer** `src/api/`: typed-ish client, one place for base URL, error
  normalisation to the panel contract (B-01), request de-dup, abort on unmount,
  stale-while-revalidate cache keyed by `dataVersion`.
- [ ] **F-04 Per-panel error boundaries** (RebuildErrorBoundary exists; generalise) so one
  failing panel never blanks a page. Done when: a forced throw in one panel leaves siblings.
- [ ] **F-05 Loading/empty/partial/stale states as first-class**: `Skeleton`, `NoData`
  (exists), `PartialCoverage` (bar + named missing), `StaleBadge` (asOf older than threshold),
  `Basis` tag (reconstructed/recorded/estimate).

### 5.2 Tokens
- [ ] **F-10 Extend `THEMES`** (dark/light exist; Portfolio pilot converted) with: chart
  palette (categorical, sequential, diverging - validated for colour-blind safety), semantic
  gain/loss **separate from brand accent** (design requirement from the review), spacing scale,
  type scale, radius, elevation, density, motion durations, focus ring.
- [ ] **F-11 Validate palettes** with the dataviz contrast/colour-blind checker; record results.
  Done when: every text/background pair >= WCAG AA in each theme; gain/loss distinguishable
  under deuteranopia simulation.
- [ ] **F-12 Convert remaining hard-coded colours.** Unthemed pages by hex count: News (82),
  Research tabs (Compare 49, Filings 50), PriceChart (32), Screener (44), What Changed (40),
  Watchlist (25), Risk (25). Convert page by page; Portfolio already themed. Done when: a lint
  script reports 0 literal hex colours outside `src/theme/`.
- [ ] **F-13 Third theme scaffold** ("paper"/light-warm) as a token set only (D-09/D-12) to
  prove a new theme needs no component edits.
- [ ] **F-14 Typography/number formatting utilities**: GBP/pence/sign/percent/compact,
  tabular numerals, locale (en-GB), date formats, timezone, "as of" relative time.

### 5.3 Shared component library (each honours F-05 states)
- [ ] **F-20 Panel/Section/StatTile/StatStrip** (headline numbers)
- [ ] **F-21 RangeSelector + shared period state** (1W...MAX, disables ranges history can't fill)
- [ ] **F-22 Chart primitives**: line/area (with benchmark + basis tag), bar, stacked bar,
  waterfall/bridge, dumbbell, scatter, histogram, heatmap grid, Lorenz/Pareto, sparkline,
  range-track (out-of-range aware, existing), gauge/dial, donut/sunburst, treemap, ribbon,
  radar. Hover/crosshair, keyboard focus, tooltips, no external chart lib dependency for new
  ones unless justified (existing Recharts stays where used).
- [ ] **F-23 Geography visual**: map + globe with a toggle (multi-state), asset bundled locally
  (no CDN), coverage-aware (regions without data shown as unknown, not zero).
- [ ] **F-24 DataTable**: sortable, column chooser, sticky header, sparkline/range/bar cells,
  row selection -> side panel, keyboard nav, CSV export of the visible view, virtualised
  beyond ~200 rows.
- [ ] **F-25 SidePanel/Drawer** (extend `HoldingSidePanel` pattern), **Modal**, **Toast/Undo**,
  **Tabs**, **SegmentedControl/Toggle**, **Popover ("explain this number")** that shows method,
  source, coverage.
- [ ] **F-26 Calendar/Timeline** (date wall, timeline strip, list) - the most-liked component
  family; stake-sized events.
- [ ] **F-27 NewsCard/Briefing card** with materiality dot, tags helps/hurts/mixed + exposure.
- [ ] **F-28 Coverage bar + missing-holdings chips** (X-ray pattern) as one shared piece.
- [ ] **F-29 Provenance footer** on every panel: source, asOf, basis.
- [ ] **F-30 Storybook-lite gallery page** (dev-only route) rendering every shared component in
  populated / thin / empty / error / stale states under each theme - doubles as the visual
  regression surface.

### 5.4 State & interaction infrastructure
- [ ] **F-40 Global filters**: account, wrapper, currency, benchmark, period; URL-synced
  (hash) so views are linkable; applied consistently across panels.
- [ ] **F-41 Cross-highlighting bus**: selecting a slice/tile/row highlights the same holding in
  every visible panel (ribbon -> map -> table), clears on Esc.
- [ ] **F-42 Drill-down conventions**: click tile/row -> holding side panel; click event ->
  Research for that symbol; click news -> filtered News; documented once.
- [ ] **F-43 Command palette** (exists) extended with pages, tabs, holdings, actions
  (add position, snooze alert).
- [ ] **F-44 Keyboard map** documented in-app (`?`).
- [ ] **F-45 Persisted per-viewer UI prefs** (theme, last tab, column choices, collapsed
  sections) in localStorage with try/catch; never for real data.

### 5.5 Quality infrastructure
- [ ] **F-50 Accessibility pass**: landmarks, headings, focus order, aria on charts (text
  alternative summarising the figures), reduced-motion, colour never the only signal.
- [ ] **F-51 Visual regression**: Playwright screenshots per component state per theme against
  stored baselines (thresholded); run in CI-less local script.
- [ ] **F-52 Performance budget**: first meaningful paint of Portfolio < target on seeded 12y
  DB; no page fires > 6 concurrent requests; React profile shows no full-page re-render on
  the 60-second price poll.
- [ ] **F-53 Bundle audit** (Vite build): report size; lazy-load heavy pages (Research, Rebuild).
- [ ] **F-54 PWA/service-worker sanity** (`vite-plugin-pwa` autoUpdate): make sure a stale SW
  can't serve an old bundle against a new API after auto-update. Test the update path.

### 5.6 Layout as data (keeps the visual decision reversible)
- [ ] **F-60 Page layout schema**: `{ page, sections:[{id, component, span, minH, props}] }`,
  rendered by a generic `PageGrid`. Hard-code the default layouts first.
- [ ] **F-61 Import from the editor canvas** (optional): script that converts a
  `meridian-data.json` template (block positions/sizes + `comp` tags) into this schema, so a
  layout Hugo builds in UI-Design-Editable can drive the real page. Untagged blocks are
  reported, never guessed.
- [ ] **F-62 Section registry** mapping component ids to React components and required
  endpoints (from `component-coverage.json`) so a layout referencing an unsupported component
  shows an explained placeholder ("not available: needs income ledger"), never fake data.
- [ ] **F-63 (D-10) user-arrangeable mode** behind a flag, only if approved.

**Phase 3 gate:** show F-30 gallery screenshots under dark/light/paper.

---

## 6. Phase 4 - UX specification (writeable before visuals)

Produce `docs/ux-spec.md` and get Hugo's sign-off on the decisions inside it.

- [ ] **U-01 Information architecture**: final page/tab map reconciling designs'
  Overview/Holdings/Performance/Analysis with Meridian's Briefing, What Changed, Alerts, Risk,
  Research, Portfolio (Holdings/X-Ray/Performance/Analysis/Allocate/Rebuild), Watchlist,
  Screener, Markets, News, Reports, Settings (D-01). Includes what each sidebar item lands on.
- [ ] **U-02 Per-page job statement**: the single question each page answers, and the three
  most important things visible without scrolling.
- [ ] **U-03 Component-to-page assignment** (which of the ~86 go where, in what priority
  order), driven by the catalogue counts + Hugo's labels + coverage matrix; low-value or
  rejected components listed with reasons.
- [ ] **U-04 Default layouts** for each page as layout data (F-60), at 1440 and 1920 widths.
- [ ] **U-05 Interaction rules**: drill-down, cross-highlight, filters, period sync, hover vs
  click, what persists between visits.
- [ ] **U-06 State catalogue**: for each component: loading, empty, partial, stale, error,
  refused - exact wording (British English, plain, no marketing tone, no false reassurance).
- [ ] **U-07 Copy/voice guide**: microcopy for labels, refusals, "nothing notable", method
  statements; consistent units and sign conventions (gain/loss colours never sole signal).
- [ ] **U-08 First-run/onboarding**: empty DB -> import statement / add position / sync;
  what each page shows with 0, 1 and 3 holdings (thin-portfolio behaviour).
- [ ] **U-09 Explainability rules**: which figures get an "explain" popover, what it must
  contain (formula, source, window, coverage).
- [ ] **U-10 Notification/alert UX**: in-app only (README says so); banners, badges, snooze
  flow; what "triggered while closed" looks like on next open.
- [ ] **U-11 Settings & data health UX**: where keys, backups, sync, freshness live.
- [ ] **U-12 Accessibility and keyboard spec** (F-50/F-44).
- [ ] **U-13 Responsiveness spec** (D-11): breakpoints, what collapses.
- [ ] **U-14 Error/offline UX**: server down, Yahoo blocked, key missing, DB locked.
- [ ] **U-15 Performance UX**: what may show stale-then-refresh; when to use skeletons vs
  spinners; poll cadence (currently 60 s).
- [ ] **U-16 Print/report styling** alignment with `reports.js` self-contained HTML.
- [ ] **U-17 Analytics-free/privacy**: confirm no telemetry; keys only in local storage +
  settings table.

**Phase 4 gate:** Hugo reviews the spec (fastest, cheapest place to correct direction).

---

## 7. Phase 5 - Build pages on the foundation

Order chosen by strength of signal from the design work: Holdings first (clearest labels
and likes), then Overview, Performance, Analysis. Each page = separate PR series, each
section a PR. For every section: wire to real endpoint, all states, provenance footer,
Playwright test with populated + thin + empty fixtures, screenshots in three themes.

### 7.1 Holdings (Portfolio > Holdings)
- [ ] **H-01 Key info strip** (value, invested, cash, P&L, day move, return) - existing tiles
  reworked on `StatStrip`; return tile keeps its "reconstruction, not IRR" caveat unless a
  ledger exists.
- [ ] **H-02 Weight/allocation ribbon vs target** with lens toggle (position/class/sector/
  region) and cross-highlighting.
- [ ] **H-03 Treemap** coloured by today's move / drift / total gain (toggle), tile click ->
  side panel.
- [ ] **H-04 Geographic exposure**: map/globe toggle + region list, look-through basis + coverage
  bar, unknown regions shown as unknown.
- [ ] **H-05 Holdings table**: enriched columns (qty, avg cost, price, day, weight, target/
  drift, 52-week range, 30D trend, fees drag), grouping/filters, CSV export, add/edit/delete.
- [ ] **H-06 Winners/losers + up/down ribbon.**
- [ ] **H-07 Cash breakdown** by account/currency with deploy shortcut to Allocate.
- [ ] **H-08 Income** panel (after B-30..B-35) with the estimate/received distinction.
- [ ] **H-09 Closed/realised positions** (after B-41/42).
- [ ] **H-10 Fees/drag** panel.
- [ ] **H-11 Concentration warnings** (existing) integrated.
- [ ] **H-12 Position detail side panel** aligned to new tokens; add news and calendar for the
  holding if absent.
- [ ] **H-13 Look-through summary** teaser linking to X-Ray tab.
- [ ] **H-14 Watchlist strip** (not-yet-owned) linking to Watchlist page.

### 7.2 Overview (per D-01)
- [ ] **O-01 Headline numbers + narrative sentence** (composed, not generated; only from
  present figures).
- [ ] **O-02 Performance chart** vs benchmark with range selector, basis tag, event markers
  optional.
- [ ] **O-03 Today: movers, contribution waterfall, leaders/laggards** with window toggle and
  linked-story reasons only when real.
- [ ] **O-04 Allocation/composition** with lens + sunburst/treemap toggle.
- [ ] **O-05 Risk profile**: existing metrics + comfort-band relation (no invented score).
- [ ] **O-06 Health**: five axes + coverage; no grade (D-03).
- [ ] **O-07 Calendar/"Next 30 days"** (highest-liked family): stake-sized events, filters
  (earnings/dividends/macro-not-covered notice), notes lane optional.
- [ ] **O-08 News touching your book** (+ sentiment exposure summary).
- [ ] **O-09 Signals/Briefing digest** (top N, "nothing notable" state).
- [ ] **O-10 Top holdings, cash & liquidity, concentration snapshot.**
- [ ] **O-11 Goal progress** (after B-64) if the user has set one, otherwise an invitation, not a
  fake bar.
- [ ] **O-12 Alerts strip** (armed/triggered counts).

### 7.3 Performance
- [ ] **PF-01 Key numbers strip** (TWR, MWR, benchmark, excess, max DD, vol, Sharpe).
- [ ] **PF-02 Return chart vs benchmark** with drawdown toggle/underlay.
- [ ] **PF-03 Returns by period** table + ladder.
- [ ] **PF-04 Calendar-year returns** vs benchmark (bars or dumbbell).
- [ ] **PF-05 Monthly heatmap** with seasonality summary; partial months hatched.
- [ ] **PF-06 Drawdowns**: underwater + episodes table + recovery stats.
- [ ] **PF-07 Attribution/contribution** (holding/sector/class toggle) preserving the
  "against its own average" labelling.
- [ ] **PF-08 Value bridge / timing gap**.
- [ ] **PF-09 Risk-adjusted metrics + rolling charts.**
- [ ] **PF-10 Distribution / best-worst days.**
- [ ] **PF-11 Income received** and **Fees/costs paid**.
- [ ] **PF-12 Cash-flow ledger UI** (exists) integrated as the source that turns "reconstructed"
  into "recorded".

### 7.4 Analysis (no favourite design yet - most exposed to D-12)
- [ ] **AN-01 Scorecard axes with attribution** (existing panel, retokened).
- [ ] **AN-02 Correlation** (pairs lists, windows, calm vs stressed, blocs, independent bets).
- [ ] **AN-03 X-Ray / fund overlap / look-through** (existing, retokened).
- [ ] **AN-04 Concentration** (bars, Lorenz/Pareto, HHI).
- [ ] **AN-05 Risk contribution vs weight; risk vs return scatter.**
- [ ] **AN-06 Sector exposure** (D-05), **currency & home bias**, **factor tilts** (D-07).
- [ ] **AN-07 Scenario lab / crisis replay** with custom shock.
- [ ] **AN-08 Projection** (bootstrapped fan) with goal.
- [ ] **AN-09 Rebalance/allocate/rebuild entry** (existing pages, integrated; full vs
  new-money-only).
- [ ] **AN-10 Insights list** from briefing/signals with "nothing notable" state.

### 7.5 Every-page acceptance
- [ ] **PG-01 Each page passes**: F-30 states, keyboard walk, AA contrast in all themes,
  no console errors, request budget, screenshots at 1280/1440/1920.
- [ ] **PG-02 Each page has an empty-portfolio and a one-holding fixture test.**
- [ ] **PG-03 Each figure has a provenance line and, where derived, an explain popover.**

**Phase 5 gate:** a comparison sheet of the four pages under dark / light / paper (D-12).

---

## 8. Phase 6 - Remaining pages adopt the system

- [ ] **R-01 What Changed / Briefing** onto tokens and shared panels.
- [ ] **R-02 Research** (7 tabs): convert `PriceChart`, Compare, Filings, Bull/Bear, Precedents.
- [ ] **R-03 Risk page** consolidation with Analysis (avoid two homes for the same panels;
  decide redirect vs shared component).
- [ ] **R-04 Markets** (7 tabs), **News**, **Screener**, **Watchlist**, **Alerts**, **Reports**,
  **Settings** (Data Health, Backup, Changelog).
- [ ] **R-05 Rebuild/Allocate** visual alignment.
- [ ] **R-06 Command palette + sidebar** final IA (U-01).
- [ ] **R-07 Confirm zero literal hex outside theme** (F-12 lint) and both themes pass a full
  Playwright walk.

---

## 9. Rejected / reshaped components (with reasons)

Recorded so the run never "helpfully" reintroduces them.
- Overall letter grade / 0-100 health or risk score - undefendable weighting (D-03).
- "Confidence: High" on AI text - no calibrated basis.
- "Export to broker" - no broker integration, cannot be verified; CSV of the advisory list
  only.
- Free-text prescriptive actions ("Trim X by $Y") - only engine-derived advisory trades (D-08).
- Revenue-source geography (D-06), benchmark sector weights as if true index data (D-05),
  macro calendar (D-14), options flow / 13F (README: not free).
- Any design's sample data, US tickers, USD amounts, invented reasons per mover.
- Tax estimation (D-04) until decided.
- Live "intraday pulse" charts - no intraday store.

---

## 10. Phase 7 - Design workbench (UI-Design-Editable) housekeeping

Independent of the app build; can run in parallel. Nothing destructive without approval
(D-15).

- [ ] **W-01 Back up + `git init`** the folder with a `.gitignore` for node_modules, `finder-shots`
  (or LFS), logs. First commit = current state.
- [ ] **W-02 Resolve six Syncthing conflict files** (`CLAUDE`, `editor.js`, `favs.js`,
  `finder.html`, `quickpick.js`, `meridian-data`): diff each against the live file, list unique
  content, propose a merge; `meridian-data` conflict copy has older-format Overview/Holdings
  templates and 2 fewer favourites - check for unique favourites/likes before discarding.
- [ ] **W-03 Reorder and refresh `CLAUDE.md`** (newest sections currently first; stale counts:
  63 designs, "11 candidate designs"; node_modules claim incorrect).
- [ ] **W-04 Finish the component audit** for the remaining groups (DeepSeek, GPT, Qwen, Seed,
  Others, 4 component galleries, Overview-only pages) in the same style as
  `claude-group.md`; then consolidate to one clean taxonomy and regenerate `finder-data.js`
  from it (replacing the scripted title-matching noise, e.g. many News/Calendar near-duplicates).
- [ ] **W-05 Tag all 101 saved favourites** with a clean `comp` category (many are
  "Uncategorised"/wrongly typed) so Recommend/Finder work.
- [ ] **W-06 Curate the templates**: remove overlapping duplicates/stray boxes, name each block
  with its component, produce one clean candidate layout per page (Analysis has none). Export
  as layout JSON for F-61.
- [ ] **W-07 Export a "component spec sheet"** from the catalogue + likes: per component, the
  favoured design(s), screenshot, data needed (from coverage matrix). This is the hand-off
  artefact from design to build.
- [ ] **W-08 Decide fate of dead designs** (blank charts, `Math.toRadians`, unbuildable
  Next.js/Postgres projects) - list only; Hugo decides deletion (D-15). Note plaintext local DB
  credentials in `UI-Design-9/10/11/drizzle.local.json` and `UI-Design-23/.env.local` - flag,
  don't share the folder as-is.
- [ ] **W-09 Consolidate start scripts** (`.command` uses 3001/python, `start-all.sh` uses 3000/
  serve) and stop stray dev servers (ports 3000, 4005-4011 currently running).
- [ ] **W-10 Trim `.bak-*` files** into a `_backups/` folder (not deleted).
- [ ] **W-11 Ask-Claude bridge**: keep or retire; if kept, document the watch procedure.

---

## 11. Phase 8 - Docs, release, maintenance

- [ ] **X-01 Update `PROJECT_STATE.md`** (route/engine/table counts, new engines, pages).
- [ ] **X-02 Update `README.md`** (fix 84/140 inconsistency; add new sections in the existing
  voice: what it does, what it refuses to do, how to verify).
- [ ] **X-03 Update `CLAUDE.md`** with anything a fresh session needs (new harness, layout
  schema, decisions taken).
- [ ] **X-04 `docs/api-contract.md`, `docs/component-coverage.md`, `docs/ux-spec.md`** final.
- [ ] **X-05 Test index**: `npm test` aggregator running every `scripts/test-*.mjs` + contract
  + Playwright suite, with a one-line summary. Done when: one command prints pass/fail totals.
- [ ] **X-06 Release checklist for auto-update**: a change that adds a dependency or a DB table
  is listed in the PR body so Hugo knows what the 5-minute update will do (`npm install` runs
  automatically if `package.json` changes).
- [ ] **X-07 Rollback rehearsal** (document only): how `restore-backup.ps1` reverts a bad UI
  release; DB migrations are additive so rollback never needs a DB downgrade.
- [ ] **X-08 Backup automation proposal** for `meridian.db` (currently manual via Settings ->
  Backup): design a scheduled export; implement only after approval (touches user data).
- [ ] **X-09 Final walkthrough report**: every checklist item marked done/deferred/rejected
  with evidence links; list of known limits stated plainly.

---

## 12. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Bad merge auto-deploys to Hugo's machine in 5 min | Med | High | G-03 gate, PR-per-item, rollback script, additive DB changes |
| Real `meridian.db` touched by a test | Low | Severe | G-01, throwaway DBs only, backups P0 |
| Visual direction changes late | High | Med | Tokens + layout-as-data, components independent of look |
| `App.jsx` split introduces regressions | Med | Med | One page per PR, before/after screenshots vs baseline |
| Sandbox passes, Windows fails (history) | Med | High | Windows-specific items flagged unverifiable; no PS changes unless needed |
| Fabricated-looking numbers creep in from design samples | Med | High | G-05, fixtures shaped from real responses, review for US/USD residue |
| Income/realised-P&L engines wrong (money maths) | Med | High | Hand-worked test cases before implementation, refusal on thin data |
| Yahoo changes break enrichers | Med | Med | Existing `NoData`/refusal paths; health page; fixtures |
| Scope explosion (86 components) | High | Med | Coverage matrix + priority order + phase gates + IDEAS.md |
| Syncthing conflicts corrupt design data | Med | Med | W-01/W-02, backups, one-device-at-a-time note |

---

## 13. Suggested order and rough sizing

1. Phase 0 (0.5 day) -> Phase 1 (1 day) -> gate.
2. Phase 2 in this order: B-01..03, B-10..19 (performance, high liked), B-20..25 (holdings),
   B-30..35 (income), B-40..44, B-50..56, B-60..66, B-70..85. (~5-8 days of agent work.)
3. Phase 3 and Phase 4 in parallel (F-01..F-30; U-01..U-17). (~4-6 days.)
4. Phase 5: Holdings -> Overview -> Performance -> Analysis. (~6-10 days.)
5. Phase 6, Phase 7 (parallel), Phase 8.

Sizing is indicative only; the gates matter more than the estimate.

## 14. Definition of done for "UI/UX build complete"
- Every catalogue component is either implemented on a real endpoint with all states,
  deferred with a stated reason, or rejected with a stated principle.
- No fabricated data anywhere; missing data always visibly missing; every figure has
  source/asOf/basis.
- Both themes (and the scaffolded third) pass contrast and colour-blind checks.
- All test scripts + contract + Playwright suite green with one command.
- Docs match code (counts, routes, engines).
- Hugo has signed off the UX spec and the visual direction, and can change the direction by
  editing tokens and layout data.
