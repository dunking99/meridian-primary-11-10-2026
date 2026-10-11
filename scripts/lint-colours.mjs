// Fails if any new Portfolio-page frontend file contains a literal colour.
//   node scripts/lint-colours.mjs
// Colours must come from theme tokens (App.jsx THEMES, handed in via
// src/shared/theme.jsx). Checks hex, rgb()/rgba()/hsl() and CSS named colours
// used as values.
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
const ROOT = new URL('../src/', import.meta.url).pathname;
const DIRS = ['shared', 'overview', 'holdings', 'performance', 'analysis', 'gallery'];
const FILES = ['pages.jsx', 'registry-all.js'];
const NAMED = /['"`](?:white|black|red|green|blue|gray|grey|orange|yellow|purple|pink|brown|navy|teal|silver|gold|maroon|olive|lime|aqua|fuchsia)['"`]/i;
const walk = d => readdirSync(d).flatMap(f => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = [...DIRS.flatMap(d => { try { return walk(path.join(ROOT, d)); } catch { return []; } }), ...FILES.map(f => path.join(ROOT, f))]
  .filter(f => /\.(jsx?|mjs)$/.test(f));
let hits = 0;
for (const f of files) {
  readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, '');
    if (/#[0-9a-f]{3,8}\b/i.test(code.replace(/url\(#[^)]*\)|`#[^`]*`|"#\/[^"]*"|'#\/[^']*'/g, '')) || /\b(rgba?|hsla?)\(/.test(code) || NAMED.test(code)) {
      hits++; console.log(`${path.relative(ROOT, f)}:${i + 1}: ${line.trim().slice(0, 140)}`);
    }
  });
}
console.log(`${files.length} files scanned, ${hits} literal colour${hits === 1 ? '' : 's'}`);
process.exit(hits ? 1 : 0);
