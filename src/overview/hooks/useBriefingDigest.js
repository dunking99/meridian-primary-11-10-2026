// OV-13 hook: the briefing's verdict and top findings, plus the actions it
// allows (mark what was shown as read; snooze an alert finding).
import { useCallback } from "react";
import { useSpec, primary } from "../../shared/layout.jsx";
import { EP } from "../../shared/endpoints.js";
import { send } from "../../shared/api.js";
import { refreshVersions } from "../../shared/dataVersion.js";

export const briefingSpec = {
  endpoints: (props) => ({ main: EP.briefing(props.top ?? 5) }),
  deps: { main: ["prices", "book", "news", "calendar", "watch", "briefing", "bars"] },
  staleAfterMs: 6 * 3600_000,
  select: ({ main }) => ({
    ...primary({ main }), data: main.data,
    textAlt: main.data ? `${main.data.verdict?.text} ${main.data.counts?.new ?? 0} new since last read.` : "",
  }),
};

export function useBriefingDigest(props, page) {
  const out = useSpec(briefingSpec, props, page);
  const markRead = useCallback(async () => {
    if (!out.data) return;
    await send("POST", "/briefing/read", { fingerprints: out.data.fingerprints, generatedAt: out.data.generatedAt });
    await refreshVersions();
  }, [out.data]);
  const snooze = useCallback(async id => {
    await send("POST", "/signals/snooze", { id, days: 7 });
    await refreshVersions();
  }, []);
  return { ...out, markRead, snooze };
}
