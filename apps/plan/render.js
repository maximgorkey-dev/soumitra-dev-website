/**
 * Renders apps/BACKLOG.md into HTML. The markdown stays the list that gets
 * edited; this only knows its conventions (## sections, "- [ ] **ID — title
 * (size).**" items, indented continuations and nested bullets).
 */

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/\b((?:OPS|U|NOTES|FC|ALG|PAT|EDA|WEB)-\d+[a-z]?)\b/g, '<a href="#$1">$1</a>')
    .replace(/\b(Done when:?)/g, "<span class=\"plan-when\">$1</span>")
    .replace(/\b(What:)/g, "<span class=\"plan-what\">$1</span>");
}

/** Every size letter present, so "S–M" matches both filters. */
function sizeClass(size) {
  return [...new Set(size.match(/[SML]/g) || [])].join(" ");
}

function itemHtml(it) {
  const cls = sizeClass(it.size);
  const body = it.parts.map((p) => {
    if (p.type === "list") return `<ul class="plan-sub">${p.items.map((b) => `<li>${inline(b)}</li>`).join("")}</ul>`;
    const text = p.text.trim();
    return text ? `<p>${inline(text)}</p>` : "";
  }).join("");
  return `<article class="plan-item" id="${it.id}" data-size="${cls}">
    <header><a class="plan-id" href="#${it.id}">${it.id}</a><h3>${inline(it.title)}</h3><span class="plan-size" data-size="${cls}">${esc(it.size)}</span></header>
    ${body}
  </article>`;
}

/**
 * @param {string} md
 * @returns {string} HTML for everything after the title.
 */
export function renderPlan(md) {
  const lines = md.replace(/\r/g, "").split("\n").slice(1); // drop the h1
  const out = [];
  let para = [];
  let list = null;          // { ordered, items: [{html}] } or item accumulator
  let item = null;          // { id, title, size, parts: [{type,text}|{type,items}] }
  let bullet = null;        // current nested bullet text

  const flushPara = () => {
    if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; }
  };
  const closeBullet = () => {
    if (bullet === null || !item) return;
    let last = item.parts[item.parts.length - 1];
    if (!last || last.type !== "list") { last = { type: "list", items: [] }; item.parts.push(last); }
    last.items.push(bullet);
    bullet = null;
  };
  const closeItem = () => {
    closeBullet();
    if (item) { out.push(itemHtml(item)); item = null; }
  };
  const closeList = () => {
    if (!list) return;
    const tag = list.ordered ? "ol" : "ul";
    out.push(`<${tag} class="plan-order">${list.items.map((t) => `<li>${inline(t)}</li>`).join("")}</${tag}>`);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line === "---" || line === "") {
      flushPara(); closeItem(); closeList();
      continue;
    }
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    if (h2 || h3) {
      flushPara(); closeItem(); closeList();
      const text = (h2 || h3)[1];
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      out.push(h2 ? `<h2 id="${id}">${inline(text)}</h2>` : `<h3 class="plan-subhead" id="${id}">${inline(text)}</h3>`);
      continue;
    }
    const task = line.match(/^- \[ \] \*\*([A-Z]+-\d+[a-z]?) — (.+?) \(([^)]+)\)\.\*\*\s*(.*)$/);
    if (task) {
      flushPara(); closeItem(); closeList();
      item = { id: task[1], title: task[2], size: task[3], parts: [{ type: "text", text: task[4] }] };
      continue;
    }
    const ordered = line.match(/^\d+\. (.+)/);
    if (ordered && !item) {
      flushPara();
      if (!list || !list.ordered) { closeList(); list = { ordered: true, items: [] }; }
      list.items.push(ordered[1]);
      continue;
    }
    const nested = line.match(/^  - (.+)/);
    if (nested && item) {
      closeBullet();
      bullet = nested[1];
      continue;
    }
    // Four or more spaces continues the nested bullet; two spaces continues the item.
    const deep = line.match(/^ {4}(\S.*)/);
    if (deep && bullet !== null) { bullet += " " + deep[1]; continue; }
    const cont = line.match(/^ {2}(\S.*)/);
    if (cont && item) {
      closeBullet();
      let last = item.parts[item.parts.length - 1];
      if (!last || last.type !== "text") { last = { type: "text", text: "" }; item.parts.push(last); }
      last.text += " " + cont[1];
      continue;
    }
    const plain = line.match(/^- (.+)/);
    if (plain && !item) {
      flushPara();
      if (!list || list.ordered) { closeList(); list = { ordered: false, items: [] }; }
      list.items.push(plain[1]);
      continue;
    }
    flushPara(); closeItem(); closeList();
    para.push(line.trim());
  }
  flushPara(); closeItem(); closeList();
  return out.join("\n");
}
