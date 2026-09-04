/**
 * Graph renderer.
 *
 * One renderer per structure kind — graph here, arrays and trees later — and
 * the contract is narrow on purpose: it is handed a structure once, then a
 * frame at a time, and it owns nothing else. No algorithm knowledge lives
 * here, only the vocabulary of visual states an algorithm may ask for.
 *
 * SVG rather than canvas. These graphs are a dozen nodes; text labels,
 * hit-testing and crisp scaling all come free, and there is no frame budget to
 * worry about. The EDA app draws to canvas because it has thousands of
 * segments to push sixty times a second, which is the opposite situation.
 */

const NS = "http://www.w3.org/2000/svg";

/** Visual states an algorithm may put on an element, in drawing order. */
const EDGE_STATES = ["idle", "candidate", "rejected", "accepted"];
const NODE_STATES = ["idle", "frontier", "visited"];

const make = (name, attrs = {}) => {
  const el = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};

export function createGraphView(root) {
  let graph = null;
  let nodeEls = new Map();
  let edgeEls = new Map();
  let labelEls = new Map();
  let svg = null;

  /* Node coordinates are stored normalised so a structure is independent of
     the size it happens to be drawn at. */
  const PAD = 44;
  const place = (n, w, h) => ({ x: PAD + n.x * (w - 2 * PAD), y: PAD + n.y * (h - 2 * PAD) });

  function setStructure(next) {
    graph = next;
    root.innerHTML = "";
    nodeEls = new Map();
    edgeEls = new Map();
    labelEls = new Map();

    const w = 640;
    const h = 400;
    svg = make("svg", { viewBox: `0 0 ${w} ${h}`, class: "graph-svg", preserveAspectRatio: "xMidYMid meet" });

    const pos = new Map(graph.nodes.map((n) => [n.id, place(n, w, h)]));

    // Edges first so nodes draw over them, and edge weight labels last of all
    // so nothing obscures the numbers the algorithm is reasoning about.
    const edgeLayer = make("g");
    const labelLayer = make("g");
    const nodeLayer = make("g");

    graph.edges.forEach((e, i) => {
      const a = pos.get(e.u);
      const b = pos.get(e.v);
      const line = make("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: "gv-edge", "data-state": "idle" });
      edgeLayer.appendChild(line);
      edgeEls.set(i, line);

      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const chip = make("g", { class: "gv-weight", "data-state": "idle" });
      chip.appendChild(make("rect", { x: mx - 13, y: my - 11, width: 26, height: 22, rx: 6 }));
      const t = make("text", { x: mx, y: my + 5, "text-anchor": "middle" });
      t.textContent = String(e.w);
      chip.appendChild(t);
      labelLayer.appendChild(chip);
      labelEls.set(i, chip);
    });

    for (const n of graph.nodes) {
      const p = pos.get(n.id);
      const g = make("g", { class: "gv-node", "data-state": "idle" });
      g.appendChild(make("circle", { cx: p.x, cy: p.y, r: 21 }));
      const t = make("text", { x: p.x, y: p.y + 6, "text-anchor": "middle" });
      t.textContent = n.id;
      g.appendChild(t);
      nodeLayer.appendChild(g);
      nodeEls.set(n.id, g);
    }

    svg.append(edgeLayer, labelLayer, nodeLayer);
    root.appendChild(svg);
  }

  /**
   * Apply a frame. Every element is written on every frame rather than only
   * the changed ones — frames are snapshots, so the alternative is tracking
   * what the previous frame said, which is the bookkeeping the snapshot model
   * exists to avoid.
   */
  function show(f) {
    const marks = f.marks || {};
    const edges = marks.edges || {};
    const nodes = marks.nodes || {};

    edgeEls.forEach((el, i) => {
      const state = EDGE_STATES.includes(edges[i]) ? edges[i] : "idle";
      el.setAttribute("data-state", state);
      labelEls.get(i).setAttribute("data-state", state);
    });

    nodeEls.forEach((el, id) => {
      const state = NODE_STATES.includes(nodes[id]) ? nodes[id] : "idle";
      el.setAttribute("data-state", state);
      // Component colouring is what makes union-find legible: two nodes the
      // same colour are already connected, so an edge between them is the
      // thing Kruskal is about to reject.
      const comp = marks.components ? marks.components[id] : undefined;
      if (comp === undefined) el.removeAttribute("data-component");
      else el.setAttribute("data-component", String(comp % 8));
    });
  }

  function clear() {
    if (svg) show({ marks: {} });
  }

  return { setStructure, show, clear };
}
