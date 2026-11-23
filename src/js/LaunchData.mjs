import { toMission } from "./mission.mjs";
import { readCache, writeCache } from "./cache.mjs";

const API_URL = (
  import.meta.env.VITE_LAUNCH_API_URL ?? "https://ll.thespacedevs.com/2.2.0"
).replace(/\/$/, "");
const USE_SAMPLE = import.meta.env.VITE_USE_SAMPLE === "true";
const CACHE_MS = 30 * 60 * 1000;
const PAGE_SIZE = 20;
const KINDS = ["upcoming", "previous"];
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

function parseResults(json) {
  if (!Array.isArray(json?.results)) {
    throw new LaunchDataError(
      "invalid",
      "The launch data service sent an unexpected response.",
    );
  }
  return json.results.map(toMission);
}

async function fetchFromNetwork(kind) {
  const response = await request(
    `${API_URL}/launch/${kind}/?limit=${PAGE_SIZE}`,
  );
  return parseResults(await readJson(response));
}

async function fetchSample(kind) {
  const response = await request(
    `${import.meta.env.BASE_URL}data/sample-${kind}.json`,
  );
  return { missions: parseResults(await readJson(response)), source: "sample" };
}

function findCached(id) {
  for (const kind of KINDS) {
    const cached = readCache(`launches:${kind}`, Infinity);
    const hit = Array.isArray(cached?.data)
      ? cached.data.find((mission) => mission.id === id)
      : null;
    if (hit) return hit;
  }
  return null;
}

async function findInSamples(id) {
  for (const kind of KINDS) {
    try {
      const { missions } = await fetchSample(kind);
      const hit = missions.find((mission) => mission.id === id);
      if (hit) return hit;
    } catch {
      // Sample file missing or unreadable: keep looking.
    }
  }
  return null;
}

export default class LaunchData {
  /**
   * Returns { missions, source, savedAt?, error? }.
   * source: "network" | "cache" | "stale-cache" | "sample".
   * `error` is set when a fallback was used because the network failed.
   */
  async getMissions(kind) {
    if (!KINDS.includes(kind)) {
      throw new LaunchDataError("invalid", "Unknown launch list.");
    }
    if (USE_SAMPLE) return fetchSample(kind);

    const key = `launches:${kind}`;
    const cached = readCache(key, CACHE_MS);
    if (cached?.fresh) {
      return {
        missions: cached.data,
        source: "cache",
        savedAt: cached.savedAt,
      };
    }
    try {
      const missions = await fetchFromNetwork(kind);
      writeCache(key, missions);
      return { missions, source: "network", savedAt: Date.now() };
    } catch (error) {
      if (cached) {
        return {
          missions: cached.data,
          source: "stale-cache",
          savedAt: cached.savedAt,
          error,
        };
      }
      try {
        return { ...(await fetchSample(kind)), error };
      } catch {
        throw error;
      }
    }
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
