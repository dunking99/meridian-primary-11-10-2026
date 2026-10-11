// Shared building blocks for the Portfolio pages: panel frame, section label,
// loading / refused / error states, stale badge, basis tag, provenance footer
// with an "explain this figure" popover, explained placeholder, themed NoData,
// coverage bar with named missing holdings, segmented toggle, stat tile.
//
// Views compose these; none of them fetches anything.

import React, { useEffect, useId, useRef, useState } from "react";
import { useT, FONT, soft, hatch, signColour } from "./theme.jsx";
import { age, dateTime, MISSING } from "./format.js";

// ─── Preferences and motion ───────────────────────────────────

/** Per-viewer UI preference in localStorage; never used for data. */
export function useLocalPref(key, initial) {
  const [v, setV] = useState(() => {
    try { const raw = localStorage.getItem(`meridian_pref_${key}`); return raw == null ? initial : JSON.parse(raw); }
    catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(`meridian_pref_${key}`, JSON.stringify(v)); } catch { /* private mode */ } }, [key, v]);
  return [v, setV];
}

export function useReducedMotion() {
  const [r, setR] = useState(() => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } });
  useEffect(() => {
    let mq; try { mq = window.matchMedia("(prefers-reduced-motion: reduce)"); } catch { return undefined; }
    const on = () => setR(mq.matches); mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return r;
}

// ─── Text pieces ──────────────────────────────────────────────

export function SectionLabel({ index, children }) {
  const t = useT();
  return (
    <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.6, color: t.textMuted, textTransform: "uppercase" }}>
      {index != null ? `${String(index).padStart(2, "0")} — ` : ""}{children}
    </div>
  );
}

export function NoData({ reason = "No data", inline = true }) {
  const t = useT();
  return (
    <span title={reason} aria-label={`Not available: ${reason}`} role="img"
      style={{ color: t.textFaint, fontFamily: FONT.mono, fontSize: inline ? "inherit" : 12, letterSpacing: 1, cursor: "help" }}>
      {MISSING}
    </span>
  );
}

export function Muted({ children, size = 11, style }) {
  const t = useT();
  return <div style={{ fontSize: size, color: t.textFaint, lineHeight: 1.5, ...style }}>{children}</div>;
}

/** A signed figure: colour plus an explicit sign, never colour alone. */
export function Signed({ value, children, strong = false, size }) {
  const t = useT();
  return <span style={{ color: signColour(t, value), fontFamily: FONT.mono, fontWeight: strong ? 700 : 500, fontSize: size, fontVariantNumeric: "tabular-nums" }}>{children}</span>;
}

// ─── Tags and badges ──────────────────────────────────────────

export function BasisTag({ basis }) {
  const t = useT();
  if (!basis) return null;
  const text = String(basis);
  const kind = /^Recorded/i.test(text) ? "RECORDED" : /^Reconstructed|reconstruct/i.test(text) ? "RECONSTRUCTED" : /estimate/i.test(text) ? "ESTIMATE" : "LIVE";
  return (
    <span title={text} tabIndex={0} aria-label={`Basis: ${kind.toLowerCase()}. ${text}`}
      style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.2, padding: "2px 6px", borderRadius: 3, border: `1px solid ${t.borderStrong}`, color: t.textSecondary, background: t.surfaceInset, whiteSpace: "nowrap", cursor: "help" }}>
      {kind}
    </span>
  );
}

export function StaleBadge({ stale, asOf }) {
  const t = useT();
  if (!stale) return null;
  return (
    <span role="status" title={asOf ? `Last updated ${dateTime(asOf)}` : "Age unknown"}
      style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, padding: "2px 6px", borderRadius: 3, color: t.warning, background: t.warningSoft, border: `1px solid ${soft(t.warning, 45)}` }}>
      STALE · {age(asOf)}
    </span>
  );
}

