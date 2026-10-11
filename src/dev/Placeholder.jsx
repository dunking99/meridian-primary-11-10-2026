// Placeholder â€” the interior content until the real view is built.
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
            <tr key={i}>{columns.map(c => <td key={c} style={{ padding: "3px 6px", borderBottom: `1px solid ${t.borderSubtle}` }}>Â·  Â·  Â·</td>)}</tr>
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
