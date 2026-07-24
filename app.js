(function () {
  "use strict";

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  // Current year in footer
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Theme toggle with persistence
  const root = document.documentElement;
  const stored = localStorage.getItem("theme");
  if (stored) root.setAttribute("data-theme", stored);
  const themeBtn = $("#theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
    });
  }

  // Mobile navigation
  const navToggle = $(".nav-toggle");
  const navList = $("#nav-list");
  if (navToggle && navList) {
    navToggle.addEventListener("click", () => {
      const open = navList.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    navList.addEventListener("click", (e) => {
      if (e.target.tagName === "A") {
        navList.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Render projects from the PROJECTS array (projects.js)
  const grid = $("#projects-grid");
  if (grid) {
    const projects = Array.isArray(window.PROJECTS) ? window.PROJECTS : [];
    if (!projects.length) {
      grid.innerHTML = '<p class="projects-empty">Projects coming soon.</p>';
    } else {
      grid.innerHTML = "";
      projects.forEach((p) => grid.appendChild(buildCard(p)));
    }
  }

  function buildCard(p) {
    const card = document.createElement("article");
    card.className = "project-card reveal";

    const h3 = document.createElement("h3");
    h3.textContent = p.title || "Untitled project";
    card.appendChild(h3);

    if (p.date) {
      const date = document.createElement("p");
      date.className = "project-date";
      date.textContent = p.date;
      card.appendChild(date);
    }

    if (p.desc) {
      const desc = document.createElement("p");
      desc.className = "project-desc";
      desc.textContent = p.desc;
      card.appendChild(desc);
    }

    if (Array.isArray(p.tags) && p.tags.length) {
      const tags = document.createElement("ul");
      tags.className = "project-tags";
      p.tags.forEach((t) => {
        const li = document.createElement("li");
        li.textContent = t;
        tags.appendChild(li);
      });
      card.appendChild(tags);
    }

    if (Array.isArray(p.links) && p.links.length) {
      const links = document.createElement("div");
      links.className = "project-links";
      p.links.forEach((l) => {
        if (!l || !l.href) return;
        const a = document.createElement("a");
        a.href = l.href;
        a.textContent = (l.label || "Link") + " →";
        if (/^https?:/i.test(l.href)) {
          a.target = "_blank";
          a.rel = "noopener";
        }
        links.appendChild(a);
      });
      card.appendChild(links);
    }

    return card;
  }

  // Reveal-on-scroll (progressive enhancement)
  const revealables = $$(".section, .project-card");
  revealables.forEach((el) => el.classList.add("reveal"));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add("is-visible"));
  }
})();