export function Chip({ children, onClick, active = false, title, weight }) {
  const t = useT();
  const Tag = onClick ? "button" : "span";
  return (
    <Tag onClick={onClick} title={title} aria-pressed={onClick ? active : undefined}
      style={{ display: "inline-flex", gap: 5, alignItems: "baseline", fontFamily: FONT.mono, fontSize: 10.5, padding: "2px 7px", borderRadius: 10,
        border: `1px solid ${active ? t.accent : t.border}`, background: active ? t.accentSoft : "transparent", color: active ? t.accent : t.textSecondary,
        cursor: onClick ? "pointer" : "default" }}>
      {children}{weight != null && <span style={{ color: t.textFaint }}>{weight}</span>}
    </Tag>
  );
}

// ─── Explain popover (EX-07) ──────────────────────────────────

export function Explain({ title = "About this figure", children, label = "Explain" }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const id = useId();
  const btn = useRef(null);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    const onDown = e => { if (!box.current?.contains(e.target) && !btn.current?.contains(e.target)) setOpen(false); };
    window.addEventListener("keydown", onKey); window.addEventListener("mousedown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onDown); };
  }, [open]);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button ref={btn} onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={id} title={title}
        style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: 10, fontSize: 10, padding: "1px 7px", cursor: "pointer", fontFamily: FONT.mono }}>
        {label === "Explain" ? "?" : label}
      </button>
      {open && (
        <div ref={box} id={id} role="dialog" aria-label={title}
          style={{ position: "absolute", zIndex: 50, right: 0, top: "calc(100% + 6px)", width: 320, maxWidth: "80vw", background: t.tooltipBg, border: `1px solid ${t.borderStrong}`, borderRadius: 6, padding: "10px 12px", fontSize: 11.5, lineHeight: 1.55, color: t.textSecondary, boxShadow: `0 8px 24px ${soft(t.appBg, 60)}` }}>
          <div style={{ fontWeight: 700, color: t.text, marginBottom: 6 }}>{title}</div>
          {children}
        </div>
      )}
    </span>
  );
}

/** The method / source / window / coverage block most explain popovers show. */
export function ExplainBody({ source, basis, coverage, note, asOf, method }) {
  const t = useT();
  const row = (k, v) => v ? <div style={{ marginBottom: 5 }}><span style={{ color: t.textFaint, fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 1 }}>{k} </span>{v}</div> : null;
  return (
    <>
      {row("METHOD", method)}
      {row("SOURCE", source)}
      {row("BASIS", basis)}
      {row("AS OF", asOf ? dateTime(asOf) : null)}
      {row("COVERAGE", coverage?.note ?? (coverage?.share != null ? `${(coverage.share * 100).toFixed(1)}% of the book` : null))}
      {coverage?.missing?.length ? row("NOT INCLUDED", coverage.missing.map(m => `${m.symbol} (${m.reason})`).join("; ")) : null}
      {row("NOTE", note)}
    </>
  );
}

// ─── Provenance footer (F-29 / SC-2) ──────────────────────────

export function ProvenanceFooter({ source, asOf, basis, coverage, note, method, extra }) {
  const t = useT();
  if (!source && !asOf && !basis) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", borderTop: `1px solid ${t.borderSubtle}`, padding: "8px 14px", fontSize: 10, color: t.textFaint, fontFamily: FONT.sans, lineHeight: 1.45 }}>
      <span style={{ flex: 1, minWidth: 180 }}>
        {source ? `Source: ${source}` : null}
        {asOf ? ` · as of ${dateTime(asOf)}` : ""}
        {extra ? ` · ${extra}` : ""}
      </span>
      <BasisTag basis={basis} />
      <Explain title="Where this comes from">
        <ExplainBody source={source} basis={basis} coverage={coverage} note={note} asOf={asOf} method={method} />
      </Explain>
    </div>
  );
}

// ─── Frame ────────────────────────────────────────────────────

