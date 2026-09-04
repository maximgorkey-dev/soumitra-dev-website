#!/usr/bin/env python3
"""
Compiles and runs a submitted algorithm body, and returns the frames it emitted.

This is the only component on the box that executes code it did not write, so
the shape of it is dictated by that. Two things are worth stating plainly.

First: nothing here tries to decide whether the submitted source is safe. That
question cannot be answered from C++ text. `system` can be reached as
`std::system`, as `::system`, through a preprocessor paste, through a hand
declaration with no #include at all, or by putting the syscall number in a
register with inline asm — and none of that matters anyway, because a program
using nothing but <vector> can exhaust memory or fork until the process table
is full. The submitted code is assumed hostile and contained instead.

Second: containment is layered, and each layer is independently sufficient for
the failure it addresses.

  bubblewrap    --unshare-all removes the network namespace entirely, so there
                is no route out and no route to the loopback services. Only
                /usr is bound, read-only, and only for the compile step; the
                binary is linked statically so the run step needs no libraries
                bound at all. The apps database, the oauth2-proxy config and
                every home directory are simply not present in the mount
                namespace.
  rlimits       RLIMIT_CPU ends an infinite loop even if the wall clock is
                somehow evaded, RLIMIT_NPROC ends a fork bomb, RLIMIT_FSIZE
                ends an attempt to fill the disk, RLIMIT_AS bounds allocation.
  cgroup        This service has its own systemd slice and memory ceiling, so a
                runaway compile cannot reach the API, nginx or oauth2-proxy.
                That separation is the reason this is not simply a function
                call inside site-api, which runs under MemoryMax=256M and would
                be OOM-killed along with everyone's notes.
  serialisation One job at a time. The box has under 500 MB spare and a compile
                peaks near 110 MB.
  output caps   Bytes, frames and field lengths are all bounded, and every
                frame is rebuilt field by field rather than forwarded, so a
                malformed or hostile trace cannot reach the browser.

Listens on loopback only, and is reached exclusively by site-api, which owns
the identity check. It has no notion of who is calling.
"""

from __future__ import annotations

import json
import os
import re
import resource
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

BASE = Path(__file__).resolve().parent
HARNESS_DIR = BASE / "harness"
JOBS_DIR = Path(os.environ.get("SITE_CC_JOBS", "/var/lib/site-cc/jobs"))
LISTEN = ("127.0.0.1", int(os.environ.get("SITE_CC_PORT", "8081")))

# Which harness wraps which topic. Adding a graph algorithm is one line here;
# arrays and trees arrive as a second harness alongside graph.cpp.
TOPICS = {
    "mst-kruskal": "graph.cpp",
    "mst-prim": "graph.cpp",
}

COMPILER = "/usr/bin/g++"
CFLAGS = [
    "-std=c++20",
    "-O1",
    "-static",          # a static binary lets the run sandbox bind no libraries
    "-s",               # strip; the binary is written to disk for every job
    "-pipe",
    "-Wall",
    "-fmax-errors=12",
    "-fdiagnostics-color=never",
]

COMPILE_TIMEOUT = 25.0      # wall clock
COMPILE_CPU = 20            # RLIMIT_CPU seconds
COMPILE_FSIZE = 48 << 20    # static binaries land around 2-3 MB
RUN_TIMEOUT = 6.0
RUN_CPU = 4
RUN_AS = 256 << 20
RUN_FSIZE = 4 << 20         # also the hard ceiling on how much it can print
NPROC = 96                  # threads count toward this, so leave the server room

MAX_BODY_CHARS = 20_000
MAX_STDOUT = 2 << 20
MAX_DIAGNOSTICS = 24_000
MAX_FRAMES = 2000

EDGE_STATES = {"idle", "candidate", "rejected", "accepted"}
NODE_STATES = {"idle", "frontier", "visited"}

JOB_LOCK = threading.Lock()


# --------------------------------------------------------------------------
# sandbox
# --------------------------------------------------------------------------

# Debian has a merged /usr, so /bin, /lib, /lib64 and /sbin are symlinks into
# it. Recreating them as symlinks rather than binding them keeps the mount list
# to the single read-only /usr that the compiler actually needs.
USR_BINDS = [
    "--ro-bind", "/usr", "/usr",
    "--symlink", "usr/bin", "/bin",
    "--symlink", "usr/lib", "/lib",
    "--symlink", "usr/lib64", "/lib64",
    "--symlink", "usr/sbin", "/sbin",
]

COMMON_BWRAP = [
    "bwrap",
    "--unshare-all",        # net, pid, ipc, uts, cgroup and user namespaces
    "--clearenv",
    "--proc", "/proc",
    "--dev", "/dev",
    "--tmpfs", "/tmp",
    "--die-with-parent",    # the jail cannot outlive this service
    "--new-session",        # denies TIOCSTI terminal injection
]


