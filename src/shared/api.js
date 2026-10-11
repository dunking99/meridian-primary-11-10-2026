// The Portfolio pages' API client.
//
// One place for the base URL, and request de-duplication: several panels that
// ask for the same path at the same moment share one request. Each caller
// holds a reference; the underlying request is aborted only when every caller
// has gone (a panel unmounting does not cancel its neighbour's data).

import { API_BASE } from "../config.js";

export { API_BASE };
const inflight = new Map();

export function getJson(path) {
  const url = `${API_BASE}${path}`;
  let entry = inflight.get(url);
  if (!entry) {
    const controller = new AbortController();
    const promise = fetch(url, { signal: controller.signal })
      .then(async res => {
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          const e = new Error(body?.error ?? `The API answered ${res.status} for ${path}`);
          e.status = res.status;
          throw e;
        }
        return body;
      })
      .finally(() => { inflight.delete(url); });
    entry = { promise, controller, refs: 0 };
    inflight.set(url, entry);
  }
  entry.refs++;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    entry.refs--;
    // Deferred a tick: a panel that unmounts and immediately remounts (React
    // StrictMode in development, a layout switch) picks the same request back
    // up instead of cancelling it and starting another.
    setTimeout(() => {
      if (entry.refs <= 0 && inflight.get(url) === entry) { entry.controller.abort(); inflight.delete(url); }
    }, 0);
  };
  return { promise: entry.promise, release };
}

export async function send(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const out = await res.json().catch(() => null);
  if (!res.ok) throw new Error(out?.error ?? `The API answered ${res.status}`);
  return out;
}