export function Frame({ index, label, title, right, children, footer, id, minHeight, dark = false, pad = true }) {
  const t = useT();
  return (
    <section aria-labelledby={id ? `${id}-title` : undefined} data-component={id}
      style={{ background: dark ? t.chromeBg : t.surface, border: `1px solid ${t.border}`, borderRadius: 8, display: "flex", flexDirection: "column", minWidth: 0, minHeight, overflow: "visible" }}>
      {(label || title || right) && (
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, padding: "12px 14px 8px", flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            {label && <SectionLabel index={index}>{label}</SectionLabel>}
            {title && <h3 id={id ? `${id}-title` : undefined} style={{ margin: "3px 0 0", fontFamily: FONT.serif, fontWeight: 600, fontSize: 17, color: t.text, letterSpacing: 0.1 }}>{title}</h3>}
          </div>
          {right && <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>{right}</div>}
        </header>
      )}
      <div style={{ padding: pad ? "4px 14px 12px" : 0, flex: 1, minWidth: 0 }}>{children}</div>
      {footer}
    </section>
  );
}

// ─── States (SC-1) ────────────────────────────────────────────

export function Skeleton({ lines = 4, height = 140 }) {
  const t = useT();
  const reduced = useReducedMotion();
  return (
    <div aria-busy="true" aria-label="Loading" style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: height, justifyContent: "center" }}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} style={{ height: 10, width: `${90 - i * 12}%`, borderRadius: 4, background: t.surfaceInset, opacity: reduced ? 0.8 : undefined, animation: reduced ? "none" : "meridianPulse 1.4s ease-in-out infinite" }} />
      ))}
      <style>{"@keyframes meridianPulse { 0%,100% { opacity: .45 } 50% { opacity: .9 } }"}</style>
    </div>
  );
}

/**
 * Standard rendering for the non-ready states. Wording is the engine's own
 * reason (British English, written server-side) so a refusal says exactly
 * why, and never reassures.
 */
export function StateView({ status, reason, children, height = 140, onRetry, empty }) {
  const t = useT();
  if (status === "loading") return <Skeleton height={height} />;
  if (status === "error") {
    return (
      <div role="alert" style={{ minHeight: height, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8, color: t.negative, fontSize: 12 }}>
        <div>⚠ {reason ?? "Something went wrong."}</div>
        {onRetry && <button onClick={onRetry} style={{ alignSelf: "flex-start", background: "transparent", border: `1px solid ${t.borderStrong}`, color: t.textSecondary, borderRadius: 3, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>Try again</button>}
      </div>
    );
  }
  if (status === "refused") {
    return (
      <div role="note" style={{ minHeight: height, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 1.2, color: t.textFaint }}>NOT AVAILABLE</div>
        <div style={{ fontSize: 12.5, color: t.textSecondary, lineHeight: 1.55, maxWidth: 560 }}>{reason}</div>
        {empty}
      </div>
    );
  }
  return children;
}

/** An explained "not built / not available yet" block. Never sample data. */
export function Placeholder({ title, reason, unblocks, height = 120 }) {
  const t = useT();
  return (
    <div role="note" style={{ minHeight: height, border: `1px dashed ${t.borderStrong}`, borderRadius: 8, padding: "14px 16px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 6, background: hatch(t) }}>
      {title && <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.4, color: t.textMuted, textTransform: "uppercase" }}>{title}</div>}
      <div style={{ fontSize: 12.5, color: t.textSecondary, lineHeight: 1.55, background: t.surface, padding: "6px 8px", borderRadius: 4, alignSelf: "flex-start" }}>{reason}</div>
      {unblocks && <div style={{ fontSize: 10.5, color: t.textFaint, background: t.surface, padding: "2px 8px", borderRadius: 4, alignSelf: "flex-start" }}>Unblocks when: {unblocks}</div>}
    </div>
  );
}

// ─── Coverage bar + missing chips (VF-27) ─────────────────────

export function CoverageBar({ share, label = "Covered", missing = [], note }) {
  const t = useT();
  const s = share == null ? null : Math.max(0, Math.min(1, share));
  return (
    <div>
      {s != null && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: t.textMuted, fontFamily: FONT.mono, marginBottom: 4 }}>
            <span>{label} {(s * 100).toFixed(1)}%</span><span>not seen {((1 - s) * 100).toFixed(1)}%</span>
          </div>
          <div role="img" aria-label={`${label} ${(s * 100).toFixed(1)} percent; ${((1 - s) * 100).toFixed(1)} percent not seen`}
            style={{ display: "flex", height: 8, borderRadius: 3, overflow: "hidden", border: `1px solid ${t.border}` }}>
            <div style={{ width: `${s * 100}%`, background: t.info }} />
            <div style={{ flex: 1, background: hatch(t) }} />
          </div>
        </>
      )}
      {missing.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
          {missing.map(m => <Chip key={m.symbol} title={m.reason}>{m.symbol} ✕</Chip>)}
        </div>
      )}
      {note && <Muted size={10.5} style={{ marginTop: 4 }}>{note}</Muted>}
    </div>
  );
}

