// Harness for graph algorithms.
//
// A submitted body is spliced into the middle of solve() below, so what gets
// submitted is a sequence of statements rather than a whole translation unit.
// The includes, the graph, the Trace and main() all live on this side, which
// means a submission cannot get the I/O contract wrong and there is no main()
// to smuggle anything into.
//
// The splice marker is deliberately an unlikely token and must appear exactly
// once; the runner refuses to build the file otherwise. An earlier version used
// a marker that also appeared in this comment, and spliced the body into the
// comment instead of into the function.

#include "trace.hpp"

void solve(const viz::Graph& g, viz::Trace& t) {
/*@@SPLICE@@*/
}

int main() {
    // The frames are the only thing on stdout and the stream is drained once
    // at exit, so there is no reason to pay for C stdio synchronisation.
    std::ios::sync_with_stdio(false);

    const viz::Graph g = viz::read_graph(std::cin);
    viz::Trace t(g);
    solve(g, t);
    std::cout.flush();
    return 0;
}
