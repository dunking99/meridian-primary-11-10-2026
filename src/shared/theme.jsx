// Theme tokens for the Portfolio pages.
//
// App.jsx owns THEMES and its ThemeContext and is deliberately one file, so the
// new pages do not import from it. App.jsx hands its current token set in as a
// prop and it is provided here; every new component reads colours only from
// this context — no literal colour appears in any new file.

import React, { createContext, useContext } from "react";

const TokenContext = createContext(null);

export function TokenProvider({ tokens, children }) {
  return <TokenContext.Provider value={tokens}>{children}</TokenContext.Provider>;
}

export function useT() {
  const t = useContext(TokenContext);
  if (!t) throw new Error("useT() used outside a TokenProvider — wrap the page in <TokenProvider tokens={theme}>.");
  return t;
}

/** Categorical series colour i (cycles through the eight chart tokens). */
export const cat = (t, i) => t[`cat${(i % 8) + 1}`];

/** A token mixed towards transparent — for soft fills without a new literal. */
export const soft = (colour, pct = 18) => `color-mix(in srgb, ${colour} ${pct}%, transparent)`;

/** Mix two tokens, e.g. a diverging scale between loss and gain. */
export const mix = (a, b, pctA) => `color-mix(in srgb, ${a} ${Math.max(0, Math.min(100, pctA)).toFixed(1)}%, ${b})`;

/** Gain / loss / flat colour for a signed number. Never the only signal: views also print the sign. */
export const signColour = (t, v) => (v == null || v === 0 ? t.textMuted : v > 0 ? t.positive : t.negative);

export const FONT = {
  mono: "'SF Mono', 'Menlo', 'Consolas', 'Courier New', monospace",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  serif: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
};

/** Hatched fill for "no value" cells and unseen shares — absence, drawn as absence. */
export const hatch = t => `repeating-linear-gradient(45deg, ${t.surfaceAlt} 0px, ${t.surfaceAlt} 3px, ${t.surfaceInset} 3px, ${t.surfaceInset} 6px)`;
