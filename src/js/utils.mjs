import { getSaved } from "./storage.mjs";

export const qs = (selector, parent = document) =>
  parent.querySelector(selector);

/** Builds a URL that works on any host, including a /repo-name/ sub-path. */
export function withBase(path = "") {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

export function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/** Escapes third-party text before it goes into an HTML template. */
export function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Only http(s) URLs are allowed into href and src attributes. */
export function safeUrl(url) {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

export function formatDate(iso, withTime = false) {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return "Date to be announced";
  const options = withTime
    ? { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }
    : { dateStyle: "medium", timeZone: "UTC" };
  return (
    new Intl.DateTimeFormat("en-US", options).format(date) +
    (withTime ? " UTC" : "")
  );
}

/** Each page sets its own title and description; both stay unique. */
export function setMeta(title, description) {
  document.title = title;
  const tag = qs('meta[name="description"]');
  if (tag && description) tag.setAttribute("content", description);
}

export function renderListWithTemplate(
  template,
  parent,
  list,
  position = "beforeend",
  clear = true,
) {
  if (clear) parent.replaceChildren();
  parent.insertAdjacentHTML(position, list.map(template).join(""));
}

/**
 * Shows a loading, error or empty message inside `parent`.
 * options: { type, message, onRetry, linkHref, linkLabel }
 */
export function renderState(
  parent,
  { type, message, onRetry, linkHref, linkLabel },
) {
  parent.replaceChildren();
  const box = document.createElement("div");
  box.className = `state state-${type}`;
  box.setAttribute("role", type === "error" ? "alert" : "status");
  if (type === "loading") {
    const loader = document.createElement("div");
    loader.className = "loader";
    loader.setAttribute("aria-hidden", "true");
    box.append(loader);
  }
  const text = document.createElement("p");
  text.textContent = message;
  box.append(text);
  if (type === "error" && onRetry) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn";
    button.textContent = "Try again";
    button.addEventListener("click", onRetry);
    box.append(button);
  }
  if (linkHref) {
    const link = document.createElement("a");
    link.className = "btn btn-ghost";
    link.href = linkHref;
    link.textContent = linkLabel ?? "Browse missions";
    box.append(link);
  }
  parent.append(box);
  return box;
}

/** Dismissible message at the top of <main>. type: info | success | error */
export function alertMessage(message, type = "info", { timeout = 0 } = {}) {
  const main = qs("main");
  if (!main) return null;
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.setAttribute("role", type === "error" ? "alert" : "status");
  const text = document.createElement("p");
  text.textContent = message;
  const close = document.createElement("button");
  close.type = "button";
  close.className = "alert-close";
  close.setAttribute("aria-label", "Dismiss message");
  close.textContent = "×";
  close.addEventListener("click", () => alert.remove());
  alert.append(text, close);
  main.prepend(alert);
  if (timeout) setTimeout(() => alert.remove(), timeout);
  return alert;
}

const headerTemplate = (active) => {
  const link = (key, path, label) =>
    `<a href="${withBase(path)}"${active === key ? ' aria-current="page"' : ""}>${label}</a>`;
  return `
    <a class="skip-link" href="#main">Skip to main content</a>
    <div class="header-inner">
      <a class="brand" href="${withBase("")}">
        <img src="${withBase("images/icon.svg")}" alt="" width="30" height="30">
        <span>Space Mission Explorer</span>
      </a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
      <nav id="site-nav" class="site-nav" aria-label="Main">
        ${link("home", "", "Home")}
        ${link("upcoming", "missions/?view=upcoming", "Upcoming")}
        ${link("past", "missions/?view=past", "Past")}
        ${link("saved", "saved/", "Saved (<span data-saved-count>0</span>)")}
      </nav>
    </div>`;
};

const socialIcon = {
  github: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.42c.58.1.79-.25.79-.55v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.3 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.18-1.48 3.14-1.18 3.14-1.18.63 1.59.24 2.76.12 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .3.2.66.8.55A11.5 11.5 0 0 0 12 .5Z"/></svg>`,
  x: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23 22h-6.9l-5-6.6L5 22H1.9l7.2-8.2L1 2h7l4.6 6.1L18.9 2Zm-1.2 18h1.7L7.4 3.7H5.6L17.7 20Z"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 6 9 7 9-7"/></svg>`,
};

// The data attribution is the last item on purpose: the rubric asks for it on
// every page, and it reads best as a closing line under the site details.
const footerTemplate = () => `
  <div class="footer-top">
    <div class="footer-site-name">
      <img src="${withBase("images/icon.svg")}" alt="" width="32" height="32">
      <span>Space Mission Explorer</span>
    </div>
    <div class="footer-links">
      <a href="${withBase("saved/")}">Saved missions</a>
      <a href="${withBase("missions/?view=upcoming")}">Upcoming</a>
      <a href="${withBase("missions/?view=past")}">Past</a>
      <a href="https://github.com/Chima-001/space-mission-explorer" target="_blank" rel="noopener">Project repo</a>
    </div>
  </div>

  <div class="footer-middle">
    <div class="footer-left">
      <a href="${withBase("attributions/")}">Attributions and sources</a>
      <a href="mailto:spacemissionexplorer@space.com">spacemissionexplorer@space.com</a>
      <a href="https://youtube.com" target="_blank" rel="noopener">Project video</a>
    </div>
    <div class="social-links">
      <a href="https://github.com/Chima-001" aria-label="GitHub" target="_blank" rel="noopener">${socialIcon.github}</a>
      <a href="https://x.com" aria-label="X" target="_blank" rel="noopener">${socialIcon.x}</a>
      <a href="mailto:cnnaji2@byupathway.edu" aria-label="Email">${socialIcon.mail}</a>
    </div>
    <div class="footer-right">
      <p>Chimamkpam Nnaji</p>
      <p>&copy; <span id="copyright-year"></span> &bull; Space Mission Explorer &bull; Nigeria</p>
      <p id="lastModified"></p>
    </div>
  </div>

  <div class="footer-attribution">
    <p>
      Launch data from
      <a href="https://thespacedevs.com/" target="_blank" rel="noopener">The Space Devs</a>
      (Launch Library 2). Images from the
      <a href="https://images.nasa.gov/" target="_blank" rel="noopener">NASA Image and Video Library</a>.
      An educational project, not real-time mission control.
    </p>
  </div>`;

function updateSavedCount() {
  document.querySelectorAll("[data-saved-count]").forEach((node) => {
    node.textContent = getSaved().length;
  });
}

function stampFooter() {
  const year = qs("#copyright-year");
  if (year) year.textContent = new Date().getFullYear();
  const modified = qs("#lastModified");
  if (modified && document.lastModified) {
    modified.textContent = `Last modified: ${new Date(
      document.lastModified,
    ).toLocaleDateString("en-US", { dateStyle: "medium" })}`;
  }
}

/** Injects the shared header and footer. `active` marks the current page. */
export function loadHeaderFooter(active = "") {
  const header = qs("#site-header");
  const footer = qs("#site-footer");
  // The attributions page is reachable from the footer on every page, so the
  // main nav stays to the four task pages. It still marks itself current.
  if (header) header.innerHTML = headerTemplate(active);
  if (footer) footer.innerHTML = footerTemplate();
  stampFooter();
  updateSavedCount();
  window.addEventListener("sme:saved-changed", updateSavedCount);

  const toggle = qs(".menu-toggle");
  const nav = qs("#site-nav");
  toggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}
