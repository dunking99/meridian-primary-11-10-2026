// Hooks for concentration (OV-14 / AN-02 / HD-16), cash (OV-09 / HD-02 /
// AN-19), watchlist (OV-21), accounts (OV-22) and the goal (OV-23). Each is
// used by more than one page; one hook and one view per fact.
import { useCallback, useState } from "react";
import { useSpec, primary } from "../../shared/layout.jsx";
import { EP } from "../../shared/endpoints.js";
import { send } from "../../shared/api.js";
import { refreshVersions } from "../../shared/dataVersion.js";

const simple = (path, deps, staleAfterMs, extraSelect) => ({
  endpoints: () => ({ main: typeof path === "function" ? path() : path }),
  deps: { main: deps }, staleAfterMs,
  select: ({ main }) => ({ ...primary({ main }), data: main.data, ...(extraSelect ? extraSelect(main.data) : {}) }),
});

export const concentrationSpec = simple(EP.concentration, ["prices", "book"], 10 * 60_000, d => ({
  textAlt: d ? `Largest position ${d.largest.symbol} ${d.largest.pct}%, top three ${d.top3}%, effective holdings ${d.effectiveHoldings} of ${d.positionCount}; ${d.breaches.length} cap breaches.` : "",
}));
export const useConcentration = (props, page) => useSpec(concentrationSpec, props, page);

export const cashSpec = {
  names: ["main", "composition"],
  endpoints: () => ({ main: EP.cash, composition: EP.composition("class", true) }),
  deps: { main: ["prices", "book"], composition: ["prices", "book", "bars"] },
  staleAfterMs: 30 * 60_000,
  select: ({ main, composition }) => ({
    ...primary({ main }), data: main.data,
    composition: composition.status === "ready" ? composition.data : null,
    textAlt: main.data ? `Cash £${Math.round(main.data.total).toLocaleString("en-GB")}, ${main.data.shareOfBookPct}% of the book, across ${main.data.rows.length} balances.` : "",
  }),
};
export function useCash(props, page) {
  const out = useSpec(cashSpec, props, page);
  const [saving, setSaving] = useState(false);
  const save = useCallback(async (id, amount) => {
    setSaving(true);
    try { await send("PUT", "/cash", { id, amount: Number(amount) }); await refreshVersions(); }
    finally { setSaving(false); }
  }, []);
  return { ...out, save, saving };
}

export const watchlistSpec = simple(EP.watchlist, ["prices", "watch"], 10 * 60_000, d => ({
  textAlt: d ? `${d.rows.length} symbols watched: ${d.rows.map(r => `${r.symbol} ${r.dayPct == null ? "no price" : `${r.dayPct}%`}`).join(", ")}.` : "",
}));
export function useWatchlist(props, page) {
  const out = useSpec(watchlistSpec, props, page);
  const [msg, setMsg] = useState(null);
  const add = useCallback(async (symbol, tier = 3) => {
    const s = String(symbol ?? "").trim().toUpperCase();
    if (!s) return;
    try { await send("POST", "/watchlist", { symbol: s, tier }); setMsg(`${s} added.`); await refreshVersions(); }
    catch (e) { setMsg(`Could not add ${s}: ${e.message}`); }
  }, []);
  const alert = useCallback(async (symbol, direction, threshold) => {
    const th = Number(threshold);
    if (!Number.isFinite(th)) { setMsg("Enter a price for the alert."); return; }
    try { await send("POST", "/alerts", { symbol, kind: "price", direction, threshold: th, note: "Set from the Overview watchlist" }); setMsg(`Alert set: ${symbol} ${direction} ${th}. Delivery is in-app only.`); await refreshVersions(); }
    catch (e) { setMsg(`Could not set the alert: ${e.message}`); }
  }, []);
  return { ...out, add, alert, msg };
}

export const accountsSpec = simple(EP.accounts, ["prices", "book"], 30 * 60_000, d => ({
  textAlt: d ? `${d.rows.length} accounts: ${d.rows.map(r => `${r.account} (${r.wrapper}) ${r.pct}%`).join(", ")}.` : "",
}));
export const useAccounts = (props, page) => useSpec(accountsSpec, props, page);

export const goalSpec = simple(EP.goal, ["goal", "book", "bars"], 7 * 86400_000, d => ({
  textAlt: d ? `Goal £${d.goal.target.toLocaleString("en-GB")} by ${d.goal.targetDate}: ${d.progressPct}% of the way; ${d.probabilityPct}% of resampled paths reach it.` : "",
}));
export function useGoal(props, page) {
  const out = useSpec(goalSpec, props, page);
  const [errors, setErrors] = useState(null);
  const saveGoal = useCallback(async goal => {
    setErrors(null);
    try {
      const r = await send("POST", "/goal", goal);
      if (r?.available === false && r.data?.errors) setErrors(r.data.errors);
      await refreshVersions();
    } catch (e) { setErrors([e.message]); }
  }, []);
  const clear = useCallback(async () => { await send("DELETE", "/goal"); await refreshVersions(); }, []);
  return { ...out, saveGoal, clear, errors };
}
