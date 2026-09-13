/**
 * The catalogue.
 *
 * Adding an algorithm is one import and one array entry. The three-level shape
 * — section, topic, algorithm — is here from the start because the sections
 * that do not exist yet (data structures, design patterns) are the reason this
 * is a catalogue at all rather than a page per algorithm. Grouping is derived
 * rather than declared, so nothing has to be kept in sync.
 *
 * Array order is the only thing controlling how the sidebar reads, since
 * `grouped()` preserves insertion order for both sections and topics. The
 * order below is a teaching progression rather than alphabetical: traversal
 * first because breadth- and depth-first search are the machinery the later
 * entries are built out of, then the weighted problems, then the things that
 * are really applications of a depth-first tree.
 */

import { bfs } from "../topics/traverse-bfs.js";
import { dfs } from "../topics/traverse-dfs.js";

import { kruskal } from "../topics/mst-kruskal.js";
import { prim } from "../topics/mst-prim.js";
import { boruvka } from "../topics/mst-boruvka.js";

import { dijkstra } from "../topics/sp-dijkstra.js";
import { astar } from "../topics/sp-astar.js";

import { bridges } from "../topics/graph-bridges.js";
import { articulation } from "../topics/graph-articulation.js";

import { bipartite } from "../topics/bipartite-check.js";
import { matching } from "../topics/bipartite-matching.js";
import { colouring } from "../topics/graph-colouring.js";
import { euler } from "../topics/euler-circuit.js";
import { diameter } from "../topics/tree-diameter.js";

export const ALGORITHMS = [
  bfs, dfs,
  kruskal, prim, boruvka,
  dijkstra, astar,
  bridges, articulation,
  bipartite,
  matching,
  colouring,
  euler,
  diameter,
];

/* Kruskal rather than the first entry: it is the most complete treatment here,
   and the only one besides Prim with a server-side runner to edit. */
export const DEFAULT_ID = kruskal.id;

export const byId = (id) => ALGORITHMS.find((a) => a.id === id) || null;

/** [{ section, topics: [{ topic, items: [...] }] }], in insertion order. */
export function grouped() {
  const sections = new Map();
  for (const a of ALGORITHMS) {
    if (!sections.has(a.section)) sections.set(a.section, new Map());
    const topics = sections.get(a.section);
    if (!topics.has(a.topic)) topics.set(a.topic, []);
    topics.get(a.topic).push(a);
  }
  return [...sections].map(([section, topics]) => ({
    section,
    topics: [...topics].map(([topic, items]) => ({ topic, items })),
  }));
}