def rlimits(cpu: int, fsize: int, addr_space: int | None):
    """
    Applied in the child between fork and exec. os.setsid() puts the child in
    its own process group so a timeout can kill everything it spawned, not just
    the process that was waited on.
    """
    def apply() -> None:
        os.setsid()
        resource.setrlimit(resource.RLIMIT_CPU, (cpu, cpu + 2))
        resource.setrlimit(resource.RLIMIT_FSIZE, (fsize, fsize))
        resource.setrlimit(resource.RLIMIT_NPROC, (NPROC, NPROC))
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        if addr_space is not None:
            resource.setrlimit(resource.RLIMIT_AS, (addr_space, addr_space))
    return apply


def spawn(argv: list[str], *, cwd: Path, timeout: float, cpu: int, fsize: int,
          addr_space: int | None, stdin_path: Path | None,
          stdout_path: Path, stderr_path: Path) -> tuple[int, bool]:
    """
    Run one sandboxed command. Output goes to files rather than pipes: reading a
    pipe means either an unbounded read into this process's memory or hand-rolled
    incremental draining, whereas a file plus RLIMIT_FSIZE bounds the volume in
    the kernel and lets the caller read only as much as it wants.

    Returns (exit status, timed out).
    """
    stdin_f = open(stdin_path, "rb") if stdin_path else subprocess.DEVNULL
    try:
        with open(stdout_path, "wb") as out, open(stderr_path, "wb") as err:
            proc = subprocess.Popen(
                argv,
                cwd=str(cwd),
                stdin=stdin_f,
                stdout=out,
                stderr=err,
                preexec_fn=rlimits(cpu, fsize, addr_space),
                close_fds=True,
            )
        try:
            return proc.wait(timeout=timeout), False
        except subprocess.TimeoutExpired:
            # Kill the group, not the process: the compiler driver has children,
            # and a submitted program may have forked before hanging.
            for sig in (signal.SIGKILL,):
                try:
                    os.killpg(proc.pid, sig)
                except ProcessLookupError:
                    pass
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                pass
            return -9, True
    finally:
        if stdin_f not in (subprocess.DEVNULL, None):
            stdin_f.close()


def read_capped(path: Path, limit: int) -> str:
    try:
        with open(path, "rb") as f:
            data = f.read(limit + 1)
    except OSError:
        return ""
    truncated = len(data) > limit
    text = data[:limit].decode("utf-8", "replace")
    if truncated:
        text += "\n... output truncated ...\n"
    return text


# --------------------------------------------------------------------------
# diagnostics
# --------------------------------------------------------------------------

DIAG_RE = re.compile(r"^main\.cpp:(\d+):(\d+):", re.MULTILINE)


def remap_diagnostics(text: str, body_start: int, body_lines: int) -> str:
    """
    The harness contributes lines above the submitted body, so g++ line numbers
    do not match what the editor shows. Rewrite them to be relative to the body,
    and label anything outside it so a harness error is not mistaken for the
    submitter's mistake.
    """
    def fix(m: re.Match[str]) -> str:
        line, col = int(m.group(1)), m.group(2)
        if body_start <= line < body_start + body_lines:
            return f"line {line - body_start + 1}:{col}:"
        return f"harness line {line}:{col}:"

    return DIAG_RE.sub(fix, text)


def friendly(stage: str, status: int, timed_out: bool, diagnostics: str) -> str:
    if timed_out:
        return (f"the {stage} step ran out of time"
                + (" — an infinite loop is the usual cause" if stage == "run" else ""))
    if stage == "run":
        if status == -int(signal.SIGKILL):
            return "the program was killed, most likely for exceeding the memory ceiling"
        if status == -int(signal.SIGXCPU):
            return "the program used more CPU time than it is allowed"
        if status == -int(signal.SIGXFSZ):
            return "the program tried to write more output than it is allowed"
        if status == -int(signal.SIGSEGV):
            return "the program crashed with a segmentation fault"
        if status == 3:
            return "the program emitted too many frames; check the loop terminates"
        if status < 0:
            return f"the program was killed by signal {-status}"
        if status != 0:
            return f"the program exited with status {status}"
    if "expected '}'" in diagnostics or "expected declaration" in diagnostics:
        return "the compile step failed — check the braces balance"
    return f"the {stage} step failed"


# --------------------------------------------------------------------------
# frame validation
# --------------------------------------------------------------------------

def clamp_str(value: object, limit: int) -> str:
    return str(value)[:limit] if value is not None else ""


