// A Portfolio sub-page: tokens + page context + one layout file. App.jsx
// renders this with its current theme; nothing here reads App.jsx.
import React from "react";
import { TokenProvider, FONT } from "./theme.jsx";
import { PageProvider, LayoutPage } from "./layout.jsx";
import { useLocalPref } from "./ui.jsx";

export function SubPage({ theme, layouts, registry, onOpenHolding, onNavigate, extra, devSwitch = true, heading }) {
  const names = Object.keys(layouts);
  const [name, setName] = useLocalPref(`layout_${layouts[names[0]].page}`, names[0]);
  const layout = layouts[name] ?? layouts[names[0]];
  return (
    <TokenProvider tokens={theme}>
      <PageProvider onOpenHolding={onOpenHolding} onNavigate={onNavigate}>
        {heading}
        {devSwitch && names.length > 1 && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, alignItems: "center", fontSize: 10, fontFamily: FONT.mono, color: theme.textFaint, maxWidth: layout.maxWidth ?? 1180, margin: "0 auto 8px" }}>
            <label htmlFor={`layout-${layout.page}`}>LAYOUT (DEV)</label>
            <select id={`layout-${layout.page}`} value={name} onChange={e => setName(e.target.value)}
              style={{ background: theme.surfaceInset, color: theme.textSecondary, border: `1px solid ${theme.border}`, borderRadius: 3, fontSize: 10.5, fontFamily: FONT.mono }}>
              {names.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}
        <LayoutPage layout={layout} registry={registry} extra={extra} />
      </PageProvider>
    </TokenProvider>
  );
}
