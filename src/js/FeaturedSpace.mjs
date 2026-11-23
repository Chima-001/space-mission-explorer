import NasaImageData from "./NasaImageData.mjs";
import { esc, formatDate, renderState, safeUrl } from "./utils.mjs";
import { plainText } from "./text.mjs";

// A handful of broad topics, searched once and cached for a day.
const TOPICS = [
  "nebula",
  "galaxy",
  "saturn",
  "mars",
  "jupiter",
  "moon",
  "hubble",
];
const PER_TOPIC = 2;
const INTERVAL = 9000;

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * "Today's NASA image": a featured picture that cycles through several NASA
 * images, crossfading exactly like the hero while the caption panel swaps its
 * details. Autoplay stops for reduced-motion users, pauses on hover or focus,
 * and stops while the tab is hidden.
 */
export default class FeaturedSpace {
  constructor(parent) {
    this.parent = parent;
    this.data = new NasaImageData();
    this.images = [];
    this.index = 0;
    this.timer = null;
    this.paused = false;
  }

  async init() {
    renderState(this.parent, {
      type: "loading",
      message: "Loading today's NASA image…",
    });
    try {
      const day = Math.floor(Date.now() / 86400000);
      // Start from a different topic each day so the page feels alive.
      const rotated = [
        ...TOPICS.slice(day % TOPICS.length),
        ...TOPICS.slice(0, day % TOPICS.length),
      ];
      const images = await this.data.searchMany(rotated.slice(0, 4), PER_TOPIC);
      // Prefer one picture per topic so the rotation is visibly different.
      const byId = new Map(images.map((image) => [image.id, image]));
      this.images = [...byId.values()].slice(0, 6);
      if (!this.images.length) {
        renderState(this.parent, {
          type: "empty",
          message: "No featured NASA image is available today.",
        });
        return;
      }
      this.render();
      this.show(0);
      this.start();
    } catch (error) {
      renderState(this.parent, {
        type: "error",
        message: error.message,
        onRetry: () => this.init(),
      });
    }
  }

  render() {
    const slides = this.images
      .map(
        (image, i) => `
        <img class="featured-slide${i === 0 ? " current" : ""}"
             src="${esc(safeUrl(image.mediumUrl))}"
             alt="${esc(plainText(image.title, 100))}"
             data-thumb="${esc(safeUrl(image.thumbUrl))}"
             ${i === 0 ? "" : 'loading="lazy"'} decoding="async">`,
      )
      .join("");

    const dots = this.images
      .map(
        (image, i) => `
        <button type="button" class="featured-dot${i === 0 ? " current" : ""}" data-slide="${i}"
                aria-label="Show featured image ${i + 1} of ${this.images.length}"
                ${i === 0 ? 'aria-current="true"' : ""}><span aria-hidden="true"></span></button>`,
      )
      .join("");

    this.parent.innerHTML = `
      <figure class="featured-card">
        <div class="featured-media">
          ${slides}
          <div class="featured-controls">
            <button type="button" class="featured-arrow" data-step="-1" aria-label="Previous featured image">&#8249;</button>
            <div class="featured-dots">${dots}</div>
            <button type="button" class="featured-arrow" data-step="1" aria-label="Next featured image">&#8250;</button>
          </div>
        </div>
        <figcaption id="featured-caption" aria-live="polite"></figcaption>
      </figure>`;

    // Swap to the thumbnail if a medium file is unavailable.
    this.parent.querySelectorAll(".featured-slide").forEach((img) => {
      img.addEventListener(
        "error",
        () => {
          const thumb = img.dataset.thumb;
          if (thumb && img.src !== thumb) img.src = thumb;
        },
        { once: true },
      );
    });

    this.parent.addEventListener("click", (event) => {
      const step = event.target.closest("[data-step]");
      const dot = event.target.closest("[data-slide]");
      if (step) this.go(this.index + Number(step.dataset.step));
      if (dot) this.go(Number(dot.dataset.slide));
    });
    this.parent.addEventListener("mouseenter", () => this.pause());
    this.parent.addEventListener("mouseleave", () => this.resume());
    this.parent.addEventListener("focusin", () => this.pause());
    this.parent.addEventListener("focusout", () => this.resume());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.pause();
      else this.resume();
    });
  }

  show(next) {
    const count = this.images.length;
    if (!count) return;
    this.index = ((next % count) + count) % count;
    const image = this.images[this.index];

    this.parent.querySelectorAll(".featured-slide").forEach((img, i) => {
      img.classList.toggle("current", i === this.index);
    });
    this.parent.querySelectorAll(".featured-dot").forEach((dot, i) => {
      const on = i === this.index;
      dot.classList.toggle("current", on);
      if (on) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });

    const caption = this.parent.querySelector("#featured-caption");
    if (!caption) return;
    const page = safeUrl(image.pageUrl);
    const title = plainText(image.title, 90);
    const body = plainText(image.description, 300);
    // The description often opens with the title, so drop that repeat.
    const description = body.toLowerCase().startsWith(title.toLowerCase())
      ? plainText(body.slice(title.length).replace(/^[\s.,:;-]+/, ""), 300)
      : body;

    caption.innerHTML = `
      <p class="eyebrow">Featured NASA image &middot; ${esc(image.center)}</p>
      <h2>${esc(title)}</h2>
      ${description ? `<p class="muted">${esc(description)}</p>` : ""}
      <p class="muted">${esc(formatDate(image.dateCreated))}</p>
      ${page ? `<a href="${esc(page)}" target="_blank" rel="noopener">View source on NASA</a>` : ""}`;
  }

  go(next) {
    this.show(next);
    this.restart();
  }

  start() {
    if (reducedMotion() || this.images.length < 2) return;
    this.stop();
    this.timer = setInterval(() => {
      if (!this.paused) this.show(this.index + 1);
    }, INTERVAL);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  restart() {
    if (this.timer) this.start();
  }
}
