/**
 * The algorithm behind each stage, written out as C++.
 *
 * These are condensed renderings of what the JavaScript in /eda/flow/ does —
 * same algorithm, same order of operations, with plumbing and drawing left
 * out — because C++ is the language this work is done in professionally and
 * the one a reader from the field will want to check it against.
 */

export const CPP = {
  floorplan: {
    file: "floorplan.js",
    code: String.raw`// Floorplan: size the core from cell area, cut it into rows, pin the IOs.
struct Rect { long x, y, w, h; };
struct Floorplan { Rect die, core; int rows, sitesPerRow; };

constexpr long ROW_H = 1600, SITE_W = 200;
constexpr double ROW_FILL = 0.98;   // headroom for the legaliser

// Can these widths be packed into 'rows' rows? Best-fit decreasing:
// widest first, each into the fullest row that still takes it.
bool packs(std::vector<long> widths, int rows, double rowWidth) {
  std::sort(widths.rbegin(), widths.rend());
  std::vector<double> used(rows, 0.0);
  for (long w : widths) {
    int best = -1;
    for (int r = 0; r < rows; ++r)
      if (used[r] + w <= rowWidth && (best < 0 || used[r] > used[best])) best = r;
    if (best < 0) return false;
    used[best] += w;
  }
  return true;
}

Floorplan floorplan(const Design& d, double utilization, double aspect) {
  double cellArea = 0;
  std::vector<long> widths;
  for (const Cell& c : d.cells) { cellArea += double(c.w) * c.h; widths.push_back(c.w); }

  // Area follows from how densely we dare pack; shape from the aspect ratio.
  const double coreArea = cellArea / utilization;
  int rows  = std::max(1, int(std::lround(std::sqrt(coreArea / aspect) / ROW_H)));
  int sites = int(std::ceil(coreArea / (rows * ROW_H) / SITE_W));

  // Area is necessary, not sufficient: every cell must fit in some row.
  while (!packs(widths, rows, sites * SITE_W * ROW_FILL)) ++sites;

  const long margin = std::clamp(int(std::lround(rows * 0.15)), 1, 3) * ROW_H;
  Floorplan fp{};
  fp.rows = rows;
  fp.sitesPerRow = sites;
  fp.core = { margin, margin, sites * SITE_W, rows * ROW_H };
  fp.die  = { 0, 0, fp.core.w + 2 * margin, fp.core.h + 2 * margin };
  placePorts(d, fp);   // IOs spread along the die edge; the clock enters bottom centre
  return fp;
}`,
  },

  place: {
    file: "globalplace.js",
    code: String.raw`// Global placement: analytic, force-directed.
// Wirelength is a quadratic spring system (bound-to-bound net model); density
// enters the SAME linear solve as a per-cell force on the right-hand side.
// Applying density after the solve does not work: the next solve undoes it.

void addBoundToBound(const Net& net, Axis a, SparseMatrix& A, Vector& b) {
  const int k = int(net.pins.size());
  if (k < 2) return;
  const Pin& lo = net.minPin(a);              // pins on the bounding-box edges
  const Pin& hi = net.maxPin(a);
  for (const Pin& p : net.pins)
    for (const Pin* q : { &lo, &hi }) {
      if (&p == q) continue;
      // 1/distance weighting is what makes the quadratic approximate HPWL.
      double w = 2.0 / ((k - 1) * std::max(EPS, std::abs(p.pos(a) - q->pos(a))));
      A.addSpring(p, *q, w, b, a);            // movable-movable or movable-fixed
    }
}

void globalPlace(Design& d, const Params& prm) {
  const int n = d.numCells();
  Vector force[2] = { Vector(n, 0.0), Vector(n, 0.0) };
  std::vector<double> history;

  for (int iter = 0; iter < prm.iterations; ++iter) {
    // 1. Density field on bins about one row tall, exact rectangle overlap.
    DensityGrid bins(d.core, ROW_H);
    bins.accumulate(d.cells);

    // 2. Accumulate a small step down the gradient. Small: under one bin,
    //    or cells clamp to the core edge and pile up there instead.
    for (const Cell& c : d.cells) {
      Vec2 g = bins.gradient(c.centre());     // central difference
      force[X][c.id] -= prm.step * g.x;
      force[Y][c.id] -= prm.step * g.y;
    }

    // 3. Rebuild spring weights from current positions and solve each axis.
    for (Axis a : { X, Y }) {
      SparseMatrix A(n);
      Vector b(n, 0.0);
      for (const Net& net : d.nets) addBoundToBound(net, a, A, b);
      // x_i = (sum w (p - o) + f_i) / sum w, so f_i = (sum w) * displacement
      for (int i = 0; i < n; ++i) b[i] += A.diag(i) * force[a][i];
      conjugateGradient(A, b, d.positions(a));
    }
    d.clampToCore();

    // 4. Stop when density is good enough or wirelength has stopped moving.
    double ovf = bins.overflow(densityCeiling(d));
    history.push_back(hpwl(d));
    if (ovf < prm.targetOverflow || plateaued(history)) break;
  }
}`,
  },

  legalize: {
    file: "legalize.js",
    code: String.raw`// Legalisation: Abacus (Spindler, Schlichtmann and Johannes, 2008).
// Cells in x order; each tries nearby rows, the cheapest row wins. Inside a
// row, touching cells form clusters placed at the weighted mean of their
// members' targets: the exact optimum of squared displacement for that order.

struct Cluster {
  double x = 0;      // left edge
  double e = 0;      // total weight
  double q = 0;      // sum of weight * (target - offset in cluster)
  double w = 0;      // total width
};

struct Row {
  double y, xmin, xmax;
  std::vector<Cluster> clusters;

  void add(const Cell& c) {
    if (clusters.empty() || clusters.back().x + clusters.back().w <= c.targetX)
      clusters.push_back({ c.targetX, 0, 0, 0 });
    Cluster& k = clusters.back();
    k.e += c.weight;
    k.q += c.weight * (c.targetX - k.w);
    k.w += c.width;
    collapse();
  }

  void collapse() {
    for (;;) {
      Cluster& k = clusters.back();
      k.x = std::clamp(snapToSite(k.q / k.e), xmin, xmax - k.w);   // optimum
      if (clusters.size() < 2) return;
      Cluster& prev = clusters[clusters.size() - 2];
      if (prev.x + prev.w <= k.x) return;      // no overlap: done
      prev.e += k.e;                           // overlap: merge and re-solve
      prev.q += k.q - k.e * prev.w;
      prev.w += k.w;
      clusters.pop_back();
    }
  }
};

void legalize(Design& d, std::vector<Row>& rows, int radius) {
  auto cells = d.movableCells();
  std::sort(cells.begin(), cells.end(), [](auto* a, auto* b) { return a->targetX < b->targetX; });
  for (Cell* c : cells) {
    int home = nearestRow(c->targetY), best = -1;
    double bestCost = INFINITY;
    for (int r = home - radius; r <= home + radius; ++r) {
      if (r < 0 || r >= int(rows.size()) || !rows[r].fits(*c)) continue;
      Row trial = rows[r];                     // place tentatively, measure
      trial.add(*c);
      double cost = trial.displacement(*c) + std::abs(rows[r].y - c->targetY);
      if (cost < bestCost) { bestCost = cost; best = r; }
    }
    if (best >= 0) rows[best].add(*c);
    else d.retryWidestFirst(*c);               // rare: crowded band, retry wide cells first
  }
  for (Row& r : rows) r.writePositions(d);
}`,
  },

  cts: {
    file: "cts.js",
    code: String.raw`// Clock tree synthesis: method of means and medians (Jackson et al., 1990).
// Split the sinks at the median of the longer side, recurse, and put a buffer
// at the centroid of each group. Time it with Elmore delay.

struct Sink { Point p; double cap; int flop; };
struct Node {
  Point p; int depth;
  std::vector<Sink> sinks;                     // leaves only
  std::unique_ptr<Node> left, right;
  const Buffer* buf = nullptr;
  double load = 0;
};

constexpr int LEAF_SINKS = 4;
constexpr double BIG_LOAD = 24.0;              // fF: above this, use the strong buffer

std::unique_ptr<Node> partition(std::vector<Sink> s, int depth) {
  auto n = std::make_unique<Node>();
  n->p = centroid(s);
  n->depth = depth;
  if (s.size() <= LEAF_SINKS) { n->sinks = std::move(s); return n; }
  Box b = bbox(s);
  bool alongX = b.width() >= b.height();
  auto mid = s.begin() + s.size() / 2;
  std::nth_element(s.begin(), mid, s.end(), [&](const Sink& a, const Sink& c) {
    return alongX ? a.p.x < c.p.x : a.p.y < c.p.y;
  });
  n->left  = partition({ s.begin(), mid }, depth + 1);
  n->right = partition({ mid, s.end() }, depth + 1);
  return n;
}

// Bottom-up: each buffer's load decides which buffer it is.
void size(Node& n) {
  n.load = 0;
  for (const Sink& s : n.sinks) n.load += s.cap + wireC(manhattan(n.p, s.p));
  for (Node* c : { n.left.get(), n.right.get() }) {
    if (!c) continue;
    size(*c);
    n.load += c->buf->inputCap + wireC(manhattan(n.p, c->p));
  }
  n.buf = n.load > BIG_LOAD ? &BUFX4 : &BUF;
}

// Top-down: buffer delay = intrinsic + R_drive * C_load;
// wire delay = R_wire * (C_wire / 2 + C_downstream).
void propagate(const Node& n, double tIn, std::vector<double>& latency) {
  const double tOut = tIn + n.buf->intrinsic + n.buf->driveRes * n.load;
  for (const Sink& s : n.sinks) {
    Wire w = wireRC(manhattan(n.p, s.p));
    latency[s.flop] = tOut + w.r * (w.c / 2 + s.cap);
  }
  for (const Node* c : { n.left.get(), n.right.get() }) {
    if (!c) continue;
    Wire w = wireRC(manhattan(n.p, c->p));
    propagate(*c, tOut + w.r * (w.c / 2 + c->buf->inputCap), latency);
  }
}

double skew(const std::vector<double>& latency) {
  auto [lo, hi] = std::minmax_element(latency.begin(), latency.end());
  return *hi - *lo;                            // what DME and wire snaking would remove
}`,
  },

  groute: {
    file: "groute.js",
    code: String.raw`// Global routing on a grid of tiles (gcells).
// 1. Decompose each net into 2-pin connections along its MST.
// 2. Pattern-route each as the cheaper of its two L shapes.
// 3. Negotiate (PathFinder): rip up nets on overfull edges, reroute with A*
//    under cost = (1 + history) * (1 + present * overuse).

struct Grid {
  int nx, ny;
  std::vector<int> usage, cap;                 // one entry per tile boundary
  std::vector<double> history;
  double present = 0.5;

  double cost(int e) const {
    int over = usage[e] + 1 - cap[e];
    return (1 + history[e]) * (over > 0 ? 1 + present * over : 1);
  }
};

struct Conn { int a, b; std::vector<int> path; };   // path = tile ids

std::vector<int> aStar(const Grid& g, int a, int b, int detour) {
  Box box = expand(bbox(g, a, b), detour);
  std::vector<double> dist(g.nx * g.ny, INFINITY);
  std::vector<int> prev(g.nx * g.ny, -1);
  using Item = std::pair<double, int>;
  std::priority_queue<Item, std::vector<Item>, std::greater<>> open;
  dist[a] = 0;
  open.push({ manhattan(g, a, b), a });
  while (!open.empty()) {
    auto [f, u] = open.top(); open.pop();
    if (u == b) break;
    for (int v : g.neighbours(u, box)) {
      double nd = dist[u] + g.cost(g.edge(u, v));
      if (nd < dist[v]) {
        dist[v] = nd; prev[v] = u;
        open.push({ nd + manhattan(g, v, b), v });   // admissible: every edge costs >= 1
      }
    }
  }
  return tracePath(prev, a, b);
}

void globalRoute(Grid& g, std::vector<Conn>& conns, int maxRounds) {
  for (Conn& c : conns) {
    auto p1 = lShape(g, c.a, c.b, /*horizontalFirst=*/true);
    auto p2 = lShape(g, c.a, c.b, false);
    c.path = pathCost(g, p1) <= pathCost(g, p2) ? p1 : p2;
    commit(g, c.path, +1);
  }
  for (int round = 0; round < maxRounds && totalOverflow(g) > 0; ++round) {
    std::vector<char> hot(g.usage.size(), 0);
    for (size_t e = 0; e < g.usage.size(); ++e)
      if (g.usage[e] > g.cap[e]) { hot[e] = 1; g.history[e] += 1; }
    g.present *= 1.8;                          // overuse gets more expensive every round
    for (Conn& c : conns) {
      if (!crossesAny(g, c.path, hot)) continue;
      commit(g, c.path, -1);                   // rip up
      c.path = aStar(g, c.a, c.b, /*detour=*/3);
      commit(g, c.path, +1);                   // reroute
    }
  }
}`,
  },

  sta: {
    file: "sta.js",
    code: String.raw`// Static timing analysis: arrival forward in topological order, required
// backward, slack = required - arrival. Flip-flops cut the graph, so the
// combinational logic between them is a DAG.

struct Timing { double late = NAN, early = NAN; };

void analyse(const Design& d, const Constraints& k, const std::vector<double>& clkLat) {
  std::vector<Timing> net(d.nets.size());
  std::vector<int> pending(d.cells.size());
  std::queue<int> ready;

  auto settle = [&](int ni) {
    for (const Term& s : d.nets[ni].sinks)
      if (!s.port && !d.cells[s.cell].isSeq() && --pending[s.cell] == 0) ready.push(s.cell);
  };

  // Sources: primary inputs and flip-flop outputs.
  for (const Net& n : d.nets) {
    if (n.driver.port)
      net[n.id] = { k.inputDelay + INPUT_DRIVE * load(n), k.inputDelay + INPUT_DRIVE * load(n) };
    else if (d.cells[n.driver.cell].isSeq()) {
      const Lib& L = lib(n.driver.cell);
      double t = clkLat[n.driver.cell] + L.clkToQ + L.driveRes * load(n);
      net[n.id] = { t, t };
    } else continue;
    settle(n.id);
  }

  // Kahn's algorithm. A cell's output: latest (and earliest) input arrival,
  // plus wire delay to its pin, plus intrinsic + R_drive * C_load.
  std::vector<int> order;
  while (!ready.empty()) {
    int c = ready.front(); ready.pop();
    order.push_back(c);
    const Lib& L = lib(c);
    const int out = outputNet(c);
    double hi = -INFINITY, lo = INFINITY;
    for (const Input& in : inputs(c)) {
      double base = L.intrinsic(in.pin) + elmore(in.net, in.term);
      hi = std::max(hi, net[in.net].late + base);
      lo = std::min(lo, net[in.net].early + base);
    }
    double drive = L.driveRes * load(d.nets[out]);
    net[out] = { hi + drive, lo + drive };
    settle(out);
  }

  // Endpoints. Setup: arrive before the capture edge, minus setup time.
  // Hold: do not arrive before the same edge is captured, plus hold time.
  for (const Endpoint& e : endpoints(d)) {
    double arrive = net[e.net].late + elmore(e.net, e.term);
    double setupReq = e.isOutput ? k.period - k.outputDelay
                                 : k.period + clkLat[e.flop] - lib(e.flop).setup;
    report(e, setupReq - arrive);
    if (!e.isOutput) {
      double early = net[e.net].early + elmore(e.net, e.term);
      reportHold(e, early - (clkLat[e.flop] + lib(e.flop).hold));
    }
  }

  // Required times backward over the same order give slack at every cell,
  // which is what colours the layout; the worst endpoint's predecessors,
  // followed back to a source, are the critical path.
  backwardRequired(d, order);
}`,
  },
};
