/* Shared helpers for the authenticated apps: API calls, toasts, modals, escaping. */

const API = {
  async request(method, path, body) {
    const opts = {
      method,
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(path, opts);

    // oauth2-proxy bounces expired sessions to Google; a redirect to an
    // opaque origin surfaces here as an HTML response or a 401.
    if (res.status === 401) {
      window.location.href = "/oauth2/start?rd=" + encodeURIComponent(window.location.pathname);
      throw new Error("session expired");
    }
    if (res.status === 204) return null;

    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Unexpected response from ${path}`);
      }
    }
    if (!res.ok) {
      const detail = data && data.detail ? data.detail : `${res.status} ${res.statusText}`;
      throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
    return data;
  },

  get: (p) => API.request("GET", p),
  post: (p, b) => API.request("POST", p, b),
  patch: (p, b) => API.request("PATCH", p, b),
  del: (p) => API.request("DELETE", p),
};

/* ---------- escaping and light formatting ---------- */

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* The formatting vocabulary lives here so the renderer, the editor toolbar and
   the paste converter cannot drift apart. */
const RT_COLORS = ["red", "orange", "yellow", "green", "teal", "blue", "purple", "pink", "gray"];

/* Only these schemes may reach an href; javascript:, data: and friends fall
   back to plain text. The value tested has already been through escapeHTML, so
   quotes arrive as entities and cannot close the attribute on their own — but
   rejecting them anyway keeps a malformed URL from becoming a weird link. */
const URL_SCHEME_OK = /^(?:https?:\/\/|mailto:[^@\s]+@|\/|#)/i;
const URL_FORBIDDEN = /[\s<>]|&quot;|&#39;|&lt;|&gt;/;

function safeURL(escaped) {
  const url = String(escaped == null ? "" : escaped).trim();
  if (!url || url.length > 2048) return null;
  if (!URL_SCHEME_OK.test(url) || URL_FORBIDDEN.test(url)) return null;
  return url;
}

const FG_RE = new RegExp(`\\{(${RT_COLORS.join("|")})\\|([^{}\\n]+)\\}`, "g");
const HL_RE = new RegExp(`==(?:(${RT_COLORS.join("|")})\\|)?([^=\\n]+)==`, "g");

/**
 * Inline formatting for one line of prose: `code`, [links](url), bare URLs,
 * **bold**, *italic*, ~~strike~~, {red|coloured} and ==highlighted== text.
 *
 * Everything is escaped up front, so the only HTML in the result is HTML this
 * function wrote itself. Code spans and finished links are parked as
 * placeholders while the remaining rules run, which stops a URL from being
 * linked twice and stops formatting characters inside `code` from being eaten.
 */
function renderInline(s) {
  const held = [];
  const hold = (html) => `\u0000${held.push(html) - 1}\u0000`;
  const link = (href, text) =>
    hold(`<a class="rt-link" href="${href}" target="_blank" rel="noopener noreferrer nofollow">${text}</a>`);

  // A literal NUL would collide with the placeholder scheme, so drop it.
  let out = escapeHTML(String(s == null ? "" : s).replace(/\u0000/g, ""));

  out = out.replace(/`([^`\n]+)`/g, (_, code) => hold(`<code>${code}</code>`));

  out = out.replace(/\[([^\]\n]*)\]\(([^)\s]+)\)/g, (whole, text, url) => {
    const href = safeURL(url);
    return href ? link(href, text || href) : whole;
  });

  // Trailing sentence punctuation belongs to the prose, not the URL. ';' is
  // deliberately not stripped: it would eat the tail of an &amp; entity.
  out = out.replace(/\bhttps?:\/\/[^\s<>]+/g, (url) => {
    const trimmed = url.replace(/[.,:!?)\]]+$/, "");
    const href = safeURL(trimmed);
    return href ? link(href, trimmed) + url.slice(trimmed.length) : url;
  });

  out = out
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/~~([^~\n]+)~~/g, "<del>$1</del>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(HL_RE, (_, c, t) => `<mark class="rt-hl rt-hl-${c || "yellow"}">${t}</mark>`)
    .replace(FG_RE, (_, c, t) => `<span class="rt-fg rt-fg-${c}">${t}</span>`)
    .replace(/\n/g, "<br />");

  // Held HTML can itself contain a placeholder, e.g. [`code` link](url).
  for (let pass = 0; pass < 5 && out.includes("\u0000"); pass++) {
    out = out.replace(/\u0000(\d+)\u0000/g, (m, i) => held[Number(i)] ?? m);
  }
  return out;
}

