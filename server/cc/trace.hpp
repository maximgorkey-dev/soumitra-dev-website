// The contract between a submitted algorithm body and the viewer.
//
// A submitted body does not print anything and does not own main(). It fills in
// one function and calls Trace::emit() whenever it wants the picture to change:
//
//     void solve(const viz::Graph& g, viz::Trace& t) { ... }
//
// Each emit() writes one JSON object on one line of stdout, in exactly the
// shape apps/algorithms/core/trace.js documents, so the browser renderers drive
// off C++ output with no translation layer. The frame is a whole snapshot of
// the current edge states, component colouring and metrics — not a delta —
// which is what makes scrubbing backwards in the player an array index.
//
// Standard headers a teaching algorithm plausibly needs are included here, and
// a submitted body is refused if it contains its own #include. That keeps the
// preprocessor entirely on this side of the boundary. It is a scope decision,
// not a security one: the sandbox is what makes running the result safe.

#ifndef VIZ_TRACE_HPP
#define VIZ_TRACE_HPP

// Kept deliberately short. Every header here is parsed on every submission, and
// on a 1 GB box that is the dominant cost of a run — the first version of this
// file pulled in nine more and took several seconds longer per compile. These
// are the ones a graph algorithm actually reaches for; the set the submitter
// can rely on is listed in the app's "What you can call" panel.
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <functional>
#include <iostream>
#include <limits>
#include <map>
#include <numeric>
#include <queue>
#include <set>
#include <string>
#include <tuple>
#include <utility>
#include <vector>

namespace viz {

// A runaway loop should surface as a clear message, not as a hung tab or a
// multi-megabyte response. The runner caps output independently; this exists so
// the failure is reported in the algorithm's own terms.
inline constexpr int MAX_FRAMES = 2000;

// The visual states the graph renderer understands. Anything else is drawn idle.
inline constexpr const char* IDLE      = "idle";
inline constexpr const char* CANDIDATE = "candidate";
inline constexpr const char* ACCEPTED  = "accepted";
inline constexpr const char* REJECTED  = "rejected";

struct Edge {
    int u = 0;   // endpoint, 0-based vertex index
    int v = 0;
    int w = 0;   // weight
};

class Graph {
public:
    int n = 0;                          // vertex count; vertices are 0 .. n-1
    std::vector<Edge> edges;            // in the order they were drawn
    std::vector<std::string> labels;    // labels[v] is the letter on the circle

    int size() const { return n; }
    std::size_t edge_count() const { return edges.size(); }

    // The name the viewer sees, for use in note text.
    const std::string& label(int v) const {
        static const std::string unknown = "?";
        return (v >= 0 && v < static_cast<int>(labels.size())) ? labels[v] : unknown;
    }
};

namespace detail {

inline void write_escaped(std::ostream& out, const std::string& s) {
    for (const unsigned char c : s) {
        switch (c) {
            case '"':  out << "\\\""; break;
            case '\\': out << "\\\\"; break;
            case '\n': out << "\\n";  break;
            case '\r': out << "\\r";  break;
            case '\t': out << "\\t";  break;
            default:
                if (c < 0x20) {
                    // Control characters have to be escaped numerically or the
                    // line stops being parseable JSON.
                    static const char* hex = "0123456789abcdef";
                    out << "\\u00" << hex[(c >> 4) & 0xF] << hex[c & 0xF];
                } else {
                    out << static_cast<char>(c);
                }
        }
    }
}

inline void write_string(std::ostream& out, const std::string& s) {
    out << '"';
    write_escaped(out, s);
    out << '"';
}

}  // namespace detail

class Trace {
public:
    explicit Trace(const Graph& g)
        : labels_(g.labels), edge_state_(g.edge_count(), IDLE), component_(g.n) {
        // Until the body says otherwise, every vertex is its own component,
        // which is the correct starting picture for the union-find algorithms.
        for (int i = 0; i < g.n; ++i) component_[i] = i;
    }

    // Set the visual state of one edge, addressed by its index in Graph::edges.
    void edge(std::size_t index, const char* state) {
        if (index < edge_state_.size()) edge_state_[index] = state;
    }

