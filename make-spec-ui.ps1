# make-spec-ui.ps1 — creates the spec-box skeleton
$ErrorActionPreference = 'Stop'
$root = (Get-Item $PSScriptRoot).FullName
$dev  = Join-Path $root 'src\dev'
New-Item -ItemType Directory -Force -Path $dev | Out-Null

# ── 1. SpecBox.jsx ───────────────────────────────────────────
@'
// SpecBox — the permanent shell every panel lives in.
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
          {needs.endpoints?.length ? <span title="Endpoints this box reads">→ {needs.endpoints.join(" ")}</span> : null}
          {needs.deps?.length ? <span title="Data-version parts this box depends on">⇄ {needs.deps.join(" ")}</span> : null}
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
'@ | Set-Content -Path (Join-Path $dev 'SpecBox.jsx') -Encoding UTF8

# ── 2. Placeholder.jsx ───────────────────────────────────────
@'
// Placeholder — the interior content until the real view is built.
// Shapes are deliberately ugly. They exist to say "something goes here".
import React from "react";
import { useT, FONT } from "../shared/theme.jsx";

export function Placeholder({ shape = "blocks", note = "designed later", lines = 4, columns = null }) {
  const t = useT();

  if (shape === "text") {
    return <p style={{ fontSize: 11.5, color: t.textMuted, fontStyle: "italic", margin: 0 }}>{note}</p>;
  }

  if (shape === "table" && columns) {
    return (
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT.mono, fontSize: 10.5, color: t.textFaint }}>
        <thead>
          <tr>{columns.map(c => <th key={c} style={{ textAlign: "left", borderBottom: `1px solid ${t.borderSubtle}`, padding: "3px 6px" }}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {Array.from({ length: lines }, (_, i) => (
            <tr key={i}>{columns.map(c => <td key={c} style={{ padding: "3px 6px", borderBottom: `1px solid ${t.borderSubtle}` }}>·  ·  ·</td>)}</tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (shape === "chart") {
    return (
      <div style={{
        height: 100, borderRadius: 4,
        background: `repeating-linear-gradient(90deg, ${t.surfaceInset} 0 8px, transparent 8px 16px)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: FONT.mono, fontSize: 10, color: t.textFaint,
      }}>
        {note}
      </div>
    );
  }

  // default: blocks
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} style={{ height: 12, background: t.surfaceInset, borderRadius: 3, width: `${100 - i * 8}%` }} />
      ))}
      {note && <div style={{ fontFamily: FONT.mono, fontSize: 10, color: t.textFaint, marginTop: 2 }}>{note}</div>}
    </div>
  );
}
'@ | Set-Content -Path (Join-Path $dev 'Placeholder.jsx') -Encoding UTF8

# ── 3. SpecSlot.jsx ──────────────────────────────────────────
@'
// SpecSlot — wraps one registry def. Renders the shell + either the
// placeholder or the real view.
//
// To turn a panel "on" for real, pass renderReal={true} (or flip the
// default below once you've built its view). Nothing else changes.
import React from "react";
import { usePage } from "../shared/layout.jsx";
import { SpecBox } from "./SpecBox.jsx";
import { Placeholder } from "./Placeholder.jsx";

export function SpecSlot({ def, renderReal = false, shape = "blocks", note = "designed later" }) {
  const page = usePage();

  // Ask the def's own hook what state it's in — same hook the real page uses.
  const out = (() => {
    try { return def.useData({}, page); }
    catch (e) { return { status: "error", reason: String(e?.message ?? e) }; }
  })();

  const status = out.status ?? (out.available === false ? "refused" : out.available === true ? "ready" : "idle");
  const reason = out.reason ?? null;

  // Pull endpoints + deps straight from the def's spec, so the box's
  // "needs" line is always truthful.
  const endpoints = (() => { try { return Object.values(def.spec.endpoints({}, page)).filter(Boolean); } catch { return []; } })();
  const deps = (() => { try { return [...new Set(Object.values(def.spec.deps ?? {}).flat().filter(Boolean))]; } catch { return []; } })();

  const footer = out.source
    ? `${out.source}${out.asOf ? ` · ${new Date(out.asOf).toLocaleString("en-GB")}` : ""}`
    : null;

  return (
    <SpecBox
      checklist={def.checklist}
      title={def.title}
      status={status}
      reason={reason}
      needs={{ endpoints, deps }}
      footer={footer}
    >
      {renderReal
        ? <def.View {...out} size="m" page={page} />
        : <Placeholder shape={shape} note={note} />}
    </SpecBox>
  );
}
'@ | Set-Content -Path (Join-Path $dev 'SpecSlot.jsx') -Encoding UTF8

# ── 4. SpecPage.jsx ──────────────────────────────────────────
@'
// SpecPage — every panel in the app, as a box, on one page.
// Scan it to see progress. Nothing here is a design; it is a checklist.
import React from "react";
import { useT, FONT } from "../shared/theme.jsx";
import { PAGES } from "../registry-all.js";
import { SpecSlot } from "./SpecSlot.jsx";

// Optional: per-component placeholder shape + note overrides.
const SHAPES = {
  // "OV-14": { shape: "chart", note: "concentration bars" },
};

export default function SpecPage() {
  const t = useT();

  return (
    <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto" }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: FONT.serif, fontSize: 24, color: t.text, margin: 0 }}>
          Specification sheet
        </h1>
        <p style={{ fontSize: 11.5, color: t.textMuted, margin: "4px 0 0" }}>
          Every panel the app will have. Status comes from the panel's own hook.
          Grey interior = not yet designed. Flip <code>renderReal</code> in
          SpecSlot once a view exists.
        </p>
      </header>

      {Object.entries(PAGES).map(([pageKey, registry]) => (
        <section key={pageKey} style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1.6, color: t.textMuted, borderBottom: `1px solid ${t.borderSubtle}`, paddingBottom: 4 }}>
            {pageKey.toUpperCase()}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 12, marginTop: 10 }}>
            {Object.entries(registry).map(([id, def]) => (
              <SpecSlot
                key={`${pageKey}-${id}`}
                def={def}
                shape={SHAPES[def.checklist]?.shape ?? "blocks"}
                note={SHAPES[def.checklist]?.note}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
'@ | Set-Content -Path (Join-Path $dev 'SpecPage.jsx') -Encoding UTF8

Write-Host ""
Write-Host "Created:"
Write-Host "  src/dev/SpecBox.jsx"
Write-Host "  src/dev/Placeholder.jsx"
Write-Host "  src/dev/SpecSlot.jsx"
Write-Host "  src/dev/SpecPage.jsx"
Write-Host ""
Write-Host "Next: wire one route (see caveats)."