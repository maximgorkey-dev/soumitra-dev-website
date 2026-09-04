/*
 * Your projects live here.
 *
 * To add a new project, copy one { ... } block below, fill in the fields,
 * and save. The site rebuilds the Projects grid automatically — no build
 * step needed. Newest-first ordering is up to you (top of the array shows
 * first). Any field except "title" can be omitted.
 *
 *   title  : project name (required)
 *   date   : short label shown under the title, e.g. "2026" or "Jul 2026"
 *   desc   : one or two sentences describing it
 *   tags   : array of short tech/topic tags
 *   links  : array of { label, href } — e.g. live demo, source, write-up
 */
const PROJECTS = [
  {
    title: "Interactive EDA flow",
    date: "2026",
    desc:
      "A digital place-and-route demonstrator that runs entirely in the browser. Build a gate-level netlist, size a floorplan, then watch an analytic global placer trade wirelength against density and an Abacus legaliser snap the result onto the row and site grid. The algorithms are real, just small.",
    tags: ["Physical Design", "Placement", "JavaScript", "Canvas", "Web Workers"],
    links: [
      { label: "Open the demo", href: "/eda/" },
      { label: "Read the primer", href: "/eda/guide/" },
    ],
  },
  {
    title: "This website (soumitra.dev)",
    date: "2026",
    desc:
      "A hand-built portfolio served from a Google Cloud VM: nginx, a Let's Encrypt TLS certificate, and static HTML/CSS/JS — no framework, no build step.",
    tags: ["HTML", "CSS", "JavaScript", "nginx", "GCP"],
    links: [{ label: "Live", href: "https://soumitra.dev" }],
  },
];