const renderText = renderInline;

/* Italic uses `*` only. `_` is left alone on purpose: it would mangle the
   snake_case identifiers that turn up constantly in these notes. */
const UL_RE = /^(\s*)[-*+]\s+(.*)$/;
const OL_RE = /^(\s*)(\d{1,9})[.)]\s+(.*)$/;

const indentOf = (ws) => String(ws).replace(/\t/g, "    ").length;

/**
 * Renders a run of collected list items as nested <ul>/<ol>.
 *
 * Depth comes from relative indentation rather than a fixed step, so two
 * spaces, four spaces or a tab all nest. A nested list is opened while its
 * parent <li> is still open, which is what makes it legal HTML rather than a
 * sibling of the item it belongs to.
 *
 * No whitespace is emitted between tags: .note-body is `white-space: pre-wrap`,
 * so markup indentation would show up as blank space on the page.
 */
function listHTML(items) {
  let out = "";
  const open = [];  // { ordered, indent, li } — outermost first

  const openList = (ordered, indent) => {
    open.push({ ordered, indent, li: false });
    out += ordered ? '<ol class="rt-list">' : '<ul class="rt-list">';
  };
  const closeList = () => {
    const top = open.pop();
    if (top.li) out += "</li>";
    out += top.ordered ? "</ol>" : "</ul>";
  };

  for (const item of items) {
    while (open.length && item.indent < open[open.length - 1].indent) closeList();

    const top = open[open.length - 1];
    if (!top || item.indent > top.indent) {
      openList(item.ordered, item.indent);            // first list, or a nesting step
    } else if (top.ordered !== item.ordered) {
      closeList();                                    // bullets and numbers do not mix
      openList(item.ordered, item.indent);
    } else if (top.li) {
      out += "</li>";
      top.li = false;
    }

    // Left open: a nested list belonging to this item must land inside it.
    open[open.length - 1].li = true;
    out += `<li>${item.html}`;
  }
  while (open.length) closeList();
  return out;
}

const FENCE_OPEN = /^\s*```(\S*)\s*$/;
const FENCE_CLOSE = /^\s*```\s*$/;

/**
 * Splits text into segments so callers can render fenced code blocks
 * separately from prose. Text segments keep their original line index,
 * which matters because the notes app addresses checklist lines by index.
 */
function parseBlocks(text) {
  const lines = String(text ?? "").split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const fence = lines[i].match(FENCE_OPEN);
    if (fence) {
      const body = [];
      let j = i + 1;
      while (j < lines.length && !FENCE_CLOSE.test(lines[j])) {
        body.push(lines[j]);
        j++;
      }
      out.push({ type: "code", lang: fence[1] || "", code: body.join("\n") });
      i = j < lines.length ? j + 1 : j; // an unclosed fence just runs to the end
    } else {
      out.push({ type: "text", line: lines[i], index: i });
      i++;
    }
  }
  return out;
}

