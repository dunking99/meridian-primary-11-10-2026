# Overnight build brief - Portfolio page, working end to end

You are running unattended. Hugo is asleep. The goal: by morning, the Portfolio page's components
are built, wired to real backend endpoints with live/auto-updating data, and viewable in the
browser against Hugo's own portfolio (a COPY of his data). Nothing is merged or pushed.

Read fully before starting: `UI-BUILD-CHECKLIST.md` (rules G-xx, decisions D-xx, backend B-xx) and
`PORTFOLIO-COMPONENT-CHECKLIST.md` (every component, form, rule). CLAUDE.md in the repo is law.

## Setup (first 20 minutes)
1. Fresh `git clone https://github.com/dunking99/Meridian-Primary.git ~/work/Meridian-Primary`
   (NOT inside a Syncthing folder). If the clone fails (no GitHub auth), copy
   `/Users/hugodyson/Meridian-Primary` to `~/work/Meridian-Primary`, delete its `meridian.db*`,
   `git init`, commit as baseline, and say so in the log (Hugo will get a patch, not a PR).
2. Create branch `overnight/portfolio-components`. Commit small and often. **Never push. Never merge.**
3. Data: make a COPY of the real database with SQLite's online backup (read-only on the source):
   source `/Users/hugodyson/Meridian-Primary/meridian.db` -> `~/work/data/portfolio-copy.db`.
   Run the app with `MERIDIAN_DB=~/work/data/portfolio-copy.db`. The original file is never opened
   by the app, tests or scripts. Also keep a second, synthetic DB (`scripts/seed-dev-db.js`) for tests.
4. Baseline: run every `scripts/test-*.mjs` on the synthetic DB, record results in `RUN-LOG.md`.
5. Ports: API on 3101, Vite on 5273 (not 3001/5173) so nothing collides with Hugo's normal app.
6. Live data: Yahoo/EDGAR/RSS should be reachable from this Mac. Verify with a real quote fetch.
   If blocked, use Playwright request interception with fixtures shaped like real responses
   and say so plainly in the log.

## What to build (priority order - stop wherever time runs out, each step must be finished and working)
Use the stated defaults for every [DECISION]; log each one used. Order follows the strength of Hugo's
design signal:
1. **Backend contracts** (B-01..B-03) and the shared component foundation (VF-xx forms and
   `StatTile`, `DataTable`, `RangeSelector`, states/provenance/explain). Extend the existing `THEMES`
   tokens; no literal colours in new code.
2. **Holdings sub-page:** HD-01..HD-24 (B-20..B-25, income B-30..B-35, realised B-41/42, fees B-43).
   Treemap, ribbon vs target, map/globe (offline geometry), table with all columns.
3. **Performance sub-page:** PF-01..PF-14 (B-10..B-19).
4. **Overview sub-page:** OV-01..OV-27 (calendar family first, B-60..B-66).
5. **Analysis sub-page:** AN-01..AN-21 (B-50..B-56, wire the existing correlation/X-ray/scorecard).
6. Keep every existing Portfolio feature working (PX-01..09).

## Auto-updating (required for every component)
- Prices refresh on the existing 60 s poll without redrawing whole charts.
- Each panel refetches when the server's `dataVersion` changes (B-83), plus a visible "as of" and a
  stale badge when older than its threshold.
- Server-side jobs (news refresh, calendar, memory rebuild, daily sync window) keep running as today;
  new derived data (income, series, drawdowns) is computed on demand with caching invalidated on
  sync/holding change (B-80).
- Verify with Playwright that a price change updates the figure and leaves other panels untouched.

## Verification (every component, before ticking it)
- Engine test with hand-worked answers for any new maths (repo convention, `scripts/test-*.mjs`).
- Playwright against the app on the COPY DB (real holdings) and the synthetic DB: populated, thin,
  empty. Screenshots into `overnight-shots/` (gitignored) at 1440 wide, dark and light themes.
- Console has no errors; no request fails; no literal colours; keyboard focus works.
- Tick the item only with evidence in `RUN-LOG.md`. If unverifiable here, say so, don't tick.

## Hard rules
- Real `meridian.db` and `scripts/windows/*` are never touched. No `package.json` dependency changes
  without logging why (prefer none; hand-written SVG as the repo already does).
- No fabricated data. Missing data renders as visibly missing. Honest refusal beats a guess.
- If something needs a decision you can't default, skip it, log it, continue with the next item.
- Two failed attempts at the same fix: log it, move on.

## Morning deliverable
1. `RUN-LOG.md`: what was built, evidence, what was skipped and why, decisions defaulted.
2. A running preview: leave API on 3101 + Vite on 5273 up if possible, with the exact URL and the
   command to restart it.
3. `MORNING-REPORT.md`: table of every checklist item -> done / partial / skipped / blocked; test
   counts before vs after; screenshots list; any risk to review before merging.
4. Branch left unpushed with clean, single-purpose commits that explain why.
