/**
 * The stage list, kept separate from the runner so the UI can render the
 * pipeline without importing the placement and legalisation code — that all
 * belongs to the worker.
 */

/** Stages that exist. The order is the flow order and is not negotiable. */
export const STAGES = [
  { id: "netlist", label: "Netlist" },
  { id: "floorplan", label: "Floorplan" },
  { id: "place", label: "Global place" },
  { id: "legalize", label: "Legalise" },
];

/** Stages a real flow would run next, shown greyed so the shape is honest. */
export const PLANNED = [
  { id: "cts", label: "Clock tree" },
  { id: "groute", label: "Global route" },
  { id: "droute", label: "Detail route" },
  { id: "sta", label: "Timing" },
];