function codeBlockHTML(lang, code) {
  const safeLang = String(lang || "").replace(/[^a-z0-9+#_-]/gi, "").slice(0, 20);
  const cls = safeLang ? ` class="language-${safeLang}"` : "";
  return `<div class="code-block">
      <div class="code-head">
        <span class="code-lang">${escapeHTML(safeLang || "code")}</span>
        <button class="code-copy" type="button" title="Copy to clipboard">Copy</button>
      </div>
      <pre><code${cls}>${escapeHTML(code)}</code></pre>
    </div>`;
}

/**
 * Renders prose: fenced code blocks, bullet and numbered lists, and inline
 * formatting.
 *
 * `opts.line` lets a caller claim a line before the list rules see it and
 * return its own HTML, or null to decline. The notes app uses it for `- [ ]`
 * checklists, which have to be claimed first because they would otherwise
 * match the bullet pattern.
 */
function renderBlocks(text, opts = {}) {
  const claim = typeof opts.line === "function" ? opts.line : null;
  const out = [];
  let items = [];
  let gap = false;  // a blank line seen while a list was open

  const flush = () => {
    if (items.length) out.push(listHTML(items));
    items = [];
    gap = false;
  };

  for (const seg of parseBlocks(text)) {
    if (seg.type === "code") {
      flush();
      out.push(codeBlockHTML(seg.lang, seg.code));
      continue;
    }

    const claimed = claim ? claim(seg) : null;
    if (claimed != null) {
      flush();
      out.push(claimed);
      continue;
    }

    // A single blank line between items should not split the list, so hold it
    // back and only emit it if what follows turns out not to be an item.
    if (items.length && !seg.line.trim()) {
      gap = true;
      continue;
    }

    const ol = seg.line.match(OL_RE);
    const ul = ol ? null : seg.line.match(UL_RE);
    if (ol || ul) {
      items.push({
        ordered: Boolean(ol),
        indent: indentOf(ol ? ol[1] : ul[1]),
        html: renderInline(ol ? ol[3] : ul[2]),
      });
      gap = false;
      continue;
    }

    const pending = gap;
    flush();
    if (pending) out.push("<div>&nbsp;</div>");
    out.push(`<div>${renderInline(seg.line) || "&nbsp;"}</div>`);
  }

  flush();
  return out.join("");
}

const renderRich = (text) => renderBlocks(text);

/**
 * Highlights any code blocks inside `root` and wires their copy buttons.
 * Safe to call repeatedly; already-processed blocks are skipped.
 */
function enhanceCode(root) {
  if (!root) return;

  root.querySelectorAll("pre code:not([data-hl])").forEach((block) => {
    if (window.hljs) {
      try {
        window.hljs.highlightElement(block);
      } catch {
        /* unknown language, or hljs failed: leave it as plain monospace */
      }
    }
    block.dataset.hl = "1";
  });

  root.querySelectorAll(".code-copy:not([data-bound])").forEach((btn) => {
    btn.dataset.bound = "1";
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const code = btn.closest(".code-block")?.querySelector("code");
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code.textContent);
        btn.textContent = "Copied";
      } catch {
        btn.textContent = "Press Ctrl+C";
      }
      setTimeout(() => (btn.textContent = "Copy"), 1500);
    });
  });
}

/* ---------- clipboard ---------- */

/* Word, Google Docs and Outlook all put the bullet glyph into the plain-text
   clipboard flavour rather than any list structure, so pasted bullets arrive as
   these characters. \uf0a7 and \uf0b7 are the private-use code points Word uses
   for its Symbol-font bullets. */
const BULLET_GLYPHS = "\u2022\u2023\u2043\u204c\u204d\u2219\u25aa\u25ab\u25cf\u25cb\u25a0\u25a1\u25e6\u00b7\uf0a7\uf0b7";
const BULLET_LINE_RE = new RegExp(`^([ \\t]*)[${BULLET_GLYPHS}]+[ \\t]+(.*)$`);

/* Turns the plain-text flavour of a paste into the markdown subset. */
function normalisePastedText(text) {
  return String(text == null ? "" : text)
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => {
      const glyph = line.match(BULLET_LINE_RE);
      if (glyph) return `${glyph[1]}- ${glyph[2]}`;

      // Word writes its second-level bullet as a literal 'o'. Only treated as
      // one when indented, so a sentence that begins with "o" survives.
      const word = line.match(/^([ \t]{2,})o[ \t]+(\S.*)$/);
      if (word) return `${word[1]}- ${word[2]}`;

      const paren = line.match(/^([ \t]*)(\d{1,9})\)[ \t]+(.*)$/);
      if (paren) return `${paren[1]}${paren[2]}. ${paren[3]}`;

      return line;
    })
    .join("\n")
    .replace(/[ \t]+$/gm, "");
}

const MD_BLOCK = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DD", "DIV", "DL", "DT",
  "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "FORM", "HEADER", "HR",
  "MAIN", "NAV", "P", "SECTION",
]);
const MD_HEADINGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);
const MD_STRIP = "script,style,meta,link,title,noscript,svg,iframe,object,embed,head";

