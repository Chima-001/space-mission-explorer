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
        <img src="${withBase("images/icon.svg")}" alt="" width="28" height="28">
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

const footerTemplate = () => `
  <p>
    Launch data from
    <a href="https://thespacedevs.com/" target="_blank" rel="noopener">The Space Devs</a>
    (Launch Library 2). Images from the
    <a href="https://images.nasa.gov/" target="_blank" rel="noopener">NASA Image and Video Library</a>.
  </p>
  <p>An educational project, not a real-time mission control tool.</p>`;

function updateSavedCount() {
  document.querySelectorAll("[data-saved-count]").forEach((node) => {
    node.textContent = getSaved().length;
  });
}

/** Injects the shared header and footer. `active` marks the current page. */
export function loadHeaderFooter(active = "") {
  const header = qs("#site-header");
  const footer = qs("#site-footer");
  if (header) header.innerHTML = headerTemplate(active);
  if (footer) footer.innerHTML = footerTemplate();
  updateSavedCount();
  window.addEventListener("sme:saved-changed", updateSavedCount);

  const toggle = qs(".menu-toggle");
  const nav = qs("#site-nav");
  toggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}
