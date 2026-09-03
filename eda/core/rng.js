/**
 * Deterministic pseudo-random numbers (mulberry32).
 *
 * Global placement needs a little randomness to break the symmetry of every
 * cell starting at the same point, but a demo that lands somewhere different
 * on every press of Run is not a demo you can reason about. Seeding from the
 * design name means the same design with the same constraints always produces
 * the same placement, so a share link reproduces exactly what the sender saw.
 */

export function rng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash of a string, for turning a design name into a seed. */
export function hashSeed(text) {
  let h = 2166136261 >>> 0;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
