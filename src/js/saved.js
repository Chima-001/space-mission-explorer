import {
  bindCardFlips,
  missionCardTemplate,
  watchBrokenImages,
} from "./MissionList.mjs";
import { bindSaveButtons } from "./saveButton.mjs";
import { getSaved } from "./storage.mjs";
import {
  loadHeaderFooter,
  qs,
  renderListWithTemplate,
  renderState,
  setMeta,
  withBase,
} from "./utils.mjs";

loadHeaderFooter("saved");
const list = qs("#saved-list");
const title = qs("#page-title");

function render() {
  const saved = getSaved();
  title.textContent = `Saved missions (${saved.length})`;
  setMeta(
    `Saved missions (${saved.length}) | Space Mission Explorer`,
    "The space missions you saved, kept in your browser so you can return to them later.",
  );
  if (!saved.length) {
    renderState(list, {
      type: "empty",
      message: "No saved missions yet. Save a mission and it will appear here.",
      linkHref: withBase("missions/?view=upcoming"),
      linkLabel: "Browse missions",
    });
    return;
  }
  renderListWithTemplate(missionCardTemplate, list, saved);
  bindCardFlips(list);
}

watchBrokenImages(document);
bindSaveButtons(
  list,
  (id) => getSaved().find((mission) => mission.id === id),
  () => {
    render();
    title.focus(); // keep keyboard focus somewhere sensible after a removal
  },
);
render();
