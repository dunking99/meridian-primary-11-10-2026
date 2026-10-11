# RUN-LOG — master brief overnight run (started 2026-09-30)

Working in place in `/Users/hugodyson/Meridian-Primary` (no `.git`; changes are listed at the end of this file so they can be diffed against `/Users/hugodyson/Meridian-Primary-backup`).
Backup check: `/Users/hugodyson/Meridian-Primary-backup` exists (listed before starting). OK to proceed.
The real `meridian.db*` is never opened. Every DB used below is under `/tmp/mo/` or `/tmp/*.test.db`.

## 0. Reading confirmations (section 0 of BRIEF-master)

1. **CLAUDE.md** — single-user local app; meridian.db untouchable (no backup, no history); verify for real (Playwright on real API + Vite); no fabricated data, NoData for gaps, every figure sourced; AI text may say "nothing notable"; small why-commits (not possible here: no git).
1. **README.md** — engine map and honesty principles: reconstruction is fixed-weight, not trade-by-trade; X-ray weights are floors never scaled; attribution is against the book's own average; IRR by bisection; correlation joined on date, null not 0; tests use `MERIDIAN_DB` throwaway DBs.
1. **PROJECT_STATE.md** — stale counts (98 routes; code has 140); useful for schema, frontend page list, testing method; code wins.
2. **docs/overnight/overview-meridian.md** — verified bugs: unpriced holding valued £0 silently (`portfolio.js`), day change uses today's value as denominator, calendar refresh only manual, `/goal` Gaussian with invented £100k/7%/15%, two geography answers, unnormalised labels, no dataVersion; section 4 job lists per Overview category; follow it where it differs from checklists.
3. **docs/overnight/layout-spec-fable.md** — Overview v0-fable rows A0..I with spans, layout-as-data file format, placeholder wording table (section 4), v0-medium borrowings (section 5); no grade, GBP, Meridian tokens only.
4. **BRIEF-run1-backend.md** — R1-01..R1-11 (valuation honesty, day-change fix, calendar scheduling, goal store + bootstrap, `/performance/series`, `/performance/periods`, `/portfolio/returns`, `/portfolio/composition`, `/portfolio/labels/check`, `/overview` + dataVersion, contract test + seed); response contract `{available, reason?, asOf, source, basis?, coverage?}`; hand-worked tests first.
5. **BRIEF-run2-overview-ui.md** — hook/view split is a hard rule (hooks return `{status,data,reason,asOf,basis,coverage}`, views never fetch); useApi with abort/dedupe/dataVersion; Skeleton/StaleBadge/BasisTag/ProvenanceFooter/Placeholder/SectionLabel; gallery with six states per component; three size classes; R2-06 re-skin proof with no hook diff.
6. **UI-BUILD-CHECKLIST.md** (read in full) — guardrails G-01..G-10, decisions D-01..D-15 with defaults, backend B-01..B-85, foundation F-01..F-63, rejected components (section 9: no grade, no confidence on AI text, no broker export, no free-text actions).
6. **PORTFOLIO-COMPONENT-CHECKLIST.md** (read in full: PG, PX, VF-01..29, OV-01..27, HD-01..24, PF-01..14, AN-01..21, EX-01..08, DUP, DONE) — each `- [ ]` line is a job; SC-1..5 definitions; PX-01..09 must keep working.
7. **docs/overnight/reference/** — viewed all four JPGs and opened `fable-5.1-max.html` in headless Chromium (Playwright 1.63 from the npx cache, not a project dependency), screenshotting its Overview/Holdings/Performance/Analysis tabs to the scratchpad. Took structure only: hero left + 2x3 tiles; chart 8 cols + health 4; three-up movers/contribution/composition; positions 7 + calendar 5; two-column news with "% of book touched" bars; Holdings = ribbon, treemap + inspector, ledger table, globe + home-bias, income; Performance = 8-figure strip, chart with drawdown underlay, period table + calendar-year dumbbells, contribution bars + worst drops, monthly heatmap; Analysis = briefing band, concentration bars, look-through bars, currency ribbon. Not copied: grade, US tickers, $ figures, headlines, colours, fonts, code.
8. **OVERNIGHT-BRIEF.md** — superseded in scope/order; its rules still apply (copy-DB approach is NOT used here: the master brief forbids opening the real DB at all, so only seeded DBs are used; verification = Playwright populated/thin/empty, 1440 dark+light, console clean).
9. **Code read before building:**
   - `server/index.js` — 140 routes in one `routes` object, handler(bodyOrQuery, query); 500 on throw; boot does memory rebuild, price poll, news, snapshots every 15 min, 5-8am sync window at line ~1654. PORT comes from `config.js` (hard-coded 3001).
   - `server/db.js` + `server/config.js` — schema (holdings has `target_pct`, `acc_dist`, `exchange`, `isin`; cash has `updated_at`; cash_flows lives in performance.js with no wrapper column); `getBars(symbol, from, to)` needs both bounds; `GBP_BENCHMARK='^FTSE'`, `BENCHMARK='^GSPC'`; SCENARIOS (6); WRAPPERS with ISA 20k / SIPP 60k limits.
   - Engines: `portfolio.js` (valuePortfolio, reconstructHistory = intersection of all held symbols' dates, fixed weight, excludes <30 bars), `portfolio-analysis.js` (scorecard with `overall` that must not be shown, correlationPairs, holdingDetail, rangeFromBars), `performance.js` (XIRR bisection, TWR from snapshots, benchmarkReturn), `attribution.js` (Cariño decomposition vs own average, winners/losers), `analytics.js` (primitives incl. drawdownSeries, captureRatios, betaAlpha, riskContributions), `briefing.js` (8 sections, materiality, verdict can be quiet), `signals.js` (6 cross-engine kinds, state), `calendar.js` (Yahoo calendarEvents cache in settings, ISA date, `unresolved`), `lookthrough.js` (venueOf, floors, coverage), `xray.js` (underlying floors, overlaps, sectors), `correlation.js` (date-joined matrix, windows, stress, independence, clusters, redundancies), `stress.js` (six windows, beta fallback flagged), `montecarlo.js` (block bootstrap; goalProbability), `rebalance.js` (wrapper-aware), `allocate.js` (candidate scoring), `newsscore.js` (AI scoring caps).
   - `src/App.jsx` — `THEMES` dark/light tokens + `ThemeContext`/`useTheme` (not exported); `NAV_ITEMS`; `PortfolioPageV2` tabs holdings/xray/performance/analysis/allocate/rebuild with no hash routing; `ReturnTile`, `PortfolioValueChart` (Recharts), `HoldingSidePanel` (fixed drawer, Esc closes), `ScorecardPanel` (shows OVERALL /100 — the new Health component will not), `PerformanceTab` (flow ledger UI), `PortfolioAnalysisPage`, `XRayTab`, `AllocatePage`; shared `Panel`, `NoData` ("——" with reason title), `Sparkline`/`RangeBar` (use literal MK colours, not themed), `CoverageBar`, `Modal`. API base hard-coded `http://localhost:3001` in several places.
   - `src/prices.js` — `/prices` envelope; API base hard-coded 3001.
   - `scripts/test-*.mjs` + `seed-dev-db.js` — convention: refuse if MERIDIAN_DB unset or contains `meridian.db`; `check(label, cond)` counters; worlds seeded by `test-rebuild.mjs SEED_ONLY=1` or per-test seeding; seed-dev-db refuses anything not ending `.test.db`.

## Baseline tests (before any change)

Runner: `/tmp/mo/run-tests.sh` (fresh `/tmp/mo/<test>.db` per script; SEED_ONLY rebuild world where the test header says so).

| script | assertions passed | failed |
|---|---|---|
| test-attribution | 68 | 0 |
| test-briefing | 40 | 0 |
| test-correlation | 107 | 0 |
| test-importer | 102 | 0 |
| test-lookthrough | 52 | 0 |
| test-performance | 43 | 0 |
| test-portfolio-analysis | 48 | 0 |
| test-rebuild | 63 | 0 |
| test-reports | 49 | 0 |
| test-signals | 38 | 0 |
| test-xray | 72 | 0 |
| **total** | **682** | **0** |

## Decisions defaulted (section 4 of the master brief, plus ones forced by the code)

- D-01 Overview is a new first Portfolio sub-tab; What Changed stays the front page.
- D-02 GBP everywhere. D-03 no overall grade (the scorecard's `overall` field is never rendered by new code). "Mover" = unusual for own history (memory z-score) with raw % beside it. Benchmark default `GBP_BENCHMARK` (^FTSE). Geography basis = listing venue (`venueOf`), labelled. Actions = links into Allocate/Rebalance/Rebuild only. Goal inputs supplied by the user, never defaulted. Both existing themes; no third theme.
- PORT: `server/config.js` gains `process.env.MERIDIAN_PORT` override (default stays 3001) so the API can run on 3101. Frontend API base reads `import.meta.env.VITE_MERIDIAN_API` (default stays `http://localhost:3001`) so Vite on 5273 talks to 3101. Default behaviour on Hugo's Windows machine is unchanged.
- Theme access for new code: `ThemeContext` is private to App.jsx and App.jsx must not be split, so App.jsx passes its `THEMES` object and current theme into the new pages as props; new code reads tokens from a small context in `src/shared/`. New chart tokens (categorical palette etc.) are added to `THEMES` in App.jsx (F-10) so no new file contains a literal colour.
- Existing Sparkline/RangeBar/CoverageBar use literal MK colours and are not exported; themed equivalents are written once in `src/shared/` with the same contracts. Originals untouched.
- Existing Performance and Analysis tab content (PX-04, PX-05) is kept, rendered below the new layout-driven page in the same tab, so nothing a user relied on disappears.

## Task log

### Phase A — backend truth and shared data (R1-01…R1-11 + extra B-items)

Evidence: `/tmp/mo/run-tests.sh` after Phase A — all 16 scripts exit 0. Original 11 scripts unchanged at 682/682. New: test-valuation 14, test-series 53, test-goal-calendar 20, test-composition 55, test-contract 390 (532 new assertions).

- **R1-01** `portfolio.js valuePortfolio`: `partial:true` + `excluded:[{symbol,name,qty,reason}]` only when a holding is unpriced; totals unchanged (priced only). Hand-worked: £1,000 priced + one unpriced -> total £1,000, NOPX.L named. Byte-identity: fully priced output compared with the untouched backup engine (`/Users/hugodyson/Meridian-Primary-backup/server/engines/portfolio.js`, loaded against the same throwaway DB) — identical. test-valuation.
- **R1-02** day change = value x pct / (100 + pct); portfolio % over yesterday's total (total - dayChange). Hand-worked: +2% on £1,000 = £19.61, -2% = -£20.41, sum -£0.80, -0.03% on £2,500.80. test-valuation. Surprise: none; briefing and existing tiles read the same fields so they inherit the fix.
- **R1-03** `calendar.refreshCorporateDates` takes an injectable fetcher, returns `unresolved[]`, records `calendar_last_refresh`; called in the 5–8am window (after the history sync, own try/catch) and, not awaited, on `POST /holdings`. Button kept. Stub test: stale + never-seen fetched, fresh skipped (daily TTL), throwing symbol in `unresolved`, no throw. test-goal-calendar.
- **R1-04** new `engines/goal.js`: goal persisted in `settings.user_goal` (target, date, monthly all required, nothing defaulted); `GET/POST/DELETE /goal`; block bootstrap on the reconstruction's own daily returns; refuses under 252 returns. Old `POST /goal` (Gaussian, £100k/7%/15%) removed from index.js. Hand-worked zero-vol case: £1,000 + £100/month at 0.04%/day for 12 months = £2,363.29 closed form; median matched within £1; probability 100% just below, 0% just above; required monthly within £2 of closed form. test-goal-calendar.
- **R1-05** `GET /performance/series?benchmark=&range=&basis=`: rebased to 100, joined on date (benchmark null on its missing days, never shifted), peak/date/distance, `fillable` map; unknown benchmark refused; unfillable range refused. Benchmarks from new `BENCHMARKS` list in config.js. Tests: Wednesday-less benchmark aligns; identical series -> relative flat at 100; 40 bars never labelled 1Y.
- **R1-06** `GET /performance/periods`: 1W 1M 3M 6M YTD 1Y 3Y 5Y ITD, bars used, annualised for 3Y/5Y/ITD, excess pp; YTD from the last close of the prior year. Closed-form: 1.001^31-1 etc. Surprise: the reconstruction rounds pound values to 2dp, visible at the 3rd decimal of a % for £100 positions — test fixtures scaled to £100k; engine unchanged.
- **R1-07** `GET /portfolio/returns?windows=`: per-holding return, prior-weight contribution, benchmark-relative, live day move, 22-close spark, and a linked story only when one exists. Asserted: contributions sum to the portfolio return for 1D/1W/1M/YTD/1Y; a holding with no bars appears with nulls, a reason, and in coverage.missing.
- **R1-08** `GET /portfolio/composition?lens=class|sector|region|typed|wrapper|account|currency&includeCash=`: class > group > holding tree; region lens is listing venue looked through fund compositions with an explicit "Not disclosed" node; Unclassified explicit. Asserted: every lens sums to 1 (top and leaves), with and without cash, and an all-unclassified book.
- **R1-09** `GET /portfolio/labels/check`: near-duplicates via trim/lower-case/synonyms, whitespace, unclassified counts; asserted the holdings table is byte-unchanged after the check.
- **R1-10** `GET /overview`: 17 independently guarded blocks + `dataVersion`. Forced failure of one block (test hook in the engine, not in the route) leaves the other 16 present and hero/top/day available. Data versions: per-part counters (prices, book, bars, news, calendar, flows, goal, watch, briefing), bumped after successful writes by path and on price change; `X-Meridian-Data-Version` header; `GET /data-version`.
- **R1-11** `scripts/test-contract.mjs` over populated / thin / empty seeded worlds: every new GET route in-process (no throw, contract keys, reasons on refusals, no NaN/Infinity/undefined anywhere) and over real HTTP (no 500, header present, a cash write bumps only `book`). New seed `scripts/seed-world.mjs` (populated / thin / empty; test tickers T*.L, TCO; "[Test fixture]" headlines; ledger, fees, targets, goal, partial fund composition, composition with no holdings, unpriced holding, USD cash, stale cash edit, snapshots with gaps, calendar cache incl. "no dates published", watchlist incl. unpriced, alerts) and a matching price-fixture JSON. `seed-dev-db.js` left unchanged.
- Extra backend (same contract, each exercised by tests above): B-13 `/performance/calendar`, B-14 `/performance/drawdowns` (episode test on a hand shape: -10%, -25% recovered, -2.479% ongoing), PF-06/B-16 `/performance/risk` (rf 4% stated, rolling 63-day vol/Sharpe/beta, date-joined beta), B-17 `/performance/capture` (2x benchmark -> 200%/200%/beta 2; <120 joined days refused), B-18 `/performance/bridge` (100 in, 110 now -> +10, reconciles; no ledger refused), B-20 `/portfolio/holdings/enriched`, B-23 `/portfolio/targets`, B-24 `/portfolio/cash` (buffer from mandate: 5% of £12,000 = £600, deployable £1,400), accounts, watchlist strip, B-51 `/portfolio/concentration` (HHI 0.3194, top3 83.33%, breach only above cap), B-61 `/calendar/book`, B-62/63 `/news/book`, `/briefing/digest`, analysis adapters `/analysis/scenarios|shock|correlation|overlap|scorecard|rebalance|montecarlo|risk` (scorecard adapter strips `overall` — D-03).
- Test-only server switches (logged decision): `MERIDIAN_PORT`, `MERIDIAN_PRICE_FIXTURE` (quotes from a JSON file instead of Yahoo; also registers `POST /dev/prices/refresh`), `MERIDIAN_OFFLINE=1` (skips news, fear & greed, overnight window). None is set on a normal install; defaults unchanged.
- Route count: 140 -> 174 (one removed: old POST /goal; 35 added).

## Portfolio 2 (design preview)
- Added a sidebar page "Portfolio 2" that shows the Claude Fable 5.1 Max design as-is (sample data, not connected to anything).
- Files: `public/portfolio-2/index.html` (copy of UI-Design-Editable/UI-Design-17/Claude Fable 5.1 Max.html) and 2 small edits in `src/App.jsx` (nav entry `portfolio2`, and an iframe render).
- To remove: delete `public/portfolio-2/` and those two App.jsx blocks.
- Ports: API default moved 3001 -> 4001 (server/config.js, src/config.js, and the error-message text in src/App.jsx + server/index.js). scripts/windows/auto-update.ps1 still lists 3001 (not edited: off-limits).
