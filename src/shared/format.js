// Number and date formatting for the Portfolio pages: GBP, pence, signs,
// compact amounts, percentages and percentage points, en-GB dates. Every
// formatter returns an em dash pair for null rather than a zero, so a missing
// figure never reads as a real one.

export const MISSING = "——";
const isNum = v => typeof v === "number" && Number.isFinite(v);

export function gbp(v, { dp = 0, sign = false } = {}) {
  if (!isNum(v)) return MISSING;
  const s = Math.abs(v).toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const pre = v < 0 ? "−" : sign && v > 0 ? "+" : "";
  return `${pre}£${s}`;
}

export function gbpCompact(v, { sign = false } = {}) {
  if (!isNum(v)) return MISSING;
  const a = Math.abs(v);
  const body = a >= 1e6 ? `${(a / 1e6).toFixed(2)}m` : a >= 1e4 ? `${(a / 1e3).toFixed(1)}k` : a >= 1e3 ? `${(a / 1e3).toFixed(2)}k` : a.toFixed(0);
  const pre = v < 0 ? "−" : sign && v > 0 ? "+" : "";
  return `${pre}£${body}`;
}

/** Price in its own currency; pence-quoted lines are already pounds at source. */
export function price(v, ccy = "GBP") {
  if (!isNum(v)) return MISSING;
  const sym = ccy === "GBP" ? "£" : ccy === "USD" ? "$" : ccy === "EUR" ? "€" : "";
  const dp = Math.abs(v) < 10 ? 3 : 2;
  return `${sym}${v.toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp })}${sym ? "" : ` ${ccy}`}`;
}

export function pct(v, { dp = 2, sign = true } = {}) {
  if (!isNum(v)) return MISSING;
  const pre = v < 0 ? "−" : sign && v > 0 ? "+" : "";
  return `${pre}${Math.abs(v).toFixed(dp)}%`;
}

export function pp(v, { dp = 1 } = {}) {
  if (!isNum(v)) return MISSING;
  return `${v < 0 ? "−" : v > 0 ? "+" : ""}${Math.abs(v).toFixed(dp)} pp`;
}

export function num(v, { dp = 2, sign = false } = {}) {
  if (!isNum(v)) return MISSING;
  const pre = v < 0 ? "−" : sign && v > 0 ? "+" : "";
  return `${pre}${Math.abs(v).toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}

export function date(d, { withYear = true, weekday = false } = {}) {
  if (!d) return MISSING;
  const t = typeof d === "number" ? new Date(d) : new Date(`${String(d).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(t.getTime())) return MISSING;
  return t.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}), ...(weekday ? { weekday: "short" } : {}) });
}

export function dateTime(ms) {
  if (!isNum(ms)) return MISSING;
  return new Date(ms).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function age(ms, now = Date.now()) {
  if (!isNum(ms)) return "never";
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export const arrow = v => (!isNum(v) || v === 0 ? "▪" : v > 0 ? "▲" : "▼");