/**
 * Converts a clipboard `text/html` payload into the markdown subset.
 *
 * The HTML goes through DOMParser, which builds an inert document: no scripts
 * run and no subresources are fetched. It is never attached to the live page,
 * and the only thing that leaves this function is plain text.
 *
 * Returns { text, images }; `images` counts the <img> elements dropped along
 * the way so the caller can mention them.
 */
function htmlToMarkdown(html) {
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
  doc.querySelectorAll(MD_STRIP).forEach((node) => node.remove());

  let out = "";
  let images = 0;

  /* Google Docs wraps every <li>'s content in a <p>, and Word does much the
     same. Breaking the line there would strand the marker on its own, so a
     block element that lands straight after one is not allowed to. */
  const AFTER_MARKER = /(?:^|\n)[ \t]*(?:-|\d{1,9}\.) $/;

  const breaks = (n) => {
    if (!out || AFTER_MARKER.test(out)) return;
    const have = /\n*$/.exec(out)[0].length;
    if (have < n) out += "\n".repeat(n - have);
  };

  /* Wraps whatever the children render to, without swallowing the spaces around
     it — those are carrying word separation. */
  const wrapped = (node, mark, list) => {
    const at = out.length;
    walk(node, list);
    const inner = out.slice(at);
    const core = inner.trim();
    // Skip if it is already marked up, or spans lines: every inline mark we
    // render is single-line, so wrapping across a break would just be litter.
    if (!core || core.includes(mark) || core.includes("\n")) return;
    out = out.slice(0, at) + inner.replace(core, () => mark + core + mark);
  };

  function walk(node, list) {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        let text = child.nodeValue.replace(/\u00a0/g, " ").replace(/\s+/g, " ");
        if (!text) continue;
        // A space right after a newline or an existing space is noise.
        if (!out || /[\n ]$/.test(out)) text = text.replace(/^ /, "");
        out += text;
        continue;
      }
      if (child.nodeType !== 1) continue;

      const tag = child.tagName;

      if (tag === "BR") { out += "\n"; continue; }
      if (tag === "IMG") { images += 1; continue; }

      if (tag === "PRE") {
        breaks(2);
        const lang = (String(child.querySelector("code")?.className || "")
          .match(/language-([a-z0-9+#_-]+)/i) || [])[1] || "";
        const code = child.textContent.replace(/\u00a0/g, " ").replace(/\s+$/, "");
        out += `\`\`\`${lang}\n${code}\n\`\`\``;
        breaks(2);
        continue;
      }

      if (tag === "UL" || tag === "OL") {
        const depth = list ? list.depth + 1 : 0;
        if (!depth) breaks(1);
        let n = Number(child.getAttribute("start")) || 1;
        for (const item of child.children) {
          if (item.tagName !== "LI") continue;
          breaks(1);
          out += "  ".repeat(depth) + (tag === "OL" ? `${n++}. ` : "- ");
          walk(item, { depth });
        }
        if (!depth) breaks(1);
        continue;
      }

      if (tag === "A") {
        const href = (child.getAttribute("href") || "").trim();
        const at = out.length;
        walk(child, list);
        const text = out.slice(at).trim();
        // A ']' in the text would break out of the link syntax.
        if (text && !text.includes("]") && /^(?:https?:\/\/|mailto:)/i.test(href)) {
          out = out.slice(0, at) + `[${text}](${href})`;
        }
        continue;
      }

      // Google Docs wraps its entire payload in <b style="font-weight:normal">,
      // which is a container, not emphasis. Believe the style over the tag.
      if (tag === "STRONG" || tag === "B") {
        const weight = (child.getAttribute("style") || "").toLowerCase();
        if (/font-weight:\s*(?:normal|lighter|[1-5]00)/.test(weight)) walk(child, list);
        else wrapped(child, "**", list);
        continue;
      }
      if (tag === "EM" || tag === "I") { wrapped(child, "*", list); continue; }
      if (tag === "S" || tag === "DEL" || tag === "STRIKE") { wrapped(child, "~~", list); continue; }
      if (tag === "CODE" || tag === "TT" || tag === "KBD" || tag === "SAMP") { wrapped(child, "`", list); continue; }

      // We render no headings, so the nearest honest equivalent is bold.
      if (MD_HEADINGS.has(tag)) { breaks(2); wrapped(child, "**", list); breaks(2); continue; }

      // Google Docs carries bold and italic as inline styles on spans, not tags.
      if (tag === "SPAN") {
        const style = (child.getAttribute("style") || "").toLowerCase();
        if (/font-weight:\s*(?:bold|[6-9]00)/.test(style)) { wrapped(child, "**", list); continue; }
        if (/font-style:\s*italic/.test(style)) { wrapped(child, "*", list); continue; }
      }

      if (tag === "TABLE") { breaks(2); walk(child, list); breaks(2); continue; }
      if (tag === "TR") { breaks(1); walk(child, list); out = out.replace(/\s*\|\s*$/, ""); continue; }
      if (tag === "TD" || tag === "TH") { walk(child, list); out += " | "; continue; }

      if (MD_BLOCK.has(tag)) { breaks(1); walk(child, list); breaks(1); continue; }

      walk(child, list);   // unknown inline wrapper: keep the contents, drop the tag
    }
  }

  walk(doc.body, null);

  const text = normalisePastedText(out)
    .replace(/^([ \t]*(?:-|\d{1,9}\.))[ \t]+/gm, "$1 ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, images };
}

/* ---------- markdown editor ---------- */

/**
 * Rewrites part of a textarea through execCommand so the browser's native undo
 * stack survives — assigning to .value wipes it, which is miserable in an
 * editor. execCommand is deprecated but remains the only way to do this in a
 * textarea; the direct write is the fallback for when it finally goes.
 */
function replaceRange(ta, start, end, text, selStart, selEnd) {
  ta.focus();
  ta.setSelectionRange(start, end);
  let ok = false;
  try {
    ok = document.execCommand("insertText", false, text);
  } catch {
    ok = false;
  }
  if (!ok) ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);

  const caret = selStart == null ? start + text.length : selStart;
  ta.setSelectionRange(caret, selEnd == null ? caret : selEnd);
  ta.dispatchEvent(new Event("input", { bubbles: true }));
}

/* Wraps the selection, or unwraps it when the marks are already there. */
function mdWrap(ta, before, after = before, placeholder = "text") {
  const { selectionStart: s, selectionEnd: e, value } = ta;
  const picked = value.slice(s, e);

  if (picked.length > before.length + after.length &&
      picked.startsWith(before) && picked.endsWith(after)) {
    const inner = picked.slice(before.length, picked.length - after.length);
    replaceRange(ta, s, e, inner, s, s + inner.length);
    return;
  }

  const body = picked || placeholder;
  replaceRange(ta, s, e, before + body + after, s + before.length, s + before.length + body.length);
}

/* Order matters: a checklist line also matches the bullet pattern. */
const MD_KINDS = {
  check:  { make: () => "- [ ] ",         re: /^(\s*)-\s\[[ xX]\]\s?/ },
  bullet: { make: () => "- ",             re: /^(\s*)[-*+]\s+/ },
  number: { make: (i) => `${i + 1}. `,    re: /^(\s*)\d{1,9}[.)]\s+/ },
};

/* Toggles a line marker across every line the selection touches. */
function mdLines(ta, kind) {
  const spec = MD_KINDS[kind];
  const value = ta.value;
  const start = value.lastIndexOf("\n", ta.selectionStart - 1) + 1;
  let end = value.indexOf("\n", ta.selectionEnd);
  if (end === -1) end = value.length;

  const lines = value.slice(start, end).split("\n");
  const already = lines.every((line) => !line.trim() || spec.re.test(line));

  let n = 0;  // counts real items, so a blank line does not skew the numbering
  const text = lines
    .map((line) => {
      if (!line.trim()) return line;
      const bare = line
        .replace(MD_KINDS.check.re, "$1")
        .replace(MD_KINDS.bullet.re, "$1")
        .replace(MD_KINDS.number.re, "$1");
      return already ? bare : bare.replace(/^\s*/, (ws) => ws + spec.make(n++));
    })
    .join("\n");

  replaceRange(ta, start, end, text, start, start + text.length);
}

/* Leaves the caret in whichever half of the link still needs typing. */
function mdLink(ta) {
  const { selectionStart: s, selectionEnd: e, value } = ta;
  const picked = value.slice(s, e).trim();
  const isURL = /^(?:https?:\/\/|mailto:)\S+$/i.test(picked);
  const text = isURL ? "" : picked;
  const url = isURL ? picked : "https://";

  const urlAt = s + 1 + text.length + 2;
  replaceRange(
    ta, s, e, `[${text}](${url})`,
    isURL ? s + 1 : urlAt,
    isURL ? s + 1 : urlAt + url.length
  );
}

function mdFence(ta) {
  const { selectionStart: s, selectionEnd: e, value } = ta;
  const lead = s > 0 && value[s - 1] !== "\n" ? "\n" : "";
  const text = `${lead}\`\`\`\n${value.slice(s, e)}\n\`\`\`\n`;
  const at = s + lead.length + 3;   // just past the opening fence, ready for a language
  replaceRange(ta, s, e, text, at, at);
}

const MD_HELP_ROWS = [
  ["**bold**", "bold"],
  ["*italic*", "italic"],
  ["~~strike~~", "struck through"],
  ["`code`", "inline code"],
  ["```cpp", "fenced code block"],
  ["- item", "bullet list"],
  ["1. item", "numbered list"],
  ["- [ ] task", "checklist"],
  ["[text](https://…)", "link"],
  ["{red|text}", "coloured text"],
  ["==text==", "highlighted text"],
  ["==blue|text==", "highlighted in a colour"],
];

/**
 * Adds a formatting toolbar, keyboard shortcuts and clipboard conversion to a
 * textarea. Idempotent, so it is safe to call again on the same element.
 */
function attachMarkdownEditor(ta, { place = "before" } = {}) {
  if (!ta || ta.dataset.mdEditor) return;
  ta.dataset.mdEditor = "1";

  const swatches = (kind) =>
    RT_COLORS.map(
      (c) => `<button type="button" class="md-sw md-sw-${c}" data-${kind}="${c}" title="${c}"></button>`
    ).join("");

  const bar = document.createElement("div");
  bar.className = "md-toolbar";
  bar.innerHTML = `
    <button type="button" class="md-btn" data-md="bold" title="Bold (Ctrl+B)"><b>B</b></button>
    <button type="button" class="md-btn md-italic" data-md="italic" title="Italic (Ctrl+I)"><i>I</i></button>
    <button type="button" class="md-btn md-strike" data-md="strike" title="Strike through">S</button>
    <button type="button" class="md-btn md-mono" data-md="code" title="Inline code">&lt;&gt;</button>
    <span class="md-sep"></span>
    <button type="button" class="md-btn" data-md="bullet" title="Bullet list">&#8226;&#8801;</button>
    <button type="button" class="md-btn md-mono" data-md="number" title="Numbered list">1.</button>
    <button type="button" class="md-btn" data-md="check" title="Checklist">&#9744;</button>
    <span class="md-sep"></span>
    <button type="button" class="md-btn" data-md="link" title="Link (Ctrl+K)">&#128279;</button>
    <button type="button" class="md-btn md-mono" data-md="fence" title="Code block">&#123;&#125;</button>
    <span class="md-sep"></span>
    <span class="md-wrap">
      <button type="button" class="md-btn" data-pop="fg" title="Text colour">A<span class="md-caret">&#9662;</span></button>
      <span class="md-pop" data-panel="fg" hidden>${swatches("fg")}</span>
    </span>
    <span class="md-wrap">
      <button type="button" class="md-btn" data-pop="hl" title="Highlight">&#9639;<span class="md-caret">&#9662;</span></button>
      <span class="md-pop" data-panel="hl" hidden>${swatches("hl")}</span>
    </span>
    <span class="md-sep"></span>
    <span class="md-wrap">
      <button type="button" class="md-btn" data-pop="help" title="Formatting help">?</button>
      <span class="md-pop md-pop-help" data-panel="help" hidden>
        <table class="md-help">${MD_HELP_ROWS
          .map(([syntax, meaning]) => `<tr><td><code>${escapeHTML(syntax)}</code></td><td>${escapeHTML(meaning)}</td></tr>`)
          .join("")}</table>
      </span>
    </span>`;

  if (place === "after") ta.after(bar);
  else ta.before(bar);

  const closePops = () => bar.querySelectorAll(".md-pop").forEach((p) => (p.hidden = true));

  const actions = {
    bold: () => mdWrap(ta, "**"),
    italic: () => mdWrap(ta, "*"),
    strike: () => mdWrap(ta, "~~"),
    code: () => mdWrap(ta, "`", "`", "code"),
    bullet: () => mdLines(ta, "bullet"),
    number: () => mdLines(ta, "number"),
    check: () => mdLines(ta, "check"),
    link: () => mdLink(ta),
    fence: () => mdFence(ta),
  };

  bar.addEventListener("mousedown", (e) => {
    // Keep the textarea's selection alive; the buttons act on it.
    if (e.target.closest("button")) e.preventDefault();
  });

  bar.addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (!button) return;
    e.preventDefault();

    if (button.dataset.md) { closePops(); actions[button.dataset.md](); return; }

    if (button.dataset.pop) {
      const panel = bar.querySelector(`[data-panel="${button.dataset.pop}"]`);
      const wasHidden = panel.hidden;
      closePops();
      panel.hidden = !wasHidden;
      return;
    }

    if (button.dataset.fg) { closePops(); mdWrap(ta, `{${button.dataset.fg}|`, "}"); return; }
    if (button.dataset.hl) { closePops(); mdWrap(ta, `==${button.dataset.hl}|`, "=="); }
  });

  /* Both of these sit on document so they work wherever focus happens to be,
     and both drop themselves once the toolbar leaves the page — the edit modal
     builds a fresh editor every time it opens, so otherwise they would pile up. */
  const onDocClick = (e) => {
    if (!bar.isConnected) return document.removeEventListener("click", onDocClick);
    if (!bar.contains(e.target)) closePops();
  };
  const onDocKey = (e) => {
    if (!bar.isConnected) return document.removeEventListener("keydown", onDocKey, true);
    if (e.key === "Escape" && bar.querySelector(".md-pop:not([hidden])")) {
      e.stopPropagation();   // capture phase, so the surrounding modal never sees it
      closePops();
    }
  };
  document.addEventListener("click", onDocClick);
  document.addEventListener("keydown", onDocKey, true);

  ta.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const shortcut = { b: "bold", i: "italic", k: "link" }[e.key.toLowerCase()];
      if (shortcut) { e.preventDefault(); actions[shortcut](); }
      return;
    }

    // Enter inside a list continues it; Enter on an empty item ends it.
    if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
    if (ta.selectionStart !== ta.selectionEnd) return;

    const at = ta.selectionStart;
    const from = ta.value.lastIndexOf("\n", at - 1) + 1;
    const line = ta.value.slice(from, at);
    const m = line.match(/^(\s*)(-\s\[[ xX]\]|[-*+]|\d{1,9}[.)])\s+/);
    if (!m) return;

    e.preventDefault();
    if (!line.slice(m[0].length).trim()) { replaceRange(ta, from, at, ""); return; }

    const marker = /^\d/.test(m[2])
      ? `${parseInt(m[2], 10) + 1}. `
      : m[2].includes("[") ? "- [ ] " : `${m[2]} `;
    replaceRange(ta, at, at, `\n${m[1]}${marker}`);
  });

  ta.addEventListener("paste", (e) => {
    const data = e.clipboardData;
    if (!data) return;

    const html = data.getData("text/html");
    const plain = data.getData("text/plain");
    let text = null;
    let images = 0;

    if (html && html.length <= 400000) {
      try {
        const converted = htmlToMarkdown(html);
        if (converted.text.trim()) { text = converted.text; images = converted.images; }
      } catch {
        text = null;   // malformed clipboard HTML: fall through to plain text
      }
    }
    if (text == null && plain) text = normalisePastedText(plain);

    // Nothing textual (a file or a bare image), or nothing to fix: let the
    // browser handle it, which also keeps its undo entry tidy.
    if (text == null) return;
    if (text === plain && !images) return;

    e.preventDefault();
    replaceRange(ta, ta.selectionStart, ta.selectionEnd, text);
    if (images) {
      toast(`Pasted as text — ${images} image${images > 1 ? "s" : ""} skipped for now.`);
    }
  });
}

