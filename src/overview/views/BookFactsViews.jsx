// Views for concentration, cash, watchlist, accounts and the goal.
import React, { useState } from "react";
import { useT, FONT, soft, signColour, cat, hatch } from "../../shared/theme.jsx";
import { Frame, StateView, ProvenanceFooter, Segmented, Muted, StaleBadge, Chip, SrOnly, Stat, Placeholder, NoData } from "../../shared/ui.jsx";
import { Pareto, Lorenz, Ribbon } from "../../shared/charts/bars.jsx";
import { FanChart } from "../../shared/charts/shapes.jsx";
import { Sparkline } from "../../shared/charts/line.jsx";
import { gbp, gbpCompact, pct, num, price, date, age } from "../../shared/format.js";

// ─── OV-14 / AN-02 concentration ──────────────────────────────

export function ConcentrationView({ status, data: d, reason, asOf, source, basis, coverage, stale, textAlt, size = "m", props = {}, page, refetch }) {
  const t = useT();
  const full = props.full === true;
  const [form, setForm] = useState(full ? "bands" : "tiles");
  const breaches = d?.breaches ?? [];
  const forms = full ? [{ value: "bands", label: "Bands" }, { value: "lorenz", label: "Lorenz" }, { value: "pareto", label: "Pareto" }, { value: "tiles", label: "Tiles" }] : [{ value: "tiles", label: "Tiles" }, { value: "pareto", label: "Pareto" }];
  return (
    <Frame id={full ? "concentration-full" : "concentration"} label="Concentration" title={full ? "How top-heavy is it?" : "Concentration snapshot"}
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Concentration form" value={form} onChange={setForm} options={forms} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} method="Largest / top-N are shares of the whole book; HHI is the sum of squared weights; effective holdings is 1 / HHI over invested value. Caps come from the saved mandate; a banner appears only when one is exceeded." />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={140}>
        {d && (
          <>
            {breaches.length > 0 && (
              <div role="alert" style={{ background: t.warningSoft, border: `1px solid ${soft(t.warning, 50)}`, borderRadius: 5, padding: "6px 9px", marginBottom: 8, fontSize: 11.5, color: t.warning }}>
                ⚠ {breaches.map(b => b.kind === "position" ? `${b.symbol} is ${b.actualPct}% (cap ${b.capPct}%)` : b.kind === "sector" ? `${b.label} sector ${b.actualPct}% (cap ${b.capPct}%)` : `${b.actual} holdings (cap ${b.cap})`).join(" · ")}
                <div style={{ fontSize: 10, color: t.textMuted }}>Caps from {d.caps?.source}. Not advice — a comparison against limits you set.</div>
              </div>
            )}
            {form === "tiles" && (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${size === "s" ? 2 : 4}, minmax(0,1fr))` }}>
                <Stat size="s" label="Largest" value={`${d.largest.pct}%`} sub={d.largest.symbol} />
                <Stat size="s" label="Top 3" value={`${d.top3}%`} sub={`top 5 ${d.top5}%`} />
                <Stat size="s" label="HHI" value={num(d.hhi, { dp: 3 })} sub="sum of squared weights" />
                <Stat size="s" label="Effective" value={num(d.effectiveHoldings, { dp: 1 })} sub={`of ${d.positionCount} holdings`} />
              </div>
            )}
            {form === "bands" && (
              <div role="list" aria-label={textAlt}>
                {[["Top 1", d.top1, d.caps?.maxPositionPct], ["Top 3", d.top3, null], ["Top 5", d.top5, null], ["Top 10", d.top10, null]].map(([l, v, cap]) => (
                  <div role="listitem" key={l} style={{ display: "grid", gridTemplateColumns: "60px 1fr 56px", gap: 8, alignItems: "center", padding: "4px 0" }}>
                    <span style={{ fontSize: 11.5, color: t.textSecondary }}>{l}</span>
                    <span style={{ position: "relative", height: 10, background: t.surfaceInset }}>
                      <span style={{ position: "absolute", inset: 0, width: `${Math.min(100, v)}%`, background: t.text }} />
                      {cap != null && <span title={`Mandate cap ${cap}%`} style={{ position: "absolute", left: `${cap}%`, top: -3, width: 2, height: 16, background: t.warning }} />}
                    </span>
                    <span style={{ fontFamily: FONT.mono, fontSize: 11.5, textAlign: "right" }}>{v}%</span>
                  </div>
                ))}
                <Muted size={10}>Tick = your mandate's single-position cap ({d.caps?.maxPositionPct ?? "—"}%). Effective holdings {num(d.effectiveHoldings, { dp: 1 })} of {d.positionCount}; largest sector {d.largestSector?.label} {d.largestSector?.pct}%.</Muted>
              </div>
            )}
            {form === "lorenz" && (
              <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <Lorenz points={d.lorenz} gini={d.gini} size={size === "s" ? 150 : 180} summary={`Lorenz curve of holding weights, Gini ${d.gini}`} />
                <div style={{ fontSize: 11, color: t.textSecondary, lineHeight: 1.6, maxWidth: 240 }}>The further the curve bows below the diagonal, the more of the book sits in a few holdings. Gini {num(d.gini, { dp: 2 })}; HHI {num(d.hhi, { dp: 3 })}.</div>
              </div>
            )}
            {form === "pareto" && <Pareto rows={d.pareto} summary={textAlt} height={size === "s" ? 140 : 180} caps={d.caps ? [{ label: `cap ${d.caps.maxPositionPct}%`, value: d.caps.maxPositionPct }] : []} />}
            {!breaches.length && d.caps && <Muted size={10} style={{ marginTop: 4 }}>No mandate cap is exceeded.</Muted>}
            {!props.full && <button onClick={() => page?.onNavigate?.("analysis")} style={{ background: "transparent", border: "none", color: t.info, cursor: "pointer", fontSize: 11, padding: 0, marginTop: 6 }}>Concentration in Analysis →</button>}
            <SrOnly>{textAlt}</SrOnly>
          </>
        )}
      </StateView>
    </Frame>
  );
}

// ─── OV-09 / HD-02 / AN-19 cash ───────────────────────────────

export function CashView({ status, data: d, reason, asOf, source, basis, coverage, stale, composition, textAlt, save, saving, size = "m", props = {}, page, refetch }) {
  const t = useT();
  const [form, setForm] = useState(props.form ?? "tile");
  const [edit, setEdit] = useState(null);
  const [amt, setAmt] = useState("");
  const forms = [{ value: "tile", label: "Accounts" }, { value: "combined", label: "+Book" }, { value: "meter", label: "Meter" }, { value: "currency", label: "Currency" }];
  return (
    <Frame id="cash" label="Cash & liquidity" title="Cash"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Cash form" value={form} onChange={setForm} options={forms} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} note={d?.oldestEditDays > 30 ? `A balance was last edited ${d.oldestEditDays} days ago.` : null} />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={120}>
        {d && (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: FONT.serif, fontSize: 26, color: t.text }}>{gbp(d.total)}</span>
              <span style={{ fontFamily: FONT.mono, fontSize: 11, color: t.textMuted }}>{pct(d.shareOfBookPct, { dp: 1, sign: false })} of the book</span>
              <button onClick={() => page?.onNavigate?.("allocate")} style={{ marginLeft: "auto", background: "transparent", border: `1px solid ${t.accent}`, color: t.accent, borderRadius: 3, fontSize: 10.5, padding: "3px 9px", cursor: "pointer", fontFamily: FONT.mono }}>Deploy → Allocate</button>
            </div>
            {form === "tile" && (
              <div role="list" style={{ marginTop: 8 }}>
                {d.rows.map(r => (
                  <div role="listitem" key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center", padding: "4px 0", borderBottom: `1px solid ${t.borderSubtle}` }}>
                    <span style={{ fontSize: 11.5, color: t.textSecondary }}>{r.account} · {r.wrapper} <span style={{ color: t.textFaint, fontSize: 10 }}>edited {age(r.updatedAt)}</span></span>
                    {edit === r.id ? (
                      <span style={{ display: "flex", gap: 4 }}>
                        <input aria-label={`New ${r.currency} balance`} autoFocus value={amt} onChange={e => setAmt(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { save(r.id, amt); setEdit(null); } if (e.key === "Escape") setEdit(null); }}
                          style={{ width: 90, background: t.surfaceInset, color: t.text, border: `1px solid ${t.border}`, borderRadius: 3, fontFamily: FONT.mono, fontSize: 11, padding: "2px 5px" }} />
                        <button onClick={() => { save(r.id, amt); setEdit(null); }} disabled={saving} style={{ background: "transparent", border: `1px solid ${t.accent}`, color: t.accent, borderRadius: 3, fontSize: 10, cursor: "pointer" }}>Save</button>
                      </span>
                    ) : (
                      <span style={{ fontFamily: FONT.mono, fontSize: 11.5, color: t.text }}>{r.currency === "GBP" ? gbp(r.amount, { dp: 2 }) : `${num(r.amount, { dp: 2 })} ${r.currency}`}
                        {r.currency !== "GBP" && <span style={{ fontSize: 10, color: r.fxStale || r.fxMissing ? t.warning : t.textFaint }}> = {r.gbp != null ? gbp(r.gbp) : "no FX rate"}{r.fxStale ? " (FX stale)" : ""}</span>}
                      </span>
                    )}
                    {edit !== r.id && <button onClick={() => { setEdit(r.id); setAmt(String(r.amount)); }} aria-label={`Edit ${r.account} balance`} style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer" }}>✎</button>}
                  </div>
                ))}
              </div>
            )}
            {form === "combined" && composition && (
              <div style={{ marginTop: 8 }}>
                <Ribbon summary={`Cash against the rest of the book`} segments={composition.groups.map((g, i) => ({ key: g.label, label: g.label, value: g.weight, colour: g.label === "Cash" ? t.text : cat(t, i + 1) }))} />
              </div>
            )}
            {form === "meter" && (
              <div role="img" aria-label={`Cash ${d.shareOfBookPct}% of the book${d.buffer ? ` against a ${d.buffer.pct}% mandate buffer` : ""}`} style={{ marginTop: 10 }}>
                <div style={{ position: "relative", height: 14, background: t.surfaceInset, borderRadius: 7 }}>
                  <div style={{ position: "absolute", inset: 0, width: `${Math.min(100, d.shareOfBookPct * 4)}%`, background: t.info, borderRadius: 7 }} />
                  {d.buffer && <div title={`Buffer ${d.buffer.pct}%`} style={{ position: "absolute", left: `${Math.min(100, d.buffer.pct * 4)}%`, top: -4, width: 2, height: 22, background: t.warning }} />}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: t.textFaint, fontFamily: FONT.mono, marginTop: 2 }}><span>0%</span><span>scale to 25% of the book</span><span>25%</span></div>
                {d.buffer ? <Muted size={10.5}>Mandate buffer {d.buffer.pct}% = {gbp(d.buffer.gbp)}; deployable above it {gbp(d.buffer.deployable)}{d.buffer.shortfall > 0 ? `; short of the buffer by ${gbp(d.buffer.shortfall)}` : ""}.</Muted> : <Muted>No mandate buffer set.</Muted>}
              </div>
            )}
            {form === "currency" && (
              <div role="list" style={{ marginTop: 8 }}>
                {d.byCurrency.map(c => <div role="listitem" key={c.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, padding: "2px 0" }}><span>{c.label}</span><span style={{ fontFamily: FONT.mono }}>{gbp(c.gbp)} · {pct(c.pct, { dp: 1, sign: false })}</span></div>)}
                {d.fxMissing?.length > 0 && <Muted size={10}>No FX rate for {d.fxMissing.join(", ")} — counted as nothing until a quote arrives.</Muted>}
              </div>
            )}
            <SrOnly>{textAlt}</SrOnly>
          </>
        )}
      </StateView>
    </Frame>
  );
}

// ─── OV-21 watchlist strip ────────────────────────────────────

export function WatchlistView({ status, data: d, reason, asOf, source, basis, coverage, stale, textAlt, add, alert, msg, size = "m", page, refetch }) {
  const t = useT();
  const [sym, setSym] = useState("");
  const [alertFor, setAlertFor] = useState(null);
  const [th, setTh] = useState("");
  const [dir, setDir] = useState("below");
  const tiers = { 1: "Tier 1", 2: "Tier 2", 3: "Tier 3" };
  const rows = d?.rows ?? [];
  return (
    <Frame id="watchlist" label="Watchlist" title="Not owned, watched"
      right={<StaleBadge stale={stale} asOf={asOf} />}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} note="Alerts are delivered in-app only." />}>
      <form onSubmit={e => { e.preventDefault(); add(sym); setSym(""); }} style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        <input aria-label="Add a symbol to the watchlist" value={sym} onChange={e => setSym(e.target.value)} placeholder="Add symbol…"
          style={{ flex: 1, background: t.surfaceInset, color: t.text, border: `1px solid ${t.border}`, borderRadius: 3, fontFamily: FONT.mono, fontSize: 11, padding: "3px 6px" }} />
        <button type="submit" style={{ background: "transparent", border: `1px solid ${t.borderStrong}`, color: t.textSecondary, borderRadius: 3, fontSize: 10.5, cursor: "pointer" }}>+ Add</button>
      </form>
      {msg && <div role="status" style={{ fontSize: 10.5, color: t.textMuted, marginBottom: 4 }}>{msg}</div>}
      <StateView status={status} reason={reason} onRetry={refetch} height={100}>
        {rows.length > 0 && (
          <div role="list">
            {[1, 2, 3].map(tier => rows.some(r => r.tier === tier) && (
              <div key={tier}>
                <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.2, color: t.textFaint, marginTop: 4 }}>{tiers[tier].toUpperCase()}</div>
                {rows.filter(r => r.tier === tier).map(r => (
                  <div role="listitem" key={r.id} style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                    <div style={{ display: "grid", gridTemplateColumns: "72px 1fr 64px 60px 22px", gap: 6, alignItems: "center", padding: "4px 0" }}>
                      <button onClick={() => page?.onNavigate?.("research", { symbol: r.symbol })} title="Open in Research" style={{ background: "transparent", border: "none", padding: 0, textAlign: "left", fontFamily: FONT.mono, fontSize: 11.5, fontWeight: 700, color: t.text, cursor: "pointer" }}>{r.symbol}</button>
                      <Sparkline values={r.spark} width={70} height={16} />
                      <span style={{ fontFamily: FONT.mono, fontSize: 11, textAlign: "right" }}>{r.price == null ? <NoData reason={r.priceReason} /> : price(r.price, r.currency)}</span>
                      <span style={{ fontFamily: FONT.mono, fontSize: 11, textAlign: "right", color: signColour(t, r.dayPct) }}>{r.dayPct == null ? "——" : pct(r.dayPct)}</span>
                      <button onClick={() => setAlertFor(a => a === r.symbol ? null : r.symbol)} aria-label={`Set a price alert on ${r.symbol}`} title={r.activeAlerts ? `${r.activeAlerts} alert(s) armed` : "Quick alert"} style={{ background: "transparent", border: "none", cursor: "pointer", color: r.activeAlerts ? t.warning : t.textFaint }}>🔔</button>
                    </div>
                    {r.target != null && <div style={{ fontSize: 9.5, color: t.textFaint, marginBottom: 3 }}>your target {price(r.target, r.currency)}{r.toTargetPct != null ? ` · ${pct(r.toTargetPct, { dp: 1 })} away` : ""}</div>}
                    {alertFor === r.symbol && (
                      <form onSubmit={e => { e.preventDefault(); alert(r.symbol, dir, th); setAlertFor(null); setTh(""); }} style={{ display: "flex", gap: 4, margin: "0 0 5px" }}>
                        <select aria-label="Direction" value={dir} onChange={e => setDir(e.target.value)} style={{ background: t.surfaceInset, color: t.text, border: `1px solid ${t.border}`, fontSize: 10.5 }}><option value="below">falls below</option><option value="above">rises above</option></select>
                        <input aria-label="Alert price" value={th} onChange={e => setTh(e.target.value)} placeholder="price" style={{ width: 70, background: t.surfaceInset, color: t.text, border: `1px solid ${t.border}`, fontFamily: FONT.mono, fontSize: 10.5 }} />
                        <button type="submit" style={{ background: "transparent", border: `1px solid ${t.accent}`, color: t.accent, fontSize: 10, cursor: "pointer" }}>Arm</button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        <SrOnly>{textAlt}</SrOnly>
      </StateView>
    </Frame>
  );
}

// ─── OV-22 accounts ───────────────────────────────────────────

export function AccountsView({ status, data: d, reason, asOf, source, basis, coverage, stale, note, textAlt, size = "m", page, refetch }) {
  const t = useT();
  const [form, setForm] = useState("cards");
  return (
    <Frame id="accounts" label="Accounts" title="Where it is held"
      right={<><StaleBadge stale={stale} asOf={asOf} /><Segmented label="Accounts form" value={form} onChange={setForm} options={[{ value: "cards", label: "Cards" }, { value: "split", label: "Wrappers" }, { value: "allowance", label: "ISA" }]} /></>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} note={note} />}>
      <StateView status={status} reason={reason} onRetry={refetch} height={120}>
        {d && (
          <>
            {form === "cards" && (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${size === "s" ? 1 : 2}, minmax(0,1fr))`, gap: 6 }}>
                {d.rows.map(r => (
                  <button key={`${r.account}|${r.wrapper}`} onClick={() => page?.onNavigate?.("holdings", { query: { account: r.account } })} title="Show this account's holdings"
                    style={{ textAlign: "left", background: t.surfaceInset, border: `1px solid ${t.border}`, borderRadius: 6, padding: 8, cursor: "pointer", color: "inherit" }}>
                    <div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: t.textFaint }}>{r.wrapperLabel}</div>
                    <div style={{ fontSize: 12, color: t.text }}>{r.account}</div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 15, color: t.text }}>{gbpCompact(r.total)}</div>
                    <div style={{ fontSize: 10, color: t.textFaint }}>{r.holdings} holding{r.holdings === 1 ? "" : "s"} · cash {gbpCompact(r.cash)} · {pct(r.pct, { dp: 1, sign: false })}</div>
                  </button>
                ))}
              </div>
            )}
            {form === "split" && <Ribbon summary={textAlt} segments={d.byWrapper.map((w, i) => ({ key: w.wrapper, label: w.label, value: (w.pct ?? 0) / 100, colour: cat(t, i) }))} />}
            {form === "allowance" && (
              <Placeholder title={`ISA allowance · ${d.allowance.taxYear}`} reason={`${d.allowance.reason} The limit for ${d.allowance.taxYear} is £${d.allowance.isaLimit.toLocaleString("en-GB")}.`} unblocks="contributions are recorded per wrapper" height={90} />
            )}
            <SrOnly>{textAlt}</SrOnly>
          </>
        )}
      </StateView>
    </Frame>
  );
}

