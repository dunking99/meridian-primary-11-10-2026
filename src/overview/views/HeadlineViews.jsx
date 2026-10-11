// OV-01 views: HeroTotal (hero figure, day move, 40-session spark bars,
// up/down count, benchmark day, peak, composed sentence, unpriced notice)
// and StatTiles (six tiles; a strip variant for value/invested/cash/P&L/day/
// return). Draw only what the hook hands over.

import React from "react";
import { useT, FONT, signColour } from "../../shared/theme.jsx";
import { Frame, StateView, ProvenanceFooter, Stat, Explain, ExplainBody, StaleBadge, Muted, NoData, BasisTag, SrOnly } from "../../shared/ui.jsx";
import { SparkBars, Sparkline } from "../../shared/charts/line.jsx";
import { gbp, gbpCompact, pct, pp, date, arrow, num } from "../../shared/format.js";

export function HeroTotalView({ status, data: d, reason, asOf, source, basis, coverage, stale, derived, size = "m", page, refetch }) {
  const t = useT();
  const big = size === "l" ? 58 : size === "s" ? 34 : 48;
  return (
    <Frame id="hero-total" label={d ? `Total value · ${d.positions} position${d.positions === 1 ? "" : "s"} · GBP` : "Total value"} right={<StaleBadge stale={stale} asOf={asOf} />}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Sum of each holding's quantity x live price, converted to GBP at live FX, plus recorded cash. Day change = value x pct / (100 + pct) against the previous close." />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={170}>
        {d && (
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: FONT.serif, fontSize: big, color: t.text, letterSpacing: -1, lineHeight: 1.05 }} aria-label={`Total value ${gbp(d.total)}`}>
                {gbp(d.total)}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
              <button onClick={() => page?.onNavigate?.("changed")} title="What moved today — opens What Changed"
                style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", fontFamily: FONT.mono, fontSize: 14, color: signColour(t, d.dayChange) }}>
                {arrow(d.dayChange)} {gbp(d.dayChange, { sign: true, dp: 0 })} · {pct(d.dayChangePct)} today
              </button>
              {size !== "s" && derived?.sparkValues?.length > 2 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <SparkBars values={derived.sparkValues} width={size === "l" ? 200 : 150} height={24} />
                  <span style={{ fontSize: 9.5, color: t.textFaint, fontFamily: FONT.mono }}>{derived.sparkValues.length - 1} sessions</span>
                </span>
              )}
              {size === "s" && derived?.sparkValues?.length > 2 && <Sparkline values={derived.sparkValues} width={90} height={20} />}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8, fontSize: 11, color: t.textMuted, fontFamily: FONT.mono }}>
              <span aria-label={`${d.up} up, ${d.down} down, ${d.flat} flat`}>
                <span style={{ color: t.positive }}>▲{d.up}</span> up · <span style={{ color: t.negative }}>▼{d.down}</span> down · {d.flat} flat{d.unknown ? ` · ${d.unknown} no quote` : ""}
              </span>
              <span>· {d.benchmarkDay?.pct != null ? <>FTSE 100 <span style={{ color: signColour(t, d.benchmarkDay.pct) }}>{pct(d.benchmarkDay.pct)}</span> today</> : <span title={d.benchmarkDay?.reason}>benchmark day move <NoData reason={d.benchmarkDay?.reason ?? "No quote"} /></span>}</span>
              {d.peak && <span title={`Peak of the reconstructed series (${d.peak.basis})`}>peak {gbpCompact(d.peak.value)} on {date(d.peak.date)} · {d.peak.distancePct === 0 ? "at peak" : `${pct(d.peak.distancePct, { dp: 1 })} from it`}</span>}
            </div>
            {size !== "s" && d.sentence && <div style={{ marginTop: 10, fontFamily: FONT.serif, fontSize: 15, color: t.textSecondary }}>{d.sentence}</div>}
            {d.partial && (
              <div role="note" style={{ marginTop: 10, fontSize: 11.5, color: t.warning, lineHeight: 1.5 }}>
                ⚠ Excludes {d.excluded.map(e => e.symbol).join(", ")} — {d.excluded[0]?.reason} The total above is for priced holdings and cash only.
              </div>
            )}
            <SrOnly>{derived?.textAlt}</SrOnly>
          </div>
        )}
      </StateView>
    </Frame>
  );
}

const TILE_LABELS = { totalReturn: "Total return", netGain: "Net gain", ytd: "Year to date", income: "Income · 12m", cash: "Cash", risk: "Risk",
  value: "Market value", invested: "Invested", unrealised: "Unrealised P&L", day: "Day move", return: "Return", deposits: "Net deposits" };

