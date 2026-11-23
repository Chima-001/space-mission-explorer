import LaunchData from "./LaunchData.mjs";
import FeaturedSpace from "./FeaturedSpace.mjs";
import HeroRotator from "./HeroRotator.mjs";
import {
  bindCardFlips,
  missionCardTemplate,
  renderSourceNotice,
  watchBrokenImages,
} from "./MissionList.mjs";
import { bindSaveButtons } from "./saveButton.mjs";
import {
  loadHeaderFooter,
  qs,
  renderListWithTemplate,
  renderState,
  withBase,
} from "./utils.mjs";

loadHeaderFooter("home");
// #all-link is static HTML; the hero's own links are set by HeroRotator after
// it renders, because setting them here would run before the hero exists.
qs("#all-link").href = withBase("missions/?view=upcoming");

const list = qs("#mission-list");
const notice = qs("#notice");
const launches = new LaunchData();
let byId = new Map();

watchBrokenImages(document);
bindSaveButtons(list, (id) => byId.get(id));
bindCardFlips(list);
new HeroRotator(qs("#hero")).init();
new FeaturedSpace(qs("#featured")).init();

async function loadNext() {
  renderState(list, { type: "loading", message: "Loading upcoming launches…" });
  try {
    const result = await launches.getMissions("upcoming");
    renderSourceNotice(notice, result);
    // The next three launches that have not happened yet, soonest first.
    const next = result.missions
      .filter((m) => m.date && new Date(m.date).getTime() > Date.now())
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 3);
    byId = new Map(next.map((mission) => [mission.id, mission]));
    if (!next.length) {
      renderState(list, {
        type: "empty",
        message: "No upcoming launches found.",
      });
      return;
    }
    renderListWithTemplate(missionCardTemplate, list, next);
  } catch (error) {
    renderState(list, {
      type: "error",
      message: error.message,
      onRetry: loadNext,
    });
  }
}

loadNext();
