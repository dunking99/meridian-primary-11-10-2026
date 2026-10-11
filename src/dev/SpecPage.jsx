// SpecPage â€” every panel in the app, as a box, on one page.
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
