/**
 * Builds the test program for an interview problem.
 *
 * Your `class Solution` and the topic's reference (wrapped in `namespace ref_`)
 * are compiled together, and every case is judged by comparing the two
 * answers as printed text. Named cases print their input; random and stress
 * cases stay hidden unless they fail. The program prints one line per
 * verdict, flushed as it goes, so a run killed by the CPU limit still shows
 * everything that finished before it.
 *
 *   PASS <name> [detail]     FAIL <name>: <detail>
 *   RUN <name>               (a stress case has started; no PASS after it means it timed out)
 *   DONE <passed>/<total>
 *
 * tests: {
 *   fn, args: [{ type, name }], starter, reference, brute?,
 *   cases: [{ name, args: [C++ initialiser per argument] }],
 *   random?: { count, gen },   gen assigns every argument; rnd, rnd_vec, rnd_sorted available
 *   stress?: { label, gen },
 * }
 */

const SUPPORT = String.raw`#include <bits/stdc++.h>
using namespace std;

namespace lt_ {
inline uint64_t state = 0x9E3779B97F4A7C15ull;
inline uint64_t next() { state ^= state << 13; state ^= state >> 7; state ^= state << 17; return state; }
template <class T> string show(const T& x) {
    if constexpr (is_same_v<T, bool>) return x ? "true" : "false";
    else if constexpr (is_floating_point_v<T>) { char b[64]; snprintf(b, sizeof b, "%.5f", (double)x); return b; }
    else if constexpr (is_arithmetic_v<T>) return to_string(x);
    else if constexpr (is_convertible_v<T, string>) return "\"" + string(x) + "\"";
    else {
        string s = "[";
        bool first = true;
        for (const auto& e : x) {
            if (!first) s += ",";
            first = false;
            s += show(e);
            if (s.size() > 240) { s += ",..."; break; }
        }
        return s + "]";
    }
}
inline int passed = 0, total = 0;
inline void line(const string& s) { fputs((s + "\n").c_str(), stdout); fflush(stdout); }
template <class U, class R, class I>
bool judge(const string& name, U user, R ref, I input, bool quiet, const string& note = "") {
    ++total;
    string got = show(user()), want = show(ref());
    if (got == want) { ++passed; if (!quiet) line("PASS " + name + (note.empty() ? "" : " " + note)); return true; }
    line("FAIL " + name + ": got " + got + ", expected " + want + "; " + input());
    return false;
}
}  // namespace lt_

inline long long rnd(long long lo, long long hi) { return lo + (long long)(lt_::next() % (uint64_t)(hi - lo + 1)); }
inline vector<int> rnd_vec(int n, int lo, int hi) { vector<int> v(n); for (auto& x : v) x = (int)rnd(lo, hi); return v; }
inline vector<int> rnd_sorted(int n, int lo, int hi) { auto v = rnd_vec(n, lo, hi); sort(v.begin(), v.end()); return v; }
`;

export function buildHarness(tests, userCode, { stress = true } = {}) {
  const { fn, args } = tests;
  const decl = args.map((a) => `${a.type} ${a.name}{};`).join(" ");
  const call = (ns) => `[&] { ${args.map((a, i) => `auto a${i} = ${a.name};`).join(" ")} return ${ns}Solution().${fn}(${args.map((_, i) => `a${i}`).join(", ")}); }`;
  const input = `[&] { return string("${args.map((a) => a.name).join(", ")} = ") + ${args.map((a) => `lt_::show(${a.name})`).join(' + string(", ") + ')}; }`;
  const judge = (name, quiet, note = '""') => `lt_::judge(${JSON.stringify(name)}, ${call("")}, ${call("ref_::")}, ${input}, ${quiet}, ${note})`;

  const body = [];
  for (const c of tests.cases || []) {
    body.push(`    { ${args.map((a, i) => `${a.type} ${a.name} = ${c.args[i]};`).join(" ")} ${judge(c.name, "false")}; }`);
  }
  if (tests.random) {
    body.push(`    { int bad = 0;
      for (int k = 0; k < ${tests.random.count}; ++k) { ${decl} ${tests.random.gen}
        if (!${judge("random", "true")} && ++bad >= 3) break; }
      if (!bad) lt_::line("PASS random: ${tests.random.count} hidden cases"); }`);
  }
  if (stress && tests.stress) {
    const name = `stress (${tests.stress.label})`;
    body.push(`    { ${decl} ${tests.stress.gen}
      lt_::line(${JSON.stringify(`RUN ${name}`)});
      auto t0 = chrono::steady_clock::now();
      auto got = ${call("")}();
      double secs = chrono::duration<double>(chrono::steady_clock::now() - t0).count();
      char b[48]; snprintf(b, sizeof b, "in %.3f s", secs);
      lt_::judge(${JSON.stringify(name)}, [&] { return got; }, ${call("ref_::")}, [&] { return string("large hidden input"); }, false, b); }`);
  }

  return `${SUPPORT}
// ---------------------------------------------------------------- your code
${userCode}

// ---------------------------------------------------------------- reference
namespace ref_ {
${tests.reference}
}  // namespace ref_

int main() {
${body.join("\n")}
    lt_::line("DONE " + to_string(lt_::passed) + "/" + to_string(lt_::total));
}
`;
}

/** [{ verdict: "pass" | "fail" | "timeout", text }] plus the DONE tally, from a run's stdout. */
export function parseVerdicts(stdout) {
  const rows = [];
  let done = null;
  let running = null;
  for (const raw of String(stdout || "").split("\n")) {
    const s = raw.trimEnd();
    if (s.startsWith("PASS ")) rows.push({ verdict: "pass", text: s.slice(5) }), (running = null);
    else if (s.startsWith("FAIL ")) rows.push({ verdict: "fail", text: s.slice(5) }), (running = null);
    else if (s.startsWith("RUN ")) running = s.slice(4);
    else if (s.startsWith("DONE ")) done = s.slice(5);
  }
  if (running) rows.push({ verdict: "timeout", text: `${running}: did not finish within the CPU limit` });
  return { rows, done };
}