def clean_frame(obj: object) -> dict | None:
    """
    Rebuild a frame field by field. Nothing from the subprocess is forwarded as
    it arrived: unknown keys are dropped, states must be in the renderer's
    vocabulary, and every collection is bounded. The browser therefore cannot be
    handed a 50 MB `note` or a mark referring to something that was never drawn.
    """
    if not isinstance(obj, dict):
        return None

    marks_in = obj.get("marks") if isinstance(obj.get("marks"), dict) else {}

    edges: dict[str, str] = {}
    for key, val in list((marks_in.get("edges") or {}).items())[:512]:
        if val in EDGE_STATES:
            edges[str(key)[:8]] = val

    nodes: dict[str, str] = {}
    for key, val in list((marks_in.get("nodes") or {}).items())[:128]:
        if val in NODE_STATES:
            nodes[str(key)[:16]] = val

    components: dict[str, int] = {}
    for key, val in list((marks_in.get("components") or {}).items())[:128]:
        if isinstance(val, int) and not isinstance(val, bool):
            components[str(key)[:16]] = val % 64

    metrics: list[dict[str, str]] = []
    raw_metrics = obj.get("metrics")
    if isinstance(raw_metrics, list):
        for m in raw_metrics[:12]:
            if isinstance(m, dict) and "label" in m:
                metrics.append({
                    "label": clamp_str(m.get("label"), 40),
                    "value": clamp_str(m.get("value"), 40),
                })

    return {
        "note": clamp_str(obj.get("note"), 400),
        "phase": clamp_str(obj.get("phase"), 60),
        "detail": clamp_str(obj.get("detail"), 600),
        "marks": {"edges": edges, "nodes": nodes, "components": components},
        "metrics": metrics,
    }