/* ---------- toast ---------- */

let toastTimer = null;

function toast(message, isError = false) {
  const node = document.getElementById("toast");
  if (!node) return;
  node.textContent = message;
  node.classList.toggle("app-toast-error", isError);
  node.classList.add("app-toast-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("app-toast-show"), isError ? 5000 : 2600);
}

/* ---------- modal ---------- */

/**
 * Opens a modal. `fields` is an array of
 * { name, label, type: "text"|"textarea"|"select", value, placeholder, rows, hint, options }.
 * A textarea field with `markdown: true` also gets the formatting toolbar.
 * Resolves with an object of values, or null if dismissed.
 */
function openModal({ title, subtitle, fields = [], confirmLabel = "Save", danger = false }) {
  return new Promise((resolve) => {
    const root = document.getElementById("modal-root");
    const backdrop = document.createElement("div");
    backdrop.className = "app-modal-backdrop";

    const body = fields
      .map((f) => {
        const id = `mf-${f.name}`;
        const hint = f.hint ? ` <span class="app-hint">${escapeHTML(f.hint)}</span>` : "";
        const label = `<label class="app-label" for="${id}">${escapeHTML(f.label)}${hint}</label>`;
        let control;
        if (f.type === "textarea") {
          control = `<textarea class="app-textarea" id="${id}" rows="${f.rows || 6}" placeholder="${escapeHTML(f.placeholder || "")}">${escapeHTML(f.value || "")}</textarea>`;
        } else if (f.type === "select") {
          const opts = (f.options || [])
            .map((o) => `<option value="${escapeHTML(o.value)}"${o.value === f.value ? " selected" : ""}>${escapeHTML(o.label)}</option>`)
            .join("");
          control = `<select class="app-select" id="${id}">${opts}</select>`;
        } else {
          control = `<input class="app-input" id="${id}" type="text" value="${escapeHTML(f.value || "")}" placeholder="${escapeHTML(f.placeholder || "")}" />`;
        }
        return `<div class="app-field">${label}${control}</div>`;
      })
      .join("");

    backdrop.innerHTML = `
      <div class="app-modal" role="dialog" aria-modal="true">
        <h2>${escapeHTML(title)}</h2>
        ${subtitle ? `<p class="app-modal-sub">${escapeHTML(subtitle)}</p>` : ""}
        <form id="modal-form">
          ${body}
          <div class="app-modal-actions">
            <button type="button" class="app-btn app-btn-ghost" data-act="cancel">Cancel</button>
            <button type="submit" class="app-btn ${danger ? "app-btn-danger" : "app-btn-primary"}">${escapeHTML(confirmLabel)}</button>
          </div>
        </form>
      </div>`;

    const close = (result) => {
      document.removeEventListener("keydown", onKey);
      backdrop.remove();
      resolve(result);
    };
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(null); }
    };

    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(null); });
    backdrop.querySelector('[data-act="cancel"]').addEventListener("click", () => close(null));
    backdrop.querySelector("#modal-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const out = {};
      for (const f of fields) out[f.name] = document.getElementById(`mf-${f.name}`).value;
      close(out);
    });

    document.addEventListener("keydown", onKey);
    root.appendChild(backdrop);

    // Must happen after the modal is live: the toolbar is real DOM, not markup.
    for (const f of fields) {
      if (f.type === "textarea" && f.markdown) attachMarkdownEditor(document.getElementById(`mf-${f.name}`));
    }

    const first = backdrop.querySelector("input, textarea, select");
    if (first) { first.focus(); if (first.select) first.select(); }
  });
}

async function confirmModal({ title, subtitle, confirmLabel = "Delete" }) {
  const res = await openModal({ title, subtitle, fields: [], confirmLabel, danger: true });
  return res !== null;
}

/* ---------- misc ---------- */

const el = (id) => document.getElementById(id);

function parseTags(raw) {
  return String(raw || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function debounce(fn, ms) {
  let t = null;
  const wrapped = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  wrapped.flush = (...args) => {
    clearTimeout(t);
    fn(...args);
  };
  return wrapped;
}

async function loadIdentity() {
  try {
    const me = await API.get("/api/me");
    const node = el("user-email");
    if (node && me.email) node.textContent = me.email;
    return me.email;
  } catch {
    return null;
  }
}
