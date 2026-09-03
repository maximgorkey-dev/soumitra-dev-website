/**
 * Technology description.
 *
 * All geometry in this app is integer nanometres, referred to below as dbu
 * (database units), which is how real LEF/DEF flows work. Keeping everything
 * integral avoids the float drift that would otherwise make "is this cell on
 * a legal site?" an approximate question.
 *
 * The numbers are invented but internally consistent, and the ratios are
 * roughly those of an older planar node: a standard cell row is 8 sites tall,
 * and every cell width is a whole number of sites.
 */

export const TECH = {
  name: "demo16",

  // Placement grid. A movable cell's origin must land on a site boundary in x
  // and a row boundary in y for the design to be legal.
  siteWidth: 200,
  rowHeight: 1600,

  /**
   * Routing layers, ordered from closest to the substrate upward. Unused by
   * the placement stages, but global and detailed routing are built on this
   * and the preferred directions are what make a route look like a real one.
   */
  layers: [
    { name: "M1", dir: "h", pitch: 200, resPerUm: 0.38, capPerUm: 0.22 },
    { name: "M2", dir: "v", pitch: 200, resPerUm: 0.31, capPerUm: 0.20 },
    { name: "M3", dir: "h", pitch: 240, resPerUm: 0.22, capPerUm: 0.19 },
    { name: "M4", dir: "v", pitch: 240, resPerUm: 0.22, capPerUm: 0.19 },
    { name: "M5", dir: "h", pitch: 400, resPerUm: 0.11, capPerUm: 0.17 },
    { name: "M6", dir: "v", pitch: 400, resPerUm: 0.11, capPerUm: 0.17 },
  ],

  // Cost of changing layer, in units of one pitch of wire. Routers trade wire
  // length against vias, so this is a real knob rather than decoration.
  viaCost: 3,

  // Layers 0 and 1 are largely consumed by the cells' own internal wiring, so
  // signal routing starts above them.
  firstRoutingLayer: 2,
};

/** Microns are the unit humans read; dbu are the unit we compute in. */
export const DBU_PER_UM = 1000;

export const toUm = (dbu) => dbu / DBU_PER_UM;

/** Snap a coordinate down onto the site grid, relative to an origin. */
export function snapSite(x, originX = 0) {
  return originX + Math.round((x - originX) / TECH.siteWidth) * TECH.siteWidth;
}

/** Snap a coordinate onto the row grid, relative to an origin. */
export function snapRow(y, originY = 0) {
  return originY + Math.round((y - originY) / TECH.rowHeight) * TECH.rowHeight;
}
