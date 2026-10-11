// Shared pieces for the Overview hooks: a spec that reads one /overview block.
import { EP } from "../../shared/endpoints.js";
import { primary } from "../../shared/layout.jsx";

/** A spec reading `/overview?blocks=<name>`, unwrapped to that block's contract. */
export function blockSpec(name, { deps = ["prices", "book"], staleAfterMs = null, select = null, extra = null } = {}) {
  return {
    endpoints: (props, page) => ({ main: EP.ovBlock(name), ...(extra ? extra.endpoints(props, page) : {}) }),
    deps: { main: deps, ...(extra?.deps ?? {}) },
    adapt: { main: body => body?.blocks?.[name] ?? { available: false, reason: body?.error ?? "Block missing from the response." }, ...(extra?.adapt ?? {}) },
    staleAfterMs,
    select: (results, props, page) => ({ ...primary(results), data: results.main.data, ...(select ? select(results, props, page) : {}) }),
  };
}
