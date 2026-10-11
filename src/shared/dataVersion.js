// The server's data version, split into parts (prices, book, bars, news,
// calendar, flows, goal, watch, briefing).
//
// Panels subscribe to the parts they depend on and refetch only when one of
// those moves: a price tick redraws price-dependent figures and leaves the
// calendar and the news list alone. One poll of the tiny /data-version route
// serves every panel on the page.

import { useSyncExternalStore } from "react";
import { getJson } from "./api.js";

let versions = null;
let timer = null;
const subs = new Set();
const POLL_MS = 10_000;

async function poll() {
  const { promise, release } = getJson("/data-version");
  try {
    const d = await promise;
    const next = d?.versions ?? null;
    if (next && JSON.stringify(next) !== JSON.stringify(versions)) {
      versions = next;
      subs.forEach(fn => fn());
    }
  } catch { /* API down: panels show their own error state */ }
  finally { release(); }
}

function subscribe(fn) {
  subs.add(fn);
  if (!timer) { poll(); timer = setInterval(poll, POLL_MS); }
  return () => {
    subs.delete(fn);
    if (!subs.size && timer) { clearInterval(timer); timer = null; }
  };
}

/** Ask for an immediate re-poll, e.g. straight after this page wrote something. */
export function refreshVersions() { return poll(); }

/** A stable string of just the parts a panel depends on. */
export function useVersionKey(parts) {
  const key = () => (versions ? parts.map(p => `${p}:${versions[p] ?? 0}`).join("|") : "init");
  return useSyncExternalStore(subscribe, key, key);
}

/** For tests and the gallery: set versions directly. */
export function __setVersions(v) { versions = v; subs.forEach(fn => fn()); }
