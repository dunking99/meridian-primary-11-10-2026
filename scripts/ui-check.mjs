// Meridian — Playwright check of the Portfolio sub-pages, component by component.
//
//   node scripts/ui-check.mjs <page> [worlds=populated,thin,empty] [themes=dark,light]
//
// Expects: API for the populated world on 3101, thin on 3102, empty on 3103
// (each started with MERIDIAN_PRICE_FIXTURE + MERIDIAN_OFFLINE on a seeded
// *.test.db — see RUN-LOG.md), and Vite on 5273 built with
// VITE_MERIDIAN_API=http://localhost:3101. Thin and empty are served by
// rerouting the page's API calls to 3102 / 3103.
//
// Playwright is not a project dependency; set PLAYWRIGHT_MODULE to its
// index.mjs (defaults to the copy in this machine's npx cache).
//
// For every [data-slot] on the page, in every world and theme, it writes
// overnight-shots/<page>-<component>-<world>-<theme>.png and records: console
// errors, failed requests, SVG/canvas charts without a text alternative, and
// whether the slot contains a keyboard-focusable element.

import { writeFileSync } from 'fs';
const PW = process.env.PLAYWRIGHT_MODULE ?? '/Users/hugodyson/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const page = process.argv[2] ?? 'overview';
const worlds = (process.argv[3] ?? 'populated,thin,empty').split(',');
const themes = (process.argv[4] ?? 'dark,light').split(',');
const PORT = { populated: 3101, thin: 3102, empty: 3103 };
const OUT = new URL('../overnight-shots/', import.meta.url).pathname;
const results = [];
const browser = await chromium.launch();
for (const world of worlds) {
  for (const theme of themes) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await ctx.addInitScript(th => { try { localStorage.setItem('meridian_theme', th); } catch {} }, theme);
    if (world !== 'populated') {
      await ctx.route('http://localhost:3101/**', r => r.continue({ url: r.request().url().replace(':3101', `:${PORT[world]}`) }));
    }
    const p = await ctx.newPage();
    const errors = [], failed = [];
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    p.on('pageerror', e => errors.push(e.message));
    p.on('requestfailed', r => { const f = r.failure()?.errorText ?? ''; if (!/ERR_ABORTED/.test(f)) failed.push(`${r.url()} ${f}`); });
    p.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
    await p.goto(`http://localhost:5273/#/portfolio/${page}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(3000);
    const slots = await p.$$('[data-slot]');
    for (const el of slots) {
      const name = await el.getAttribute('data-slot');
      const info = await el.evaluate(n => {
        const charts = [...n.querySelectorAll('svg[role="img"], canvas')];
        const unlabelled = charts.filter(c => !(c.getAttribute('aria-label') || '').trim()).length;
        const focusable = n.querySelectorAll('button, a[href], input, select, [tabindex="0"]').length;
        const text = n.innerText.slice(0, 160).replace(/\s+/g, ' ');
        const state = n.querySelector('[aria-busy="true"]') ? 'loading' : n.querySelector('[role="alert"]') && /⚠/.test(n.innerText) ? 'error-or-breach' : /NOT AVAILABLE/.test(n.innerText) ? 'refused' : 'ready';
        return { charts: charts.length, unlabelled, focusable, text, state };
      });
      await el.scrollIntoViewIfNeeded();
      await el.screenshot({ path: `${OUT}${page}-${name}-${world}-${theme}.png` }).catch(() => {});
      results.push({ page, component: name, world, theme, ...info });
    }
    results.push({ page, component: '__page', world, theme, errors, failed });
    await p.screenshot({ path: `${OUT}${page}-__page-${world}-${theme}.png`, fullPage: true });
    await ctx.close();
  }
}
await browser.close();
writeFileSync(`${OUT}${page}-check.json`, JSON.stringify(results, null, 1));
for (const r of results) {
  if (r.component === '__page') console.log(`${r.world}/${r.theme}: console errors ${r.errors.length}${r.errors.length ? ` [${r.errors.slice(0, 3).join(' | ')}]` : ''}; failed requests ${r.failed.length}${r.failed.length ? ` [${r.failed.slice(0, 3).join(' | ')}]` : ''}`);
  else if (r.theme === themes[0]) console.log(`  ${r.world.padEnd(9)} ${r.component.padEnd(22)} ${r.state.padEnd(15)} charts ${r.charts} unlabelled ${r.unlabelled} focusable ${r.focusable}`);
}
