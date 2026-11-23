import { toMission } from "./mission.mjs";
import { readCache, writeCache } from "./cache.mjs";

const API_URL = (
  import.meta.env.VITE_LAUNCH_API_URL ?? "https://ll.thespacedevs.com/2.2.0"
).replace(/\/$/, "");
const USE_SAMPLE = import.meta.env.VITE_USE_SAMPLE === "true";
// Launch dates and statuses change during the day, so a page is refreshed
// after 10 minutes: a new visit or a refresh picks up changes, while normal
// browsing stays within the 15 requests per hour limit.
const CACHE_MS = 10 * 60 * 1000;

// One request loads up to 100 launches. 100 is the API's ceiling: its own
// documentation answers ?limit=150 with a "next" link of limit=100, so a
// bigger number is silently capped. More launches are fetched with ?offset=,
// so "Load more" can reach every launch the API holds, not a fixed slice.
const PAGE_SIZE = 100;

// The query-string value, the API path and the sample file all use a
// different word for the same list. Keeping them in one place prevents the
// "Unknown launch list" bug where ?view=past reached the data layer.
export const VIEWS = {
  upcoming: { api: "upcoming", file: "upcoming", label: "Upcoming" },
  past: { api: "previous", file: "previous", label: "Past" },
};

const ID_PATTERN = /^[\w-]{1,64}$/;

export class LaunchDataError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "LaunchDataError";
    this.code = code; // "rate-limit" | "server" | "network" | "invalid"
  }
}

async function request(url) {
  try {
    return await fetch(url);
  } catch {
    throw new LaunchDataError(
      "network",
      "Could not reach the launch data service. Check your connection.",
    );
  }
}

async function readJson(response) {
  if (response.status === 429) {
    throw new LaunchDataError(
      "rate-limit",
      "The launch data service has reached its hourly request limit.",
    );
  }
  if (!response.ok) {
    throw new LaunchDataError(
      "server",
      `The launch data service returned an error (${response.status}).`,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new LaunchDataError(
      "invalid",
      "The launch data service sent a response that could not be read.",
    );
  }
}

function resolveView(view) {
  const meta = VIEWS[view];
  if (!meta) {
    throw new LaunchDataError("invalid", "Unknown launch list.");
  }
  return meta;
}

/** Reads one page of launches. `total` is how many exist on the server. */
async function fetchPage(meta, offset = 0) {
  const query = `limit=${PAGE_SIZE}${offset ? `&offset=${offset}` : ""}`;
  const json = await readJson(
    await request(`${API_URL}/launch/${meta.api}/?${query}`),
  );
  if (!Array.isArray(json?.results)) {
    throw new LaunchDataError(
      "invalid",
      "The launch data service sent an unexpected response.",
    );
  }
  const count = Number(json.count);
  return {
    missions: json.results.map(toMission),
    total: Number.isFinite(count) && count > 0 ? count : null,
  };
}

async function fetchSample(meta) {
  const json = await readJson(
    await request(`${import.meta.env.BASE_URL}data/sample-${meta.file}.json`),
  );
  if (!Array.isArray(json?.results)) {
    throw new LaunchDataError(
      "invalid",
      "The sample launch data could not be read.",
    );
  }
  const missions = json.results.map(toMission);
  // A sample file is a fixed snapshot, so its own length is the total.
  return { missions, total: missions.length, source: "sample" };
}

/** Cache holds { missions, total }. Older entries held a bare array. */
function cacheList(payload) {
  if (Array.isArray(payload)) return { missions: payload, total: null };
  return {
    missions: Array.isArray(payload?.missions) ? payload.missions : [],
    total: Number.isFinite(payload?.total) ? payload.total : null,
  };
}

function findCached(id) {
  for (const meta of Object.values(VIEWS)) {
    const cached = readCache(`launches:${meta.api}`, Infinity);
    if (!cached) continue;
    const hit = cacheList(cached.data).missions.find(
      (mission) => mission.id === id,
    );
    if (hit) return hit;
  }
  return null;
}

async function findInSamples(id) {
  for (const meta of Object.values(VIEWS)) {
    try {
      const { missions } = await fetchSample(meta);
      const hit = missions.find((mission) => mission.id === id);
      if (hit) return hit;
    } catch {
      // Sample file missing or unreadable: keep looking.
    }
  }
  return null;
}

const uniqueById = (missions) => {
  const seen = new Set();
  return missions.filter((mission) => {
    if (seen.has(mission.id)) return false;
    seen.add(mission.id);
    return true;
  });
};

export default class LaunchData {
  /**
   * First page of a list.
   * Returns { missions, total, source, savedAt?, error? }.
   * source: "network" | "cache" | "stale-cache" | "sample".
   * `total` is how many launches exist on the server, for "Load more".
   */
  async getMissions(view) {
    const meta = resolveView(view);
    if (USE_SAMPLE) return fetchSample(meta);

    const key = `launches:${meta.api}`;
    const cached = readCache(key, CACHE_MS);
    if (cached?.fresh) {
      const { missions, total } = cacheList(cached.data);
      return { missions, total, source: "cache", savedAt: cached.savedAt };
    }
    try {
      const page = await fetchPage(meta);
      writeCache(key, page);
      return { ...page, source: "network", savedAt: Date.now() };
    } catch (error) {
      if (cached) {
        const { missions, total } = cacheList(cached.data);
        return {
          missions,
          total,
          source: "stale-cache",
          savedAt: cached.savedAt,
          error,
        };
      }
      try {
        return { ...(await fetchSample(meta)), error };
      } catch {
        throw error;
      }
    }
  }

  /**
   * Next page of the same list, continuing from what is cached.
   * Returns { missions (only the new ones), total, source }.
   * Throws when the network fails, because there is nothing to fall back to
   * without inventing launches that were never loaded.
   */
  async loadMore(view) {
    const meta = resolveView(view);
    if (USE_SAMPLE)
      return { missions: [], total: null, source: "sample-empty" };

    const key = `launches:${meta.api}`;
    const cached = readCache(key, Infinity);
    const { missions: loaded, total } = cacheList(cached?.data);
    if (total !== null && loaded.length >= total) {
      return { missions: [], total, source: "cache" };
    }

    const page = await fetchPage(meta, loaded.length);
    const merged = uniqueById([...loaded, ...page.missions]);
    const nextTotal = page.total ?? total;
    writeCache(key, { missions: merged, total: nextTotal });
    return { missions: page.missions, total: nextTotal, source: "network" };
  }

  /** Returns one mission, or null when the id is invalid or unknown. */
  async getMissionById(id) {
    if (!ID_PATTERN.test(id ?? "")) return null;
    const cachedHit = findCached(id);
    if (cachedHit) return cachedHit;
    if (USE_SAMPLE) return findInSamples(id);

    try {
      const response = await request(
        `${API_URL}/launch/${encodeURIComponent(id)}/`,
      );
      if (response.status === 404) return null;
      return toMission(await readJson(response));
    } catch (error) {
      const sampleHit = await findInSamples(id);
      if (sampleHit) return sampleHit;
      throw error;
    }
  }
}
