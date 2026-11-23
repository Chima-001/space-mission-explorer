import { esc, formatDate, safeUrl } from "./utils.mjs";
import { statusTone } from "./mission.mjs";
import { isSaved } from "./storage.mjs";
import { saveButtonTemplate } from "./saveButton.mjs";
import { artworkTemplate } from "./MissionList.mjs";
import { plainText } from "./text.mjs";

/** "Vulcan VC6L" -> "Vulcan rocket". Returns "" when the rocket is unknown. */
export function rocketQuery(rocket) {
  if (!rocket || rocket.startsWith("Unknown")) return "";
  return `${rocket.split(" ")[0]} rocket`;
}

const row = (term, value) => `<dt>${term}</dt><dd>${esc(value)}</dd>`;

export function missionDetailsTemplate(m) {
  const upcoming = m.date && new Date(m.date).getTime() > Date.now();
  const agencyLink = safeUrl(m.sourceUrl);
  return `
    <article class="detail">
      <div class="detail-hero">
        <div class="detail-art">${artworkTemplate(m)}</div>
        <div class="detail-head">
          <h1 id="page-title" tabindex="-1">${esc(m.name)}</h1>
          <p class="badges">
            <span class="badge badge-${statusTone(m.status)}">${esc(m.status)}</span>
            ${m.webcast ? '<span class="badge badge-ok">Webcast live</span>' : ""}
          </p>
          <p class="muted">${esc(formatDate(m.date, true))}</p>
          ${upcoming ? '<p class="countdown" id="countdown" role="timer" aria-label="Time until launch"></p>' : ""}
          ${m.failReason ? `<p class="fail-reason"><strong>Reason:</strong> ${esc(m.failReason)}</p>` : ""}
          <div class="detail-actions">${saveButtonTemplate(m, isSaved(m.id), true)}</div>
        </div>
      </div>
      <div class="detail-columns">
        <section aria-labelledby="desc-title">
          <h2 id="desc-title">Description</h2>
          <p class="description">${esc(m.description)}</p>
          <h2 id="related-title">Related NASA images</h2>
          <div id="related"></div>
        </section>
        <section aria-labelledby="facts-title">
          <h2 id="facts-title">Details</h2>
          <dl class="facts">
            ${row("Rocket", m.rocket)}${row("Launch pad", m.pad)}${row("Location", m.location)}
            ${row("Provider", m.provider)}${row("Mission type", m.missionType)}${row("Orbit", m.orbit)}
          </dl>
          <h2>Sources</h2>
          <ul class="sources">
            <li><a href="https://thespacedevs.com/" target="_blank" rel="noopener">The Space Devs: Launch Library 2</a></li>
            <li><a href="https://images.nasa.gov/" target="_blank" rel="noopener">NASA Image and Video Library</a></li>
            ${agencyLink ? `<li><a href="${esc(agencyLink)}" target="_blank" rel="noopener">Mission information</a></li>` : ""}
          </ul>
        </section>
      </div>
    </article>`;
}

export function relatedImagesTemplate(images) {
  return `<ul class="thumbs">${images
    .map((image) => {
      const page = safeUrl(image.pageUrl);
      const picture = `<img src="${esc(safeUrl(image.thumbUrl))}" alt="${esc(plainText(image.title, 100))}" loading="lazy">`;
      return `<li><figure>
        ${page ? `<a href="${esc(page)}" target="_blank" rel="noopener">${picture}</a>` : picture}
        <figcaption>${esc(plainText(image.title, 60))} <span class="muted">NASA ${esc(image.center)}</span></figcaption>
      </figure></li>`;
    })
    .join("")}</ul>`;
}
