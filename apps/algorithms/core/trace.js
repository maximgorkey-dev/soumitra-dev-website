/**
 * The trace model. This is the one decision everything else hangs off, so it
 * is worth being explicit about it.
 *
 * A visualiser cannot be driven by running an algorithm. Running Kruskal tells
 * you the answer; it does not tell you that edge (C,D) was examined third and
 * rejected because both ends were already in the same component. That
 * commentary only exists if the implementation deliberately emits it. So an
 * algorithm here is not a function that returns a result — it is a generator
 * that yields *frames*, and the result is whatever the last frame shows.
 *
 * Two consequences worth stating, because they are why this shape was chosen:
 *
 *   Frames are whole snapshots, not deltas. Stepping backwards is then an
 *   array index rather than an undo log, and scrubbing to an arbitrary point
 *   is free. This costs memory proportional to steps times structure size,
 *   which for teaching-sized inputs is nothing.
 *
 *   Nothing in a frame is language-specific. A frame is plain JSON. Today the
 *   generators are JavaScript; a server-side C++ binary printing one JSON
 *   object per line would drive exactly the same renderers, with no change
 *   here. That is the seam that keeps the C++ question open rather than
 *   answered by the architecture.
 */

/**
 * Build a frame. Every field is optional except `note`, because a step the
 * viewer cannot read is not worth showing.
 *
 *   note     one sentence, present tense, describing this step
 *   phase    coarse stage name, for grouping in the timeline
 *   marks    per-element visual state, keyed by element id, shape is the
 *            renderer's business — the graph renderer reads `nodes` and `edges`
 *   metrics  [{ label, value }] shown next to the canvas as running totals
 *   detail   optional second line, for the arithmetic behind the decision
 */
export function frame({ note, phase = "", marks = {}, metrics = [], detail = "" }) {
  return { note, phase, marks, metrics, detail };
}

/**
 * Drain a generator into an array of frames.
 *
 * Capped because an algorithm with a bug in its loop condition should surface
 * as a clear error rather than as a hung tab.
 */
export function record(generator, limit = 5000) {
  const frames = [];
  for (const f of generator) {
    frames.push(f);
    if (frames.length > limit) {
      throw new Error(`algorithm produced more than ${limit} frames; likely a runaway loop`);
    }
  }
  return frames;
}
