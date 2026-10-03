# Design patterns in C++ — build roadmap

Status: batch 0 shipped 2026-10-03 (objects view, section, Strategy). Next:
batch 1. The frame fields every pattern copies are documented at the top of
`apps/algorithms/topics/pat-strategy.js`; the self-test pattern (compile each
listing, compare its output with the frames' "printed" rows) is in the commit
that added it.

Goal: learn patterns by *seeing* them, classic and modern, in C++. Every
animated pattern answers three questions in this order:

1. **What hurts without it?** Code before the pattern, then a change request
   ("add a new shape"). Every place that has to be edited lights up.
2. **What does the pattern do?** The same change after the pattern: one place
   lights up. A metric shows the count, for example "places edited: 4 → 1".
3. **How does it run?** Objects on screen; calls travel between them as
   messages, one step per frame, with the matching C++ line highlighted.

Reading alongside: *C++ Software Design* by Klaus Iglberger (O'Reilly, 2022)
is the primary book, because it is built on the classic-versus-modern contrast
used here. *Hands-On Design Patterns with C++* by Fedor Pikus goes deeper on
CRTP, policy-based design and type erasure.

## Decisions

- **Lives inside the algorithms app** as a second section, `section: "Design
  patterns"`, not as a new app. The app already supports sections, a
  step-through player built on `core/trace.js` frames, a code panel and the
  auth wall. Nothing about login, routing or nginx changes.
- **One new view per kind of picture**, not one per pattern:
  - `views/objects.js` shows objects, their links (owns, refers to,
    implements) and a message travelling along a link. It covers every
    behavioural and structural pattern.
  - `views/memory.js` shows object layout (vtable pointer or not, inline
    buffer, heap block) and a lifetime timeline (constructed, destroyed, in
    scope). It covers the modern, compile-time patterns, where arrows say
    nothing.
- **Content is written by this account.** The second account is no longer
  usable, see `apps/BACKLOG.md`.
- **C++20, and every listing must compile.** Each pattern's C++ has a `main()`
  whose printed output matches the animation's steps. It is checked on the VM
  with `g++ -std=c++20 -Wall -Wextra` before it ships. That keeps the code
  honest without anyone reading it twice.
- **Not every pattern is animated.** Patterns that amount to "put an interface
  in front of it" get a one-page note: problem, C++, when not to use it.
  Animation is reserved for where it changes understanding.

## Topic file format

Same shape as an algorithm topic, so the catalogue and player need no
special cases:

```js
export const strategy = {
  id: "pat-strategy",
  section: "Design patterns",
  topic: "Behavioural",            // Creational | Structural | Behavioural | Modern C++
  title: "Strategy",
  blurb: "Swap an algorithm at run time without the caller knowing which one it has.",
  structure: OBJECTS,              // which view draws it
  run,                             // generator yielding frames: scene, change-ripple, then call steps
  explanation: [ /* paragraphs */ ],
  analysis: {                      // reused slots, pattern meaning
    time: "Costs: one indirect call per use; one heap object per strategy unless held by value",
    space: "When not to use it: two fixed choices that never change — an if is clearer",
    notes: [ /* trade-offs, relation to other patterns, modern alternative */ ],
  },
  code: { /* before.cpp, after.cpp, modern.cpp where relevant */ },
};
```

Frames for the objects view carry, in `marks`: the objects (id, label, role:
client, interface or concrete), the links, the message in flight
(from, to, label), highlighted objects and the C++ line to highlight. The
pilot fixes the exact fields; later patterns copy the pilot without
re-reading it.

## Batches

Each batch is meant to fit one session.

| Batch | Contents | Why this order |
|---|---|---|
| 0 | `views/objects.js`, the section in `catalog.js`, **Strategy** as the pilot | Smallest pattern that exercises every part of the view |
| 1 | **Observer**, **Command** with undo, **Decorator**, **State** | Most-used behavioural patterns; all reuse the pilot's view as-is |
| 2 | **Composite**, **Visitor** | Visitor's double dispatch is the classic hardest pattern to picture |
| 3 | `views/memory.js`, **RAII and scope guards**, **CRTP versus virtual** | The modern view, with the two simplest layouts |
| 4 | **Type erasure** (how `std::function` works inside), **`std::variant` + `std::visit`** as the modern Visitor, linked back to batch 2 | Payoff batch: the classic-versus-modern contrast |
| 5 | One-page notes, no animation | Fills in the catalogue cheaply |

Batch 5 list:
- **Creational:** Factory Method, Abstract Factory, Builder, Prototype,
  Singleton (and why to avoid it).
- **Structural:** Adapter, Facade, Proxy, Bridge, Flyweight.
- **Behavioural:** Template Method, Iterator, Mediator, Chain of
  Responsibility, Memento.
- **Modern C++:** PIMPL, Non-Virtual Interface, the rule of zero,
  policy-based design, ranges pipelines, concepts as compile-time interfaces.

Any batch 5 note can be promoted to an animated topic later. Chain of
Responsibility and Mediator are the likeliest candidates.

## Deferred

- **Run the C++ live.** The sandbox from the algorithms section could compile
  an edited pattern and stream object-created and call events into the
  objects view. This is the strongest learning loop, but it needs a second
  harness and trace header. Do it after batch 4, once the frame fields are
  stable.
- **Quizzes.** For example "which pattern is this code?" drills fed into
  flashcards.

## Token rules for each session

- Read only the pilot topic and the view's frame fields; never re-read
  finished patterns.
- Write the C++ first, compile it on the VM, then write the frames to match
  its output.
- One deploy and smoke test per batch, then commit.