    void reset_edges() { std::fill(edge_state_.begin(), edge_state_.end(), IDLE); }

    // Component colouring. Pass one group id per vertex; the ids can be
    // anything (union-find roots are the usual thing) and are renumbered here
    // into the dense 0,1,2,... the renderer needs for its colour palette.
    void components(const std::vector<int>& group_of_vertex) {
        std::map<int, int> dense;
        for (std::size_t v = 0; v < component_.size() && v < group_of_vertex.size(); ++v) {
            const int g = group_of_vertex[v];
            auto [it, inserted] = dense.emplace(g, static_cast<int>(dense.size()));
            component_[v] = it->second;
        }
    }

    // Running totals shown beside the picture. Setting the same label again
    // replaces its value and keeps its original position, so calling this
    // every iteration reads as an update rather than appending a duplicate.
    void metric(const std::string& label, const std::string& value) {
        for (auto& m : metrics_) {
            if (m.first == label) { m.second = value; return; }
        }
        metrics_.emplace_back(label, value);
    }

    void metric(const std::string& label, long long value) {
        metric(label, std::to_string(value));
    }

    void clear_metrics() { metrics_.clear(); }

    // Write one frame. `note` is the sentence the viewer reads, present tense.
    void emit(const std::string& phase, const std::string& note, const std::string& detail = "") {
        if (++frames_ > MAX_FRAMES) {
            std::cout.flush();
            std::cerr << "emitted more than " << MAX_FRAMES
                      << " frames; the loop is probably not terminating\n";
            std::exit(3);
        }

        std::ostream& out = std::cout;
        out << "{\"note\":";
        detail::write_string(out, note);
        out << ",\"phase\":";
        detail::write_string(out, phase);
        out << ",\"detail\":";
        detail::write_string(out, detail);

        out << ",\"marks\":{\"edges\":{";
        for (std::size_t i = 0; i < edge_state_.size(); ++i) {
            if (i) out << ',';
            out << '"' << i << "\":\"" << edge_state_[i] << '"';
        }
        out << "},\"components\":{";
        for (std::size_t v = 0; v < component_.size(); ++v) {
            if (v) out << ',';
            detail::write_string(out, v < labels_.size() ? labels_[v] : std::to_string(v));
            out << ':' << component_[v];
        }
        out << "}}";

        out << ",\"metrics\":[";
        for (std::size_t i = 0; i < metrics_.size(); ++i) {
            if (i) out << ',';
            out << "{\"label\":";
            detail::write_string(out, metrics_[i].first);
            out << ",\"value\":";
            detail::write_string(out, metrics_[i].second);
            out << '}';
        }
        out << "]}\n";
    }

    int frame_count() const { return frames_; }

private:
    std::vector<std::string> labels_;
    std::vector<const char*> edge_state_;
    std::vector<int> component_;
    std::vector<std::pair<std::string, std::string>> metrics_;
    int frames_ = 0;
};

// Reads the fixed plain-text description the runner writes on stdin:
//
//     n m
//     u v w        (m lines, 0-based endpoints)
//     label0 label1 ... label(n-1)
//
// Deliberately not JSON. A JSON parser is a chunk of code that would have to be
// correct for input the submitter never sees and cannot influence, in exchange
// for nothing — the runner is the only writer of this stream.
inline Graph read_graph(std::istream& in) {
    Graph g;
    int m = 0;
    if (!(in >> g.n >> m)) {
        std::cerr << "could not read the graph header\n";
        std::exit(4);
    }

    g.edges.resize(static_cast<std::size_t>(m));
    for (int i = 0; i < m; ++i) {
        if (!(in >> g.edges[i].u >> g.edges[i].v >> g.edges[i].w)) {
            std::cerr << "could not read edge " << i << "\n";
            std::exit(4);
        }
    }

    g.labels.resize(static_cast<std::size_t>(g.n));
    for (int v = 0; v < g.n; ++v) {
        if (!(in >> g.labels[v])) g.labels[v] = std::to_string(v);
    }
    return g;
}

}  // namespace viz

#endif  // VIZ_TRACE_HPP
