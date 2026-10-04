/**
 * Shared vocabulary for topics drawn by the sequence view (views/sequence.js,
 * where the row fields are documented).
 *
 * The last frame of every sequence topic carries one or more "Result" metric
 * rows. The self-test compiles the topic's C++ — a complete program over the
 * same input — and checks that it prints exactly those lines, so the
 * animation and the reference code cannot drift apart.
 */

export const SEQUENCE = { kind: "sequence" };

export const result = (value) => ({ label: "Result", value: String(value) });

export const cpp = (name, source) => ({
  lang: "cpp",
  files: [{ name, note: "A complete program over the same input as the animation; it prints the Result shown on the last step.", source, traced: true }],
});

/** { i: state } for every index in [from, to] — handy for windows and excluded spans. */
export function span(from, to, state, into = {}) {
  for (let i = from; i <= to; i++) into[i] = state;
  return into;
}
