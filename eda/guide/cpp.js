/**
 * Puts each stage's C++ listing under its "In the demo" note, from the same
 * source the demo's explainers use (/eda/ui/cpp.js), so the two never drift.
 * highlight.js loads only when someone first opens a listing.
 */
import { CPP } from "/eda/ui/cpp.js";

let highlighter = null;
function loadHighlighter() {
  if (window.hljs) return Promise.resolve(window.hljs);
  if (!highlighter) {
    highlighter = new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "/eda/vendor/highlight-theme.min.css";
      document.head.appendChild(css);
      const script = document.createElement("script");
      script.src = "/eda/vendor/highlight.min.js";
      script.onload = () => resolve(window.hljs);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return highlighter;
}

for (const [id, { file, code }] of Object.entries(CPP)) {
  const note = document.querySelector(`#${id} p.in-demo`);
  if (!note) continue;

  const details = document.createElement("details");
  details.className = "deeper cpp";
  details.innerHTML = `<summary>The algorithm, in C++</summary>
    <p>A condensed rendering of what the stage runs: same algorithm, same order of operations, without the
      plumbing and drawing. The live code is JavaScript, at <a href="/eda/flow/${file}">/eda/flow/${file}</a>.</p>
    <pre><code class="language-cpp"></code></pre>`;
  const block = details.querySelector("code");
  block.textContent = code;
  note.after(details);

  details.addEventListener("toggle", () => {
    if (!details.open || block.dataset.highlighted) return;
    loadHighlighter().then((hljs) => hljs.highlightElement(block)).catch(() => {});
  });
}
