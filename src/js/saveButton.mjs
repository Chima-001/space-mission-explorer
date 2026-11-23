import { toggleSaved } from "./storage.mjs";
import { alertMessage, esc, qs } from "./utils.mjs";

const label = (saved, long) =>
  saved
    ? long
      ? "Remove from saved"
      : "Remove"
    : long
      ? "Save mission"
      : "Save";

export function saveButtonTemplate(mission, saved, long = false) {
  return `<button type="button" class="btn ${long ? "" : "btn-ghost"} save-btn" data-save-id="${esc(mission.id)}" data-long="${long}"><span class="save-label">${label(saved, long)}</span><span class="sr-only"> ${esc(mission.name)}</span></button>`;
}

/** Tells screen readers what happened (each page has a #live region). */
export function announce(text) {
  const live = qs("#live");
  if (!live) return;
  live.textContent = "";
  setTimeout(() => {
    live.textContent = text;
  }, 50);
}

/**
 * One delegated click listener for every Save/Remove button inside `root`.
 * lookup(id) must return the mission (or saved record) for that id.
 */
export function bindSaveButtons(root, lookup, onChange) {
  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-save-id]");
    if (!button || !root.contains(button)) return;
    const mission = lookup(button.dataset.saveId);
    if (!mission) return;

    const result = toggleSaved(mission);
    if (result === "failed") {
      alertMessage(
        "Could not save this mission. Browser storage may be blocked or full.",
        "error",
      );
      return;
    }
    const saved = result === "saved";
    button.querySelector(".save-label").textContent = label(
      saved,
      button.dataset.long === "true",
    );
    button.classList.toggle("is-saved", saved);
    announce(
      `${mission.name} ${saved ? "saved" : "removed from saved missions"}.`,
    );
    onChange?.(mission.id, saved);
  });
}