def parse_frames(text: str) -> tuple[list[dict], str | None]:
    frames: list[dict] = []
    for lineno, line in enumerate(text.splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        if len(frames) >= MAX_FRAMES:
            return frames, f"stopped after {MAX_FRAMES} frames"
        try:
            obj = json.loads(line)
        except ValueError:
            # A stray printf is the likely cause, and saying so is more useful
            # than showing the raw line back.
            return frames, (f"line {lineno} of the program's output is not a frame; "
                            f"emit() is the only thing that should write to stdout")
        cleaned = clean_frame(obj)
        if cleaned is None:
            return frames, f"line {lineno} of the program's output is not a frame object"
        frames.append(cleaned)
    return frames, None


# --------------------------------------------------------------------------
# the job
# --------------------------------------------------------------------------

SPLICE_MARKER = "/*@@SPLICE@@*/"


def build_source(topic: str, body: str) -> tuple[str, int, int]:
    """
    Splice the body into its harness. Returns (source, body start line, body line count).

    The marker must occur exactly once. That is checked rather than assumed
    because a marker that also appears in the harness's own prose splices the
    body into a comment, and the resulting diagnostics point everywhere except
    at the actual mistake.
    """
    harness_name = TOPICS[topic]
    template = (HARNESS_DIR / harness_name).read_text(encoding="utf-8")

    found = template.count(SPLICE_MARKER)
    if found != 1:
        raise RuntimeError(f"{harness_name} contains {found} splice markers, expected exactly 1")

    head, _, tail = template.partition(SPLICE_MARKER)
    body_start = head.count("\n") + 1
    source = head + body + tail
    return source, body_start, body.count("\n") + 1


def graph_stdin(n: int, edges: list[list[int]], labels: list[str]) -> str:
    lines = [f"{n} {len(edges)}"]
    lines += [f"{u} {v} {w}" for u, v, w in edges]
    lines.append(" ".join(labels))
    return "\n".join(lines) + "\n"


def run_job(payload: dict) -> dict:
    topic = payload.get("topic")
    body = payload.get("body") or ""
    n = int(payload.get("n") or 0)
    edges = payload.get("edges") or []
    labels = payload.get("labels") or []

    if topic not in TOPICS:
        return {"ok": False, "stage": "request", "message": f"unknown topic {topic!r}"}
    if len(body) > MAX_BODY_CHARS:
        return {"ok": False, "stage": "request", "message": "the submitted body is too long"}

    JOBS_DIR.mkdir(parents=True, exist_ok=True)
    job = Path(tempfile.mkdtemp(prefix="job-", dir=JOBS_DIR))
    timings: dict[str, float] = {}

    try:
        source, body_start, body_lines = build_source(topic, body)
        (job / "main.cpp").write_text(source, encoding="utf-8")
        shutil.copyfile(BASE / "trace.hpp", job / "trace.hpp")
        (job / "graph.txt").write_text(graph_stdin(n, edges, labels), encoding="utf-8")

        # ---- compile ------------------------------------------------------
        t0 = time.monotonic()
        status, timed_out = spawn(
            [*COMMON_BWRAP, *USR_BINDS,
             "--setenv", "PATH", "/usr/bin:/bin",
             "--setenv", "TMPDIR", "/tmp",
             "--bind", str(job), "/work",
             "--chdir", "/work",
             "--", COMPILER, *CFLAGS, "-o", "prog", "main.cpp"],
            cwd=job, timeout=COMPILE_TIMEOUT, cpu=COMPILE_CPU, fsize=COMPILE_FSIZE,
            addr_space=None,   # g++ maps a lot of address space; the cgroup caps real use
            stdin_path=None,
            stdout_path=job / "cc.out", stderr_path=job / "cc.err",
        )
        timings["compile"] = round(time.monotonic() - t0, 3)

        diagnostics = remap_diagnostics(
            read_capped(job / "cc.err", MAX_DIAGNOSTICS), body_start, body_lines
        )

        if status != 0 or not (job / "prog").exists():
            return {
                "ok": False,
                "stage": "compile",
                "message": friendly("compile", status, timed_out, diagnostics),
                "diagnostics": diagnostics,
                "timings": timings,
            }

        # ---- run ----------------------------------------------------------
        t0 = time.monotonic()
        status, timed_out = spawn(
            [*COMMON_BWRAP,
             "--ro-bind", str(job / "prog"), "/prog",
             "--chdir", "/tmp",
             "--", "/prog"],
            cwd=job, timeout=RUN_TIMEOUT, cpu=RUN_CPU, fsize=RUN_FSIZE,
            addr_space=RUN_AS,
            stdin_path=job / "graph.txt",
            stdout_path=job / "run.out", stderr_path=job / "run.err",
        )
        timings["run"] = round(time.monotonic() - t0, 3)

        stdout = read_capped(job / "run.out", MAX_STDOUT)
        stderr = read_capped(job / "run.err", MAX_DIAGNOSTICS)
        frames, parse_note = parse_frames(stdout)

        # A program can fail late, after emitting usable frames. Showing what it
        # managed to produce alongside the error is more useful than discarding it.
        if status != 0 or timed_out:
            return {
                "ok": False,
                "stage": "run",
                "message": friendly("run", status, timed_out, ""),
                "diagnostics": stderr,
                "frames": frames,
                "timings": timings,
            }

        if not frames:
            return {
                "ok": False,
                "stage": "run",
                "message": "the program ran but emitted no frames — call t.emit(...) to draw one",
                "diagnostics": stderr,
                "timings": timings,
            }

        return {
            "ok": True,
            "stage": "done",
            "frames": frames,
            "warnings": diagnostics.strip(),
            "note": parse_note,
            "diagnostics": stderr,
            "timings": timings,
        }

    except Exception as exc:                      # noqa: BLE001 - reported, not swallowed
        return {"ok": False, "stage": "internal", "message": f"{type(exc).__name__}: {exc}"}
    finally:
        shutil.rmtree(job, ignore_errors=True)


# --------------------------------------------------------------------------
# transport
# --------------------------------------------------------------------------

class Handler(BaseHTTPRequestHandler):
    server_version = "site-cc"
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt: str, *args) -> None:
        # journald already timestamps; the default handler duplicates that and
        # writes a line per request for what is a loopback-only service.
        sys.stderr.write("%s\n" % (fmt % args))

    def reply(self, code: int, body: dict) -> None:
        raw = json.dumps(body).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self) -> None:
        if self.path == "/health":
            self.reply(200, {"status": "ok"})
        else:
            self.reply(404, {"detail": "not found"})

    def do_POST(self) -> None:
        if self.path != "/run":
            self.reply(404, {"detail": "not found"})
            return

        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > 256_000:
            self.reply(413, {"ok": False, "stage": "request", "message": "payload size out of range"})
            return

        try:
            payload = json.loads(self.rfile.read(length))
        except ValueError:
            self.reply(400, {"ok": False, "stage": "request", "message": "body is not JSON"})
            return
        if not isinstance(payload, dict):
            self.reply(400, {"ok": False, "stage": "request", "message": "body is not an object"})
            return

        # One job at a time. Refusing immediately is better than queueing: the
        # caller has a request open, and a compile is a second or two.
        if not JOB_LOCK.acquire(timeout=1.0):
            self.reply(503, {"ok": False, "stage": "busy",
                             "message": "another run is in progress; try again in a moment"})
            return
        try:
            self.reply(200, run_job(payload))
        finally:
            JOB_LOCK.release()


def main() -> None:
    JOBS_DIR.mkdir(parents=True, exist_ok=True)
    # Anything left behind by a crash or a restart mid-job.
    for stale in JOBS_DIR.glob("job-*"):
        shutil.rmtree(stale, ignore_errors=True)

    server = ThreadingHTTPServer(LISTEN, Handler)
    server.daemon_threads = True
    print(f"site-cc listening on {LISTEN[0]}:{LISTEN[1]}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
