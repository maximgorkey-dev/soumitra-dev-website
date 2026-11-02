// Builds apps/leet/catalog-data.js from apps/leet/CATALOG.md.
// Usage: node tools/leet-catalog.mjs   (run from the repo root after editing the catalogue)
import fs from "fs";

const md = fs.readFileSync("apps/leet/CATALOG.md", "utf8").replace(/\r/g, "");
const built = fs.readdirSync("apps/algorithms/topics")
  .map((f) => /^lc-(\d+)\.js$/.exec(f)?.[1]).filter(Boolean).map(Number);

const families = [];
const patterns = new Map();
const problems = new Map();
const themes = [];
const TIER = /`\[(core|stretch|rare)/;

// One entry, title tokens without punctuation, then (E|M|H[, P]), optional \* and tier.
const TITLE = String.raw`[A-Z0-9…][\w'’\`\-–()]*(?: (?:[\w'’\`\-–()]+|\([A-Za-z ]+\)))*?`;
const ENTRY = new RegExp(String.raw`(?:^|[\s;:,(])(?:(\d{1,4}) and )?(\d{1,4}) (${TITLE}) \(([EMH])(?:, ([EMH]))?(, P)?\)(\\\*)?(?: \`\[(core|stretch|rare)\]\`)?`, "g");

function addProblems(text, pid, { recent = false } = {}) {
  let base = "";  // "122 … II" borrows the title of the entry before it
  for (const m of text.matchAll(ENTRY)) {
    const [, pair, num, raw, d1, d2, prem, star, tier] = m;
    const title = raw.startsWith("…") ? `${base}${raw.slice(1)}` : raw;
    if (!raw.startsWith("…")) base = raw;
    for (const n of [pair, num].filter(Boolean).map(Number)) {
      const d = d2 && n === Number(num) ? d2 : d1;
      if (problems.has(n) && problems.get(n).pattern) continue;  // first home wins
      problems.set(n, {
        n, title: pair ? title.replace(/ (\w+) and (\w+)$/, (s, a, b) => ` ${n === Number(pair) ? a : b}`) : title,
        d, premium: !!prem, pattern: pid, canonical: !!star, ...(tier ? { tier } : {}), ...(recent ? { recent: true } : {}),
      });
      const p = patterns.get(pid);
      if (p && !p.problems.includes(n)) (star ? p.problems.unshift(n) : p.problems.push(n));
    }
  }
}

function ensurePattern(pid, name) {
  if (patterns.has(pid)) return patterns.get(pid);
  const fam = families.find((f) => f.id === pid.replace(/\d+$/, ""));
  if (!fam) return null;
  const p = { id: pid, name: name || pid, tier: fam.tier, insight: "", signal: "", problems: [] };
  fam.patterns.push(p);
  patterns.set(pid, p);
  return p;
}

// Bullets, with their continuation lines joined; sub-bullets keep a flag.
function bullets(lines) {
  const out = [];
  for (const l of lines) {
    if (/^- /.test(l)) out.push({ sub: false, text: l.slice(2) });
    else if (/^ {2}- /.test(l)) out.push({ sub: true, text: l.slice(4) });
    else if (/^ {2,}\S/.test(l) && out.length) out[out.length - 1].text += " " + l.trim();
    else out.push(null);
  }
  return out.filter(Boolean);
}

const sections = md.split(/^(?=## )/m);
for (const sec of sections) {
  const head = /^## (\w+)\. (.*)$/m.exec(sec);
  if (!head) continue;
  const [, fid, rest] = head;
  const lines = sec.split("\n").slice(1);

  if (fid === "Y") {
    let theme = null;
    for (const l of lines) {
      const t = /^\*\*(Y\d+)\. (.+?)\*\*/.exec(l);
      if (t) { theme = { id: t[1], name: t[2].replace(/[“”"]/g, "\""), groups: [] }; themes.push(theme); continue; }
      if (theme && /^- /.test(l)) theme.groups.push({ text: l.slice(2) });
      else if (theme && /^ {2}\S/.test(l) && theme.groups.length) theme.groups[theme.groups.length - 1].text += " " + l.trim();
    }
    for (const th of themes) {
      th.groups = th.groups.map(({ text }) => {
        const i = text.indexOf(":");
        const label = (i > 0 ? text.slice(0, i) : text).replace(/\.$/, "");
        const nums = [...(i > 0 ? text.slice(i + 1) : text).matchAll(/\b(\d{1,4})\b/g)].map((m) => Number(m[1])).filter((n) => n > 0);
        return { label, nums: [...new Set(nums)] };
      });
    }
    continue;
  }

  if (fid === "Z") {
    let pid = null;
    for (const b of bullets(lines.filter((l) => !/^\*\*Dropped/.test(l)))) {
      if (!b.sub) {
        const m = /^([A-Z]{1,2})(\d+)\b/.exec(b.text);
        pid = null;
        if (m && families.some((f) => f.id === m[1])) {
          pid = m[1] + m[2];
          const label = /^[A-Z]{1,2}\d*,? ?(?:new pattern, )?([^:`.]*)/.exec(b.text)?.[1]?.trim();
          ensurePattern(pid, label);
        }
      }
      if (pid) addProblems(b.text, pid, { recent: true });
    }
    // Stop before the dropped list: everything after it is a placement we rejected.
    continue;
  }

  const fam = { id: fid, name: rest.replace(/`[^`]*`/g, "").replace(/\((raised|moved)[^)]*\)/, "").trim(), tier: TIER.exec(rest)?.[1] || "core", patterns: [] };
  families.push(fam);
  let cur = null;
  for (const l of lines) {
    const p = /^\*\*([A-Z]{1,2}\d+)\. (.+?)\*\*(.*)$/.exec(l);
    if (p) {
      cur = { id: p[1], name: p[2], tier: TIER.exec(p[3])?.[1] || fam.tier, insight: "", signal: "", problems: [] };
      fam.patterns.push(cur);
      patterns.set(cur.id, cur);
    }
  }
  // Second pass over bullets, attributing each to the pattern above it.
  cur = null;
  let buf = [];
  const flush = () => {
    if (!cur) return;
    for (const b of bullets(buf)) {
      if (b.text.startsWith("Insight:")) cur.insight = b.text.slice(8).trim();
      else if (b.text.startsWith("Signal:")) cur.signal = b.text.slice(7).trim();
      else addProblems(b.text, cur.id);
    }
  };
  for (const l of lines) {
    const p = /^\*\*([A-Z]{1,2}\d+)\. /.exec(l);
    if (p) { flush(); cur = patterns.get(p[1]); buf = []; } else buf.push(l);
  }
  flush();
}

// Dropped problems never get a home, even if a regex caught them in passing.
const dropped = /\*\*Dropped after reading:\*\*([\s\S]*?)(?=\n## |\n---)/.exec(md)?.[1] || "";
for (const m of dropped.replace(/ of \d{4}/g, "").matchAll(/\b(3\d{3}|4\d{3})\b/g)) problems.delete(Number(m[1]));

const slug = (t) => t.toLowerCase().replace(/[’']/g, "").replace(/`/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const PROBLEMS = Object.fromEntries([...problems.values()].sort((a, b) => a.n - b.n).map((p) => [p.n, { ...p, slug: slug(p.title) }]));
for (const f of families) for (const p of f.patterns) p.problems = p.problems.filter((n) => PROBLEMS[n]);

const out = `// Generated by tools/leet-catalog.mjs from apps/leet/CATALOG.md. Do not edit by hand.
export const FAMILIES = ${JSON.stringify(families)};
export const THEMES = ${JSON.stringify(themes)};
export const PROBLEMS = ${JSON.stringify(PROBLEMS)};
export const BUILT = ${JSON.stringify(built.sort((a, b) => a - b))};
`;
fs.writeFileSync("apps/leet/catalog-data.js", out);
const np = families.reduce((s, f) => s + f.patterns.length, 0);
console.log(`${families.length} families, ${np} patterns, ${themes.length} themes, ${Object.keys(PROBLEMS).length} problems (${Object.values(PROBLEMS).filter((p) => p.recent).length} recent, ${Object.values(PROBLEMS).filter((p) => p.premium).length} Premium), ${built.length} built`);
const empty = families.flatMap((f) => f.patterns).filter((p) => !p.problems.length).map((p) => p.id);
if (empty.length) console.log("patterns with no problems:", empty.join(" "));
const orphans = [...new Set(themes.flatMap((t) => t.groups.flatMap((g) => g.nums)))].filter((n) => !PROBLEMS[n]);
console.log(`theme numbers without a home: ${orphans.length}`);
