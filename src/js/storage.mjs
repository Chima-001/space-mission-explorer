// All saved-mission and display-preference storage lives here.
// Keys: sme:saved (compact records), sme:prefs (display preferences).
const SAVED_KEY = "sme:saved";
const PREFS_KEY = "sme:prefs";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const notify = () => window.dispatchEvent(new CustomEvent("sme:saved-changed"));

export function getSaved() {
  const list = readJson(SAVED_KEY, []);
  return Array.isArray(list)
    ? list.filter((item) => item && typeof item.id === "string")
    : [];
}

export const isSaved = (id) => getSaved().some((item) => item.id === id);

// Compact record: not a full API response.
const toRecord = (mission) => ({
  id: mission.id,
  name: mission.name,
  date: mission.date,
  status: mission.status,
  imageUrl: mission.imageUrl,
});

/** Returns "saved" | "removed" | "failed". Unique by mission id. */
export function toggleSaved(mission) {
  const current = getSaved();
  const exists = current.some((item) => item.id === mission.id);
  const next = exists
    ? current.filter((item) => item.id !== mission.id)
    : [...current, toRecord(mission)];
  if (!writeJson(SAVED_KEY, next)) return "failed";
  notify();
  return exists ? "removed" : "saved";
}

export function removeSaved(id) {
  const ok = writeJson(
    SAVED_KEY,
    getSaved().filter((item) => item.id !== id),
  );
  if (ok) notify();
  return ok;
}

export function getPrefs() {
  const prefs = readJson(PREFS_KEY, {});
  return prefs && typeof prefs === "object" && !Array.isArray(prefs)
    ? prefs
    : {};
}

export function setPref(key, value) {
  return writeJson(PREFS_KEY, { ...getPrefs(), [key]: value });
}
