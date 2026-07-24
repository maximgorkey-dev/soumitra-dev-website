# soumitra.dev

Personal portfolio site. Plain HTML/CSS/JS — no framework, no build step.
Served by nginx from a Google Cloud VM at `/var/www/portfolio`, over HTTPS
(Let's Encrypt).

## Files

| File          | Purpose                                              |
| ------------- | ---------------------------------------------------- |
| `index.html`  | Page structure and all section content              |
| `styles.css`  | Styling and light/dark theme                        |
| `app.js`      | Theme toggle, mobile nav, project rendering, reveals |
| `projects.js` | **Your project data** — edit this to add projects    |

## Adding a project

Open `projects.js` and add an entry to the `PROJECTS` array:

```js
{
  title: "My new project",
  date: "2026",
  desc: "One or two sentences about what it does.",
  tags: ["C++", "CMake"],
  links: [
    { label: "Source", href: "https://github.com/you/repo" },
    { label: "Live", href: "https://example.com" }
  ]
}
```

Save the file and refresh the browser — the Projects grid updates
automatically. `title` is required; everything else is optional.

## Editing / deploying

The VM copy at `/var/www/portfolio` is the source of truth. Edit the files
directly via Cursor's Remote-SSH connection and just save — nginx serves the
changes instantly (do a hard refresh, `Ctrl+F5`, if the browser caches).

## Version control

This folder is a git repository. After making changes:

```bash
git add -A
git commit -m "Describe your change"
```
