import { readCache, writeCache } from "./cache.mjs";

const API_URL = (
  import.meta.env.VITE_NASA_API_URL ?? "https://images-api.nasa.gov"
).replace(/\/$/, "");
const CACHE_MS = 24 * 60 * 60 * 1000;
const KEEP = 20;

export class NasaImageError extends Error {
  constructor(message) {
    super(message);
    this.name = "NasaImageError";
  }
}

// NASA names files like name~thumb.jpg, name~medium.jpg, name~large.jpg.
// UNVERIFIED: the views fall back to the thumbnail if a larger size fails.
function sized(href, size) {
  return href.replace(/~(thumb|small|medium|large|orig)(?=\.)/, `~${size}`);
}

export function toImage(item) {
  const info = item?.data?.[0] ?? {};
  const links = Array.isArray(item?.links) ? item.links : [];
  const preview = links.find((link) => link.rel === "preview") ?? links[0];
  const thumbUrl = preview?.href ?? "";
  if (!thumbUrl) return null;
  const id = info.nasa_id ?? "";
  return {
    id,
    title: info.title ?? "NASA image",
    description: info.description ?? "",
    center: info.center ?? "NASA",
    dateCreated: info.date_created ?? "",
    thumbUrl,
    mediumUrl: sized(thumbUrl, "medium"),
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
}
