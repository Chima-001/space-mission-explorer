// Timestamped localStorage cache. Every read and write is guarded because
// storage can be empty, full, blocked or contain invalid JSON.
const PREFIX = "sme:cache:";

export function readCache(key, maxAgeMs) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { savedAt, data } = JSON.parse(raw);
    if (typeof savedAt !== "number" || data === undefined) return null;
    return { data, savedAt, fresh: Date.now() - savedAt <= maxAgeMs };
  } catch {
    return null;
  }
}

export function writeCache(key, data) {
  try {
    localStorage.setItem(
      PREFIX + key,
      JSON.stringify({ savedAt: Date.now(), data }),
    );
  } catch {
    // Storage full or blocked: the app still works, it just refetches.
  }
}