// ─── OV-23 goal ───────────────────────────────────────────────

export function GoalView({ status, data: d, reason, asOf, source, basis, coverage, stale, note, textAlt, saveGoal, clear, errors, size = "m", refetch }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ target: "", targetDate: "", monthly: "" });
  const [view, setView] = useState("progress");
  const noGoal = status === "refused" && /No goal/.test(reason ?? "");
  const editor = (
    <form onSubmit={e => { e.preventDefault(); saveGoal(form); setEditing(false); }} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-end", marginTop: 8 }}>
      {[["target", "Target £", "number"], ["targetDate", "By", "date"], ["monthly", "Monthly £", "number"]].map(([k, l, type]) => (
        <label key={k} style={{ display: "flex", flexDirection: "column", fontSize: 9.5, color: t.textFaint, fontFamily: FONT.mono, gap: 2 }}>{l}
          <input required type={type} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} style={{ background: t.surfaceInset, color: t.text, border: `1px solid ${t.border}`, borderRadius: 3, fontFamily: FONT.mono, fontSize: 11.5, padding: "3px 6px", width: k === "targetDate" ? 140 : 100 }} />
        </label>
      ))}
      <button type="submit" style={{ background: "transparent", border: `1px solid ${t.accent}`, color: t.accent, borderRadius: 3, fontSize: 11, padding: "4px 10px", cursor: "pointer" }}>Save goal</button>
      <Muted size={10}>All three are required; nothing is assumed. Enter 0 if you add nothing monthly.</Muted>
    </form>
  );
  return (
    <Frame id="goal" label="Goal" title="Target progress"
      right={<>{d && <Segmented label="Goal view" value={view} onChange={setView} options={[{ value: "progress", label: "Progress" }, { value: "fan", label: "Glide path" }]} />}
        {d && <button onClick={() => { setEditing(e => !e); setForm({ target: d.goal.target, targetDate: d.goal.targetDate, monthly: d.goal.monthly }); }} style={{ background: "transparent", border: "none", color: t.info, cursor: "pointer", fontSize: 11 }}>Edit</button>}</>}
      footer={<ProvenanceFooter source={source} asOf={asOf} basis={basis} coverage={coverage} note={note} method={d?.method} />}>
      {errors && <div role="alert" style={{ fontSize: 11, color: t.negative }}>{errors.join(" ")}</div>}
      {noGoal ? (
        <div>
          <div style={{ fontSize: 12.5, color: t.textSecondary }}>No goal set. Set a target and date to see progress.</div>
          {editor}
        </div>
      ) : (
        <StateView status={status} reason={reason} onRetry={refetch} height={120}>
          {d && (
            <>
              {editing && editor}
              <div style={{ display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap" }}>
                <span style={{ fontFamily: FONT.serif, fontSize: 22, color: t.text }}>{gbpCompact(d.initial)} of {gbpCompact(d.goal.target)}</span>
                <span style={{ fontFamily: FONT.mono, fontSize: 11, color: t.textMuted }}>by {date(d.goal.targetDate)} · {num(d.years, { dp: 1 })} years · £{d.goal.monthly}/month</span>
              </div>
              {view === "progress" && (
                <>
                  <div role="img" aria-label={`${d.progressPct}% of the target reached`} style={{ position: "relative", height: 12, background: t.surfaceInset, borderRadius: 6, margin: "8px 0" }}>
                    <div style={{ position: "absolute", inset: 0, width: `${Math.min(100, d.progressPct)}%`, background: t.info, borderRadius: 6 }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
                    <Stat size="s" label="Reach it in" value={`${d.probabilityPct}%`} sub={`of ${d.pathsSimulated.toLocaleString("en-GB")} resampled paths`} />
                    <Stat size="s" label="Median outcome" value={gbpCompact(d.median)} sub={d.medianShortfall ? `short by ${gbpCompact(d.medianShortfall)}` : `ahead by ${gbpCompact(d.medianSurplus)}`} />
                    <Stat size="s" label="Monthly for 50%" value={gbp(d.requiredMonthlyForFiftyPct)} sub="solved on the same history" />
                  </div>
                </>
              )}
              {view === "fan" && <FanChart bands={d.bands} goal={d.goal.target} height={size === "s" ? 170 : 210} summary={textAlt} />}
              <Muted size={10}>A described sample of this book's own past (annualised {pct(d.historyAnnualisedPct, { dp: 1 })}, volatility {pct(d.historyVolPct, { dp: 1, sign: false })}), not a forecast. <button onClick={clear} style={{ background: "transparent", border: "none", color: t.textFaint, cursor: "pointer", fontSize: 10, textDecoration: "underline" }}>Remove goal</button></Muted>
              <SrOnly>{textAlt}</SrOnly>
            </>
          )}
        </StateView>
      )}
    </Frame>
  );
}
