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
    title: "This website (soumitra.dev)",
    date: "2026",
    desc:
      "A hand-built portfolio served from a Google Cloud VM: nginx, a Let's Encrypt TLS certificate, and static HTML/CSS/JS — no framework, no build step.",
    tags: ["HTML", "CSS", "JavaScript", "nginx", "GCP"],
    links: [{ label: "Live", href: "https://soumitra.dev" }],
  },
  {
    title: "Project title goes here",
    date: "2026",
    desc:
      "Replace this placeholder with a short description of a project. Delete this whole block once you add real ones.",
    tags: ["C++", "example"],
    links: [],
  },
  {
    title: "Another example",
    date: "2026",
    desc:
      "Duplicate a block like this for each new project you upload. Add links for source code or a write-up.",
    tags: ["Python"],
    links: [{ label: "Source", href: "#" }],
  },
];
