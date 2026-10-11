// OV-01 hooks: the hero figure and the stat tiles. They fetch and shape; they
// know nothing about how anything is drawn.
import { useSpec } from "../../shared/layout.jsx";
import { blockSpec } from "./common.js";

export const heroSpec = blockSpec("hero", {
  deps: ["prices", "book", "bars"],
  staleAfterMs: 10 * 60_000,
  select: ({ main }) => {
    const d = main.data;
    if (!d) return {};
    const spark = (d.spark ?? []).map(p => p.value);
    return {
      derived: {
        sparkValues: spark,
        upDown: { up: d.up, down: d.down, flat: d.flat, unknown: d.unknown },
        textAlt: `Portfolio worth ${Math.round(d.total).toLocaleString("en-GB")} pounds, ${d.dayChange >= 0 ? "up" : "down"} ${Math.abs(d.dayChange).toFixed(2)} pounds (${Math.abs(d.dayChangePct).toFixed(2)}%) today; ${d.up} holdings up, ${d.down} down, ${d.flat} flat.`,
      },
    };
  },
});

export const statsSpec = blockSpec("stats", {
  deps: ["prices", "book", "bars", "flows"],
  staleAfterMs: 10 * 60_000,
  extra: {
    endpoints: () => ({ hero: "/overview?blocks=hero" }),
    deps: { hero: ["prices", "book", "bars"] },
    adapt: { hero: body => body?.blocks?.hero ?? { available: false, reason: "Block missing." } },
  },
  select: ({ hero }) => ({ hero: hero.status === "ready" ? hero.data : null }),
});

export const useHeroTotal = (props, page) => useSpec(heroSpec, props, page);
export const useStatTiles = (props, page) => useSpec(statsSpec, props, page);
