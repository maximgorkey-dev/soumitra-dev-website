/**
 * The stage list, kept separate from the runner so the UI can render the
 * pipeline without importing the placement and legalisation code — that all
 * belongs to the worker.
 */

/**
 * Steps a real flow runs *before* this app gets involved. Shown so the pipeline
 * does not appear to start at a gate-level netlist by magic, and clickable so
 * the explainer can say where the netlist actually comes from.
 */
export const UPSTREAM = [{ id: "synthesis", label: "Synthesis" }];

/** Stages that exist. The order is the flow order and is not negotiable. */
export const STAGES = [
  { id: "netlist", label: "Netlist" },
  { id: "floorplan", label: "Floorplan" },
  { id: "place", label: "Global place" },
  { id: "legalize", label: "Legalise" },
  { id: "cts", label: "Clock tree" },
  { id: "groute", label: "Global route" },
  { id: "sta", label: "Timing" },
];

/**
 * Stages a real flow runs that this app explains but does not perform. Detail
 * routing sits between global routing and signoff timing in a real flow; here
 * timing runs on global-route lengths instead of extracted parasitics.
 */
export const PLANNED = [{ id: "droute", label: "Detail route" }];
