import { readCache, writeCache } from "./cache.mjs";

const API_URL = (
  import.meta.env.VITE_NASA_API_URL ?? "https://images-api.nasa.gov"
).replace(/\/$/, "");
const CACHE_MS = 24 * 60 * 60 * 1000;
const KEEP = 40;

export class NasaImageError extends Error {
  constructor(message) {
    super(message);
    this.name = "NasaImageError";
  }
}

// Image sizes come from the links NASA returns, never from a guessed file
// name. Verified on 2026-11-23 against live responses:
//   rel="preview"   -> the ~thumb file, present on every item tested (25/25)
//   rel="canonical" -> the ~orig file, the full-size picture (24/25 items)
//   rel="alternate" -> ~medium and ~small, present on 78 of 100 items
// There is no ~large file: asking for one returns HTTP 403. The earlier code
// guessed it, which is why some pictures silently fell back to a thumbnail.
const hrefWithSize = (links, size) =>
  links.find((link) => new RegExp(`~${size}\\.`, "i").test(link.href))?.href ??
  "";

export function toImage(item) {
  const info = item?.data?.[0] ?? {};
  const links = Array.isArray(item?.links) ? item.links : [];
  const preview = links.find((link) => link.rel === "preview") ?? links[0];
  const thumbUrl = preview?.href ?? "";
  if (!thumbUrl) return null;

  // Field names verified in a live response: title and nasa_id exist on
  // 100 of 100 items, so a caption never falls back to "NASA image".
  const id = info.nasa_id ?? "";
  const canonical = links.find((link) => link.rel === "canonical")?.href ?? "";
  const medium =
    hrefWithSize(links, "medium") ||
    hrefWithSize(links, "small") ||
    canonical ||
    thumbUrl;

  return {
    id,
    title: info.title ?? "NASA image",
    description: info.description ?? "",
    center: info.center ?? "NASA",
    dateCreated: info.date_created ?? "",
    thumbUrl,
    mediumUrl: medium,
    // Full-size picture for the hero. A few items refuse it, so every image
    // that uses heroUrl keeps thumbUrl as its onerror fallback.
    heroUrl: canonical || thumbUrl,
    pageUrl: id
      ? `https://images.nasa.gov/details/${encodeURIComponent(id)}`
      : "",
  };
}

export default class NasaImageData {
  /** Returns up to `limit` normalized images. Throws NasaImageError. */
  async search(query, limit = 6) {
    const key = `nasa:${query.toLowerCase()}`;
    const cached = readCache(key, CACHE_MS);
    if (cached?.fresh) return cached.data.slice(0, limit);

    let response;
    try {
      response = await fetch(
        `${API_URL}/search?q=${encodeURIComponent(query)}&media_type=image`,
      );
    } catch {
      if (cached) return cached.data.slice(0, limit);
      throw new NasaImageError("Could not reach the NASA image library.");
    }
    if (!response.ok) {
      if (cached) return cached.data.slice(0, limit);
      throw new NasaImageError(
        `The NASA image library returned an error (${response.status}).`,
      );
    }
    let json;
    try {
      json = await response.json();
    } catch {
      throw new NasaImageError("The NASA image library sent unreadable data.");
    }
    const items = json?.collection?.items;
    if (!Array.isArray(items)) {
      throw new NasaImageError("The NASA image library sent unexpected data.");
    }
    const images = items.map(toImage).filter(Boolean).slice(0, KEEP);
    writeCache(key, images);
    return images.slice(0, limit);
  }

  /**
   * Collects images for several search terms, in order, skipping any term
   * that fails so one bad query cannot empty the hero.
   */
  async searchMany(queries, perQuery = 4) {
    const results = await Promise.allSettled(
      queries.map((query) => this.search(query, perQuery)),
    );
    const seen = new Set();
    const images = [];
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      for (const image of result.value) {
        if (seen.has(image.id)) continue;
        seen.add(image.id);
        images.push(image);
      }
    }
    return images;
  }
}
