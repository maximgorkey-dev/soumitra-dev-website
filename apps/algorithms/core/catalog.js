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

import { binarySearch, twoPointers, prefixSums, kadane } from "../topics/seq-arrays.js";
import { longestUnique, windowMax, nextGreater } from "../topics/seq-windows.js";
import { lcs } from "../topics/grid-dp.js";
import { gridBfs } from "../topics/grid-search.js";

import { strategy } from "../topics/pat-strategy.js";
import { observer } from "../topics/pat-observer.js";
import { command } from "../topics/pat-command.js";
import { state } from "../topics/pat-state.js";
import { decorator } from "../topics/pat-decorator.js";
import { composite } from "../topics/pat-composite.js";
import { visitor } from "../topics/pat-visitor.js";
import { raii } from "../topics/pat-raii.js";
import { crtp } from "../topics/pat-crtp.js";
import { typeErasure } from "../topics/pat-type-erasure.js";
import { variant } from "../topics/pat-variant.js";
import { factoryMethod } from "../topics/pat-factory-method.js";
import { abstractFactory } from "../topics/pat-abstract-factory.js";
import { prototype } from "../topics/pat-prototype.js";
import { builder } from "../topics/pat-builder.js";
import { singleton } from "../topics/pat-singleton.js";
import { facade } from "../topics/pat-facade.js";
import { adapter } from "../topics/pat-adapter.js";
import { bridge } from "../topics/pat-bridge.js";
import { templateMethod } from "../topics/pat-template-method.js";
import { iterator } from "../topics/pat-iterator.js";
import { memento } from "../topics/pat-memento.js";
import { proxy } from "../topics/pat-proxy.js";
import { flyweight } from "../topics/pat-flyweight.js";
import { patternMap } from "../topics/pat-map.js";
import { chain } from "../topics/pat-chain.js";
import { mediator } from "../topics/pat-mediator.js";
import { pimpl } from "../topics/pat-pimpl.js";
import { nvi } from "../topics/pat-nvi.js";
import { ruleOfZero } from "../topics/pat-rule-of-zero.js";
import { policy } from "../topics/pat-policy.js";
import { ranges } from "../topics/pat-ranges.js";
import { concepts } from "../topics/pat-concepts.js";

import { lc560 } from "../topics/lc-560.js";
import { lc523 } from "../topics/lc-523.js";
import { lc974 } from "../topics/lc-974.js";
import { lc85 } from "../topics/lc-85.js";
import { lc402 } from "../topics/lc-402.js";
import { lc862 } from "../topics/lc-862.js";
import { lc992 } from "../topics/lc-992.js";
import { lc15 } from "../topics/lc-15.js";
import { lc1074 } from "../topics/lc-1074.js";
import { lc316 } from "../topics/lc-316.js";
import { lc1944 } from "../topics/lc-1944.js";
import { lc1696 } from "../topics/lc-1696.js";
import { lc1438 } from "../topics/lc-1438.js";
import { lc3 } from "../topics/lc-3.js";
import { lc1499 } from "../topics/lc-1499.js";
import { lc1004 } from "../topics/lc-1004.js";
import { lc424 } from "../topics/lc-424.js";
import { lc438 } from "../topics/lc-438.js";
import { lc881 } from "../topics/lc-881.js";
import { lc1011 } from "../topics/lc-1011.js";
import { lc410 } from "../topics/lc-410.js";
import { lc1482 } from "../topics/lc-1482.js";
import { lc1552 } from "../topics/lc-1552.js";
import { lc2141 } from "../topics/lc-2141.js";
import { lc719 } from "../topics/lc-719.js";
import { lc2560 } from "../topics/lc-2560.js";
import { lc2040 } from "../topics/lc-2040.js";
import { lc378 } from "../topics/lc-378.js";
import { lc33 } from "../topics/lc-33.js";
import { lc81 } from "../topics/lc-81.js";
import { lc154 } from "../topics/lc-154.js";
import { lc189 } from "../topics/lc-189.js";
import { lc1888 } from "../topics/lc-1888.js";
import { lc899 } from "../topics/lc-899.js";
import { lc2187 } from "../topics/lc-2187.js";
import { lc2226 } from "../topics/lc-2226.js";
import { lc2064 } from "../topics/lc-2064.js";
import { lc2033 } from "../topics/lc-2033.js";
import { lc2448 } from "../topics/lc-2448.js";
import { lc1703 } from "../topics/lc-1703.js";
import { lc1551 } from "../topics/lc-1551.js";
import { lc287 } from "../topics/lc-287.js";
import { lc406 } from "../topics/lc-406.js";
import { lc1665 } from "../topics/lc-1665.js";
import { lc765 } from "../topics/lc-765.js";
import { lc435 } from "../topics/lc-435.js";
import { lc452 } from "../topics/lc-452.js";
import { lc1024 } from "../topics/lc-1024.js";
import { lc1326 } from "../topics/lc-1326.js";
import { lc84 } from "../topics/lc-84.js";
import { lc239 } from "../topics/lc-239.js";
import { lc76 } from "../topics/lc-76.js";
import { lc42 } from "../topics/lc-42.js";
import { lc312 } from "../topics/lc-312.js";
import { lc4 } from "../topics/lc-4.js";
import { lc875 } from "../topics/lc-875.js";
import { lc668 } from "../topics/lc-668.js";
import { lc462 } from "../topics/lc-462.js";
import { lc41 } from "../topics/lc-41.js";
import { lc453 } from "../topics/lc-453.js";
import { lc229 } from "../topics/lc-229.js";
import { lc179 } from "../topics/lc-179.js";
import { lc3551 } from "../topics/lc-3551.js";

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
  binarySearch, twoPointers, prefixSums, kadane,
  longestUnique, windowMax, nextGreater,
  lcs, gridBfs,

  patternMap,
  strategy, observer, command, state, visitor,
  templateMethod, iterator, chain, mediator, memento,
  decorator, composite,
  adapter, facade, proxy, bridge, flyweight,
  raii, crtp, typeErasure, variant,
  pimpl, nvi, ruleOfZero, policy, ranges, concepts,
  factoryMethod, abstractFactory, builder, prototype, singleton,

  lc560, lc523, lc974, lc1074, lc84, lc85, lc402, lc316, lc1944, lc239, lc862, lc1696, lc1438, lc1499,
  lc76, lc3, lc992, lc1004, lc424, lc438, lc42, lc15, lc881, lc189, lc1888, lc899, lc875, lc1011, lc410, lc1482, lc1552, lc2560, lc2141, lc2187, lc2226, lc2064, lc668, lc719, lc2040, lc378,
  lc4, lc33, lc81, lc154, lc462, lc2033, lc2448, lc1703, lc453, lc1551, lc229, lc41, lc287, lc179, lc406, lc1665, lc3551, lc765, lc312,
  lc435, lc452, lc1024, lc1326,
];

/* Kruskal rather than the first entry: it is the most complete treatment here,
   and the only one besides Prim with a server-side runner to edit. */
export const DEFAULT_ID = kruskal.id;

export const byId = (id) => ALGORITHMS.find((a) => a.id === id) || null;

/** [{ section, topics: [{ topic, items: [...] }] }], in insertion order. */
export function grouped(items = ALGORITHMS) {
  const sections = new Map();
  for (const a of items) {
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
