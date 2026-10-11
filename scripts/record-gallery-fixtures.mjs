// Record the gallery's state fixtures from the running test APIs.
//
//   node scripts/record-gallery-fixtures.mjs
//
// Hits every path in src/shared/endpoints.js FIXTURE_PATHS on the populated
// (3101), thin (3102) and empty (3103) seeded worlds and writes the raw
// responses to src/gallery/fixtures.json. The gallery then renders each view
// from these recorded responses — never from invented numbers. Extra
// "refusal" paths are recorded where a refusal can genuinely be produced.
import { writeFileSync } from 'fs';
import { FIXTURE_PATHS, EP } from '../src/shared/endpoints.js';
const WORLDS = { populated: 3101, thin: 3102, empty: 3103 };
const REFUSAL_PATHS = [EP.series('5Y'), EP.series('1Y', '^FTSE', 'recorded'), EP.capture('^GSPC', '1y')];
const out = { recordedAt: new Date().toISOString(), worlds: {} };
for (const [w, port] of Object.entries(WORLDS)) {
  out.worlds[w] = {};
  for (const path of [...new Set([...FIXTURE_PATHS, ...REFUSAL_PATHS])]) {
    try {
      const r = await fetch(`http://localhost:${port}${path}`);
      out.worlds[w][path] = await r.json();
    } catch (e) { out.worlds[w][path] = { __error: e.message }; }
  }
  console.log(`${w}: ${Object.keys(out.worlds[w]).length} paths`);
}
const file = new URL('../src/gallery/fixtures.json', import.meta.url);
writeFileSync(file, JSON.stringify(out));
console.log(`wrote ${file.pathname} (${(JSON.stringify(out).length / 1024).toFixed(0)} KB)`);
