// useApi — the only way a Portfolio-page hook talks to the server.
//
// Returns the panel contract in a fixed shape:
//   { status: 'loading' | 'ready' | 'refused' | 'error',
//     data, reason, asOf, source, basis, coverage, note, stale, refetch }
//
// - refetches when a data-version part it depends on changes;
// - keeps what is on screen while refetching (no skeleton flash on a poll);
// - keeps the previous object when the new body is identical, so a view whose
//   inputs did not change does not re-render;
// - aborts on unmount (shared requests only when their last caller leaves).

import { useCallback, useEffect, useRef, useState } from "react";
import { getJson } from "./api.js";
import { useVersionKey } from "./dataVersion.js";

const EMPTY = { status: "loading", data: null, reason: null, asOf: null, source: null, basis: null, coverage: null, note: null };

export function envelopeToState(env) {
  if (!env || typeof env !== "object") return { ...EMPTY, status: "error", reason: "The API returned nothing." };
  if (env.available === false) {
    return { status: "refused", data: env.data ?? null, reason: env.reason ?? "Not available.", asOf: env.asOf ?? null, source: env.source ?? null, basis: env.basis ?? null, coverage: env.coverage ?? null, note: env.note ?? null };
  }
  return { status: "ready", data: env.data ?? null, reason: null, asOf: env.asOf ?? null, source: env.source ?? null, basis: env.basis ?? null, coverage: env.coverage ?? null, note: env.note ?? null };
}

export function useApi(path, { deps = ["prices", "book"], enabled = true, staleAfterMs = null, adapt = null } = {}) {
  const versionKey = useVersionKey(deps);
  const [state, setState] = useState(EMPTY);
  const lastBody = useRef(null);
  const [nonce, setNonce] = useState(0);
  const refetch = useCallback(() => setNonce(n => n + 1), []);

  const lastPath = useRef(path);
  useEffect(() => {
    // A different path is different data: never keep showing the old answer
    // under a new question (e.g. the inspector after the selection changes).
    if (lastPath.current !== path) { lastPath.current = path; lastBody.current = null; setState(EMPTY); }
    if (!enabled || !path) return undefined;
    let live = true;
    const { promise, release } = getJson(path);
    promise.then(body => {
      if (!live) return;
      const text = JSON.stringify(body);
      if (text === lastBody.current) return;            // identical: keep the old object
      lastBody.current = text;
      setState(envelopeToState(adapt ? adapt(body) : body));
    }).catch(e => {
      if (!live || e?.name === "AbortError") return;
      lastBody.current = null;
      setState(s => ({ ...s, status: "error", reason: e?.message?.includes("fetch") ? "Could not reach the Meridian API." : (e?.message ?? "Request failed.") }));
    });
    return () => { live = false; release(); };
  }, [path, versionKey, enabled, nonce]);  // eslint-disable-line react-hooks/exhaustive-deps

  const stale = staleAfterMs != null && state.asOf != null && Date.now() - state.asOf > staleAfterMs;
  return { ...state, stale, refetch };
}

/** Combine several results: loading/error/refused from the first that is, else ready. */
export function combine(primary, ...others) {
  for (const r of [primary, ...others]) if (r.status === "error") return r;
  if ([primary, ...others].some(r => r.status === "loading")) return { ...primary, status: "loading" };
  return primary;
}