function tile(key, d, hero, t, page) {
  const nav = tab => () => page?.onNavigate?.(tab);
  switch (key) {
    case "totalReturn": {
      const x = d.totalReturn;
      return { value: x.available ? pct(x.pct, { dp: 1 }) : null, sign: x.available ? x.pct : null, reason: x.reason,
        sub: x.available ? <>since {date(x.from)} · {pct(x.annualisedPct, { dp: 1 })} a year <BasisTag basis="Reconstructed" /></> : x.reason,
        onClick: nav("performance"),
        explain: "Fixed-weight reconstruction: today's holdings replayed over stored closes since the first date every holding has. Not a money-weighted return — that needs the cash-flow ledger (Performance tab)." };
    }
    case "netGain": {
      const x = d.netGain;
      const onDep = x.deposited != null;
      return { value: onDep ? gbpCompact(x.gainOnDeposited, { sign: true }) : gbpCompact(x.pnl, { sign: true }), sign: onDep ? x.gainOnDeposited : x.pnl,
        sub: onDep ? `on ${gbpCompact(x.deposited)} paid in (ledger)` : `on ${gbpCompact(x.cost)} cost · ${pct(x.pnlPct, { dp: 1 })}`,
        explain: onDep ? "Current total minus net deposits recorded in the cash-flow ledger." : `Unrealised gain against average cost. ${x.depositedReason}` };
    }
    case "ytd": {
      const x = d.ytd;
      return { value: x.available ? pct(x.pct, { dp: 1 }) : null, sign: x.available ? x.pct : null, reason: x.reason,
        sub: x.available ? <>FTSE 100 {pct(x.benchmarkPct, { dp: 1 })} · <span style={{ color: signColour(t, x.excessPp) }}>{pp(x.excessPp)}</span></> : x.reason,
        onClick: nav("performance"), explain: "From the last close of last year to the latest close, reconstructed; benchmark over the same dates." };
    }
    case "income":
      return { value: null, reason: d.income.reason, sub: d.income.reason, explain: "No income ledger exists yet, so no figure is shown rather than an estimate." };
    case "cash": {
      const x = d.cash;
      return { value: gbpCompact(x.gbp), sub: <>{pct(x.pct, { dp: 1, sign: false })} of book{x.bufferPct != null ? ` · buffer ${x.bufferPct}% (${x.bufferSource})` : ""}</>, onClick: nav("allocate"),
        explain: "Recorded cash balances converted to GBP. Click to deploy it on the Allocate tab." };
    }
    case "risk": {
      const x = d.risk;
      return { value: x.available ? (x.beta != null ? `β ${num(x.beta, { dp: 2 })}` : `vol ${pct(x.volPct, { dp: 1, sign: false })}`) : null, reason: x.reason,
        sub: x.available ? `vol ${pct(x.volPct, { dp: 1, sign: false })}${x.benchmarkVolPct != null ? ` · ${x.benchmark?.label} ${pct(x.benchmarkVolPct, { dp: 1, sign: false })}` : ""} · 1y` : x.reason,
        onClick: nav("analysis"), explain: `Beta and volatility of the reconstructed book over one year, joined on date with ${x.benchmark?.label ?? "the benchmark"}. ${x.betaReason ?? ""}` };
    }
    case "value": return { value: hero ? gbpCompact(hero.total) : null, sub: "holdings + cash", explain: "Live valuation." };
    case "invested": return { value: hero ? gbpCompact(hero.invested) : null, sub: hero ? `cost ${gbpCompact(hero.cost)}` : null, explain: "Priced holdings at live prices." };
    case "unrealised": return { value: hero ? gbpCompact(hero.pnl, { sign: true }) : null, sign: hero?.pnl, sub: hero ? pct(hero.pnlPct, { dp: 1 }) : null, explain: "Value minus average cost for priced holdings." };
    case "day": return { value: hero ? gbpCompact(hero.dayChange, { sign: true }) : null, sign: hero?.dayChange, sub: hero ? pct(hero.dayChangePct) : null, onClick: () => page?.onNavigate?.("changed"), explain: "Against the previous close." };
    case "return": return tile("totalReturn", d, hero, t, page);
    default: return { value: null, reason: "Unknown tile" };
  }
}

export function StatTilesView({ status, data: d, hero, reason, asOf, source, basis, coverage, stale, size = "m", props = {}, page, refetch }) {
  const t = useT();
  const keys = props.tiles ?? ["totalReturn", "netGain", "ytd", "income", "cash", "risk"];
  const cols = props.variant === "strip" || size === "l" ? keys.length : size === "s" ? 2 : 3;
  return (
    <Frame id="stat-tiles" right={<StaleBadge stale={stale} asOf={asOf} />}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={150}>
        {d && (
          <div role="list" style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 2 }}>
            {keys.map(k => {
              const x = tile(k, d, hero, t, page);
              return (
                <div role="listitem" key={k} style={{ borderLeft: `1px solid ${t.borderSubtle}`, minWidth: 0 }}>
                  <Stat label={TILE_LABELS[k]} value={x.value} sub={x.sub} sign={x.sign} reason={x.reason} onClick={x.onClick} size={size === "l" ? "m" : "s"}
                    explain={<Explain title={TILE_LABELS[k]}><div style={{ marginBottom: 6 }}>{x.explain}</div><ExplainBody source={source} asOf={asOf} /></Explain>} />
                </div>
              );
            })}
          </div>
        )}
      </StateView>
    </Frame>
  );
}
