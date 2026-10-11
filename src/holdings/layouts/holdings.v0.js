// Holdings layout v0: key info strip, ribbon, treemap, map, table, then the
// rest (per the master brief). Edit this data to rearrange the page.
export default {
  page: "holdings",
  name: "v0",
  note: "Order from the master brief: key info, ribbon, treemap, map, table, then the rest.",
  maxWidth: 1240,
  rows: [
    { id: "H1", items: [{ component: "KeyInfoStrip", span: 9 }, { component: "UpDownRibbon", span: 3, size: "s" }] },
    { id: "H2", items: [{ component: "WeightRibbon", span: 12 }] },
    { id: "H3", items: [{ component: "PortfolioMap", span: 8 }, { component: "PositionInspector", span: 4 }] },
    { id: "H4", items: [{ component: "GeoExposure", span: 12 }] },
    { id: "H5", items: [{ component: "HoldingsFilters", span: 12 }] },
    { id: "H6", items: [{ component: "HoldingsTable", span: 12 }] },
    { id: "H7", items: [{ component: "WinnersLosers", span: 6 }, { component: "AllocationVsTarget", span: 6 }] },
    { id: "H8", items: [{ component: "Range52", span: 6 }, { component: "TrendColumn", span: 6 }] },
    { id: "H9", items: [{ component: "CashBreakdown", span: 6, props: { form: "tile" } }] },
  ],
};
