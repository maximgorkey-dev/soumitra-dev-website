/**
 * The catalogue.
 *
 * Adding an algorithm is one import and one array entry. The three-level shape
 * — section, topic, algorithm — is here from the start because the sections
 * that do not exist yet (data structures, design patterns) are the reason this
 * is a catalogue at all rather than a page per algorithm. Grouping is derived
 * rather than declared, so nothing has to be kept in sync.
 */

import { kruskal } from "../topics/mst-kruskal.js";

export const ALGORITHMS = [kruskal];

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
