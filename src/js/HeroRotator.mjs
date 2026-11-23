import NasaImageData from "./NasaImageData.mjs";
import { esc, safeUrl, withBase } from "./utils.mjs";
import { plainText } from "./text.mjs";

// Four broad topics give a varied set of cosmic photos without spending many
// requests. NASA images are cached for a day, so a repeat visit is free.
const TOPICS = ["nebula", "galaxy", "planet", "aurora"];
const PER_TOPIC = 3;
const MAX_SLIDES = 8;
const INTERVAL = 7000;

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Hero background: a stack of NASA images that crossfade on a timer, with a
 * caption per slide and prev/next/dot controls. Every control is a real
 * button, and autoplay stops for reduced-motion users or while the tab is
 * hidden. If NASA is unreachable the hero keeps its CSS starfield.
 */
export default class HeroRotator {
  constructor(root) {
    this.root = root;
    this.images = [];
    this.index = 0;
    this.timer = null;
    this.paused = false;
  }

  async init() {
    this.root.classList.add("hero-loading");
    try {
      const images = await new NasaImageData().searchMany(TOPICS, PER_TOPIC);
      if (!images.length) throw new Error("empty");
      this.images = images.slice(0, MAX_SLIDES);
      this.render();
    } catch {
      // No photos is a valid state: the starfield and headline still stand.
      this.root.classList.remove("hero-loading");
      this.root.classList.add("hero-fallback");
      this.mountCaption();
    }
  }

  render() {
    this.root.classList.remove("hero-loading");
    const slides = this.images
      .map(
        (image, i) => `
        <img class="hero-slide${i === 0 ? " current" : ""}"
             src="${esc(safeUrl(image.heroUrl) || safeUrl(image.thumbUrl))}"
             alt="${esc(plainText(image.title, 110))}"
             data-thumb="${esc(safeUrl(image.thumbUrl))}"
             ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}
             decoding="async">`,
      )
      .join("");

    const dots = this.images
      .map(
        (image, i) => `
        <button type="button" class="hero-dot${i === 0 ? " current" : ""}"
                data-slide="${i}" aria-label="Show image ${i + 1} of ${this.images.length}"
                ${i === 0 ? 'aria-current="true"' : ""}><span aria-hidden="true"></span></button>`,
      )
      .join("");

    this.root.insertAdjacentHTML(
      "afterbegin",
      `<div class="hero-media" aria-hidden="true">${slides}</div>
       <div class="hero-shade" aria-hidden="true"></div>
       <div class="hero-controls">
         <button type="button" class="hero-arrow" data-step="-1" aria-label="Previous image">&#8249;</button>
         <div class="hero-dots">${dots}</div>
         <button type="button" class="hero-arrow" data-step="1" aria-label="Next image">&#8250;</button>
       </div>`,
    );
    this.mountCaption();
    const browse = this.root.querySelector("#browse-link");
    if (browse) browse.href = withBase("missions/?view=upcoming");
    const past = this.root.querySelector("#past-link");
    if (past) past.href = withBase("missions/?view=past");

    // Some items refuse the full-size file, so fall back to the thumbnail.
    this.root.querySelectorAll(".hero-slide").forEach((img) => {
      img.addEventListener(
        "error",
        () => {
          const thumb = img.dataset.thumb;
          if (thumb && img.src !== thumb) img.src = thumb;
        },
        { once: true },
      );
    });

    this.root.addEventListener("click", (event) => {
      const step = event.target.closest("[data-step]");
      const dot = event.target.closest("[data-slide]");
      if (step) this.go(this.index + Number(step.dataset.step));
      if (dot) this.go(Number(dot.dataset.slide));
    });

    // Autoplay pauses while the pointer or keyboard focus is inside the hero.
    this.root.addEventListener("mouseenter", () => this.pause());
    this.root.addEventListener("mouseleave", () => this.resume());
    this.root.addEventListener("focusin", () => this.pause());
    this.root.addEventListener("focusout", () => this.resume());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.pause();
      else this.resume();
    });

    this.show(0);
    this.start();
  }

  mountCaption() {
    const slot = this.root.querySelector(".hero-copy");
    if (!slot) return;
    slot.innerHTML = `
      <p class="eyebrow">Launches, missions and NASA images</p>
      <h1 id="hero-title" class="grad">Explore every launch in one place</h1>
      <p class="hero-lead">Follow upcoming rockets, revisit past missions and save the ones you care about.</p>
      <p class="hero-actions">
        <a id="browse-link" class="btn" href="#">Browse upcoming</a>
        <a id="past-link" class="btn btn-ghost" href="#">Past missions</a>
        <a class="btn btn-ghost" href="#featured">Today's NASA image</a>
      </p>
      <p class="hero-credit" data-hero-credit></p>`;
    this.credit = slot.querySelector("[data-hero-credit]");
  }

  show(next) {
    if (!this.images.length) return;
    const count = this.images.length;
    this.index = ((next % count) + count) % count;
    const image = this.images[this.index];

    this.root.querySelectorAll(".hero-slide").forEach((img, i) => {
      img.classList.toggle("current", i === this.index);
    });
    this.root.querySelectorAll(".hero-dot").forEach((dot, i) => {
      const on = i === this.index;
      dot.classList.toggle("current", on);
      if (on) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });

    if (this.credit) {
      const page = safeUrl(image.pageUrl);
      this.credit.replaceChildren();
      const label = `NASA ${image.center} \u00b7 ${plainText(image.title, 80)}`;
      if (page) {
        const link = document.createElement("a");
        link.href = page;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = label;
        this.credit.append("Image: ", link);
      } else {
        this.credit.textContent = `Image: ${label}`;
      }
    }
  }

  go(next) {
    this.show(next);
    this.restart(); // a manual step resets the clock
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
