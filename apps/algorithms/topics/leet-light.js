/**
 * Interview "light" pages: everything a full page has except the animation.
 * There is no `run`, so app.js hides the player; the Code tab shows the
 * reference that the Solve tab checks against.
 *
 * light({ number, title, slug, difficulty, tier?, pattern, topic, see?, themes,
 *         blurb, statement, hints, brute, invariant, traps, followUps,
 *         explanation, analysis: { time, space, notes }, tests })
 */

/**
 * Study pages: lighter still, for reading only. No Solve tab and no tests;
 * the Problem tab lists the concepts that come together, and the Code tab
 * holds a fully commented solution. The self-test only compiles it.
 *
 * study({ number, title, slug, difficulty, tier?, pattern, topic, see?, themes,
 *         blurb, statement, concepts, traps?, followUps?, explanation,
 *         analysis: { time, space, notes? }, solution })
 */
export function study(p) {
  return {
    id: `lc-${p.number}`,
    section: "Interview problems",
    topic: p.topic,
    title: `${p.number}. ${p.title}`,
    blurb: p.blurb,
    structure: { kind: "none" },
    explanation: p.explanation,
    analysis: { notes: [], ...p.analysis },
    code: {
      lang: "cpp",
      files: [{ name: "solution.cpp", note: "A commented solution, in LeetCode's class Solution shape.", source: p.solution }],
    },
    problem: {
      study: true,
      number: p.number,
      slug: p.slug,
      difficulty: p.difficulty,
      tier: p.tier || "core",
      pattern: p.pattern,
      see: p.see,
      themes: p.themes,
      statement: p.statement,
      concepts: p.concepts,
      traps: p.traps,
      followUps: p.followUps,
    },
  };
}

export function light(p) {
  return {
    id: `lc-${p.number}`,
    section: "Interview problems",
    topic: p.topic,
    title: `${p.number}. ${p.title}`,
    blurb: p.blurb,
    structure: { kind: "none" },
    explanation: p.explanation,
    analysis: p.analysis,
    code: {
      lang: "cpp",
      files: [{ name: "solution.cpp", note: "The reference solution: the class the Solve tab checks your code against.", source: p.tests.reference }],
    },
    problem: {
      number: p.number,
      slug: p.slug,
      difficulty: p.difficulty,
      tier: p.tier || "core",
      pattern: p.pattern,
      see: p.see,
      themes: p.themes,
      statement: p.statement,
      hints: p.hints,
      brute: p.brute,
      invariant: p.invariant,
      traps: p.traps,
      followUps: p.followUps,
      tests: p.tests,
    },
  };
}
