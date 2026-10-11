// SpecSlot â€” wraps one registry def. Renders the shell + either the
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

  // Ask the def's own hook what state it's in â€” same hook the real page uses.
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
    ? `${out.source}${out.asOf ? ` Â· ${new Date(out.asOf).toLocaleString("en-GB")}` : ""}`
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