// ─── Segmented toggle (VF-28) ─────────────────────────────────

export function Segmented({ options, value, onChange, label, size = "s", disabled = {} }) {
  const t = useT();
  const refs = useRef([]);
  const idx = options.findIndex(o => (o.value ?? o) === value);
  const move = d => {
    let i = idx;
    for (let k = 0; k < options.length; k++) {
      i = (i + d + options.length) % options.length;
      const v = options[i].value ?? options[i];
      if (!disabled[v]) { onChange(v); refs.current[i]?.focus(); return; }
    }
  };
  return (
    <div role="radiogroup" aria-label={label} style={{ display: "inline-flex", flexWrap: "wrap", maxWidth: "100%", border: `1px solid ${t.border}`, borderRadius: 14, padding: 2, gap: 2, background: t.surfaceInset }}
      onKeyDown={e => { if (e.key === "ArrowRight") { e.preventDefault(); move(1); } if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); } }}>
      {options.map((o, i) => {
        const v = o.value ?? o; const text = o.label ?? o; const on = v === value; const dis = disabled[v];
        return (
          <button key={v} ref={el => { refs.current[i] = el; }} role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
            disabled={!!dis} title={typeof dis === "string" ? dis : o.title}
            onClick={() => onChange(v)}
            style={{ border: "none", borderRadius: 12, padding: size === "s" ? "3px 9px" : "5px 12px", fontSize: size === "s" ? 10.5 : 11.5, fontFamily: FONT.mono, cursor: dis ? "not-allowed" : "pointer",
              background: on ? t.text : "transparent", color: on ? t.surface : dis ? t.textFaint : t.textSecondary, textDecoration: dis ? "line-through" : "none" }}>
            {text}
          </button>
        );
      })}
    </div>
  );
}

// ─── Stat tile (VF-24) ────────────────────────────────────────

export function Stat({ label, value, sub, sign, explain, onClick, size = "m", reason }) {
  const t = useT();
  const valueEl = (
    <span style={{ fontFamily: FONT.mono, fontSize: size === "l" ? 24 : size === "s" ? 15 : 19, color: sign == null ? t.text : signColour(t, sign), fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
      {value == null ? <NoData reason={reason ?? "Not available"} /> : value}
    </span>
  );
  return (
    <div style={{ padding: "8px 10px", minWidth: 0 }}>
      <div style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 1.3, color: t.textMuted, textTransform: "uppercase", display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
        <span>{label}</span>{explain}
      </div>
      <div style={{ marginTop: 5 }}>
        {onClick ? (
          <button onClick={onClick} title={`Open ${label}`} style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>{valueEl}</button>
        ) : valueEl}
      </div>
      {sub && <div style={{ fontSize: 10.5, color: t.textFaint, marginTop: 3, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}

// ─── Error boundary (F-04) ────────────────────────────────────

export class PanelBoundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.warn(`[panel ${this.props.name}]`, error?.message); }
  render() {
    if (this.state.error) {
      return <this.props.Fallback name={this.props.name} message={String(this.state.error?.message ?? this.state.error)} />;
    }
    return this.props.children;
  }
}

export function PanelCrash({ name, message }) {
  const t = useT();
  return (
    <div role="alert" style={{ border: `1px solid ${t.negative}`, borderRadius: 8, padding: 14, fontSize: 12, color: t.negative, background: t.surface }}>
      ⚠ {name} failed to draw: {message}. The rest of the page is unaffected.
    </div>
  );
}

/** Visually hidden text for screen readers (chart text alternatives). */
export function SrOnly({ children }) {
  return <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>{children}</span>;
}
