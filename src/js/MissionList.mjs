import { esc, formatDate, safeUrl, withBase } from "./utils.mjs";
import { statusTone, worldFor } from "./mission.mjs";
import { isSaved } from "./storage.mjs";
import { saveButtonTemplate } from "./saveButton.mjs";

const planet = (world) =>
  `<span class="planet planet-${esc(world)}" aria-hidden="true"></span>`;

/** Launch photo, or planet artwork when there is no (working) photo. */
export function artworkTemplate(mission) {
  const world = worldFor(mission.id);
  const src = safeUrl(mission.imageUrl);
  return src
    ? `<img src="${esc(src)}" alt="Rocket image" loading="lazy" data-world="${world}">`
    : planet(world);
}

/** Swaps a broken <img> for planet artwork. Call once per page root. */
export function watchBrokenImages(root) {
  root.addEventListener(
    "error",
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement) || !img.dataset.world) return;
      img.outerHTML = planet(img.dataset.world);
    },
    true,
  );
}

const detailHref = (id) =>
  `${withBase("mission/")}?id=${encodeURIComponent(id)}`;

// Compact saved records only carry five fields, so the card back is only
// offered when there is something extra to show.
const canFlip = (mission) =>
  Boolean(mission.rocket || mission.provider || mission.pad);

const fact = (term, value) =>
  value ? `<div class="fact"><dt>${term}</dt><dd>${esc(value)}</dd></div>` : "";

/** Works for full missions and for the compact saved records. */
export function missionCardTemplate(mission) {
  const href = detailHref(mission.id);
  const flip = canFlip(mission);
  const front = `
    <div class="card-face card-front">
      <a class="card-art" href="${href}" tabindex="-1" aria-hidden="true">${artworkTemplate(mission)}</a>
      <div class="card-body">
        <h3 class="card-title"><a href="${href}">${esc(mission.name)}</a></h3>
        <div class="card-dates">
          <p class="muted">${esc(formatDate(mission.date))}</p>
          ${mission.location ? `<p class="muted">${esc(mission.location)}</p>` : ""}
          ${mission.rocket ? `<p class="muted">${esc(mission.rocket)}</p>` : ""}
        </div>
        <div class="card-actions">
          <span class="badge badge-${statusTone(mission.status)}">${esc(mission.status)}</span>
          <span class="card-buttons">
            ${flip ? '<button type="button" class="btn btn-ghost flip-btn" data-flip="true">Quick facts<span class="sr-only"> for this mission</span></button>' : ""}
            ${saveButtonTemplate(mission, isSaved(mission.id))}
          </span>
        </div>
      </div>
    </div>`;
  const back = flip
    ? `
    <div class="card-face card-back">
      <div class="card-body">
        <p class="eyebrow">Quick facts</p>
        <h3 class="card-title">${esc(mission.name)}</h3>
        <div class="facts-scroll" tabindex="0" role="group" aria-label="Quick facts for this mission">
          <dl class="facts-mini">
            ${fact("Rocket", mission.rocket)}
            ${fact("Provider", mission.provider)}
            ${fact("Pad", mission.pad)}
            ${fact("Location", mission.location)}
            ${fact("Orbit", mission.orbit)}
            ${fact("Status", mission.status)}
          </dl>
        </div>
        <div class="card-actions">
          <a class="btn" href="${href}">View details</a>
          <span class="card-buttons">
            ${saveButtonTemplate(mission, isSaved(mission.id))}
            <button type="button" class="btn btn-ghost flip-btn" data-flip="false">Back</button>
          </span>
        </div>
      </div>
    </div>`
    : "";

  return `
    <article class="card${flip ? " flip-card" : ""}" data-card-id="${esc(mission.id)}">
      <div class="card-inner">
        ${front}
        ${back}
      </div>
    </article>`;
}

/**
 * The hidden face stays out of the tab order and the accessibility tree.
 * `inert` is the one mechanism that does that without breaking the 3D flip.
 */
function setFaceState(card, flipped) {
  card.classList.toggle("is-flipped", flipped);
  const front = card.querySelector(".card-front");
  const back = card.querySelector(".card-back");
  if (front) front.inert = flipped;
  if (back) back.inert = !flipped;
  const toggle = card.querySelector('.flip-btn[data-flip="true"]');
  if (toggle) toggle.setAttribute("aria-expanded", String(flipped));
}

/** One delegated listener for every Quick facts / Back button in `root`. */
export function bindCardFlips(root) {
  root
    .querySelectorAll(".flip-card")
    .forEach((card) => setFaceState(card, false));
  root.addEventListener("click", (event) => {
    const button = event.target.closest(".flip-btn");
    if (!button || !root.contains(button)) return;
    const card = button.closest(".flip-card");
    if (!card) return;
    const flipped = button.dataset.flip === "true";
    setFaceState(card, flipped);
    // Focus lands on the opposite face's toggle so Enter keeps working.
    card.querySelector(`.flip-btn[data-flip="${!flipped}"]`)?.focus();
  });
}

/** Explains when cached or built-in sample data is on screen. */
export function renderSourceNotice(container, result) {
  container.replaceChildren();
  let message = "";
  // Two very different cases:
  //  - sample mode on purpose (`VITE_USE_SAMPLE`) is a developer setting and
  //    needs no public note; it would only confuse a visitor.
  //  - sample mode because a request failed is a real fallback, so it is
  //    announced together with the error that caused it.
  if (result.source === "sample" && result.error) {
    message = `${result.error.message} Showing the bundled sample launches instead.`;
  } else if (result.source === "stale-cache") {
    const when = formatDate(new Date(result.savedAt).toISOString(), true);
    message = `${result.error?.message ?? "Live data is unavailable."} Showing saved data from ${when}.`;
  }
  if (!message) return;
  const note = document.createElement("p");
  // A deliberate sample build is quiet; a failure that forced a fallback is not.
  note.className = result.error ? "notice" : "notice notice-quiet";
  note.setAttribute("role", "status");
  note.textContent = message;
  container.append(note);
}
