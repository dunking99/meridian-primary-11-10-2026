// SpecBox â€” the permanent shell every panel lives in.
// Shell = title + checklist + status + needs + slot + footer.
// Interior is a slot: placeholder now, real view later.
import React from "react";
import { useT, FONT } from "../shared/theme.jsx";

const CHIP = (t) => ({
  "not-built": { label: "NOT BUILT", colour: t.textFaint },
  "no-data":   { label: "NO DATA",   colour: t.warning },
  "refused":   { label: "REFUSED",   colour: t.warning },
  "partial":   { label: "PARTIAL",   colour: t.info },
  "ready":     { label: "READY",     colour: t.positive },
  "error":     { label: "ERROR",     colour: t.negative },
  "loading":   { label: "LOADING",   colour: t.textMuted },
  "idle":      { label: "IDLE",      colour: t.textMuted },
});

export function SpecBox({
  checklist, title, status = "idle", reason = null,
  needs = null, footer = null, children,
}) {
  const t = useT();
  const chip = (CHIP(t)[status]) ?? CHIP(t).idle;
  return (
    <section
      id={`spec-${checklist}`}
      style={{
        border: `1px solid ${t.border}`, borderRadius: 6, background: t.surface,
        display: "flex", flexDirection: "column", minHeight: 180, overflow: "hidden",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderBottom: `1px solid ${t.borderSubtle}` }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 1.2, color: t.textMuted }}>{checklist}</span>
        <span style={{ fontSize: 12.5, color: t.text, flex: 1 }}>{title}</span>
        <span title={reason ?? ""} style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 1, color: chip.colour, border: `1px solid ${chip.colour}`, borderRadius: 8, padding: "1px 6px" }}>
          {chip.label}
        </span>
      </header>
      {needs && (
        <div style={{ padding: "4px 10px", borderBottom: `1px solid ${t.borderSubtle}`, fontFamily: FONT.mono, fontSize: 10, color: t.textFaint, display: "flex", gap: 14, flexWrap: "wrap" }}>
          {needs.endpoints?.length ? <span title="Endpoints this box reads">â†’ {needs.endpoints.join(" ")}</span> : null}
          {needs.deps?.length ? <span title="Data-version parts this box depends on">â‡„ {needs.deps.join(" ")}</span> : null}
        </div>
      )}
      {reason && status !== "ready" && (
        <div style={{ padding: "4px 10px", fontSize: 11, color: t.textSecondary, borderBottom: `1px solid ${t.borderSubtle}` }}>
          {reason}
        </div>
      )}
      <div style={{ padding: 10, flex: 1, minHeight: 0 }}>{children}</div>
      {footer && (
        <footer style={{ padding: "4px 10px", borderTop: `1px solid ${t.borderSubtle}`, fontSize: 10, color: t.textFaint }}>
          {footer}
        </footer>
      )}
    </section>
  );
}
