import LaunchData from "./LaunchData.mjs";
import NasaImageData from "./NasaImageData.mjs";
import {
  missionDetailsTemplate,
  relatedImagesTemplate,
  rocketQuery,
} from "./MissionDetails.mjs";
import { watchBrokenImages } from "./MissionList.mjs";
import { bindSaveButtons } from "./saveButton.mjs";
import { startCountdown } from "./countdown.mjs";
import {
  getParam,
  loadHeaderFooter,
  qs,
  renderState,
  setMeta,
  withBase,
} from "./utils.mjs";

loadHeaderFooter("");
const container = qs("#mission-detail");
qs("#back-link").href = withBase("missions/?view=upcoming");

const launches = new LaunchData();
const nasa = new NasaImageData();
let current = null;
let stopCountdown = () => {};

watchBrokenImages(container);
bindSaveButtons(container, (id) => (current?.id === id ? current : null));

const browseLink = {
  linkHref: withBase("missions/?view=upcoming"),
  linkLabel: "Browse missions",
};

async function loadRelated(mission) {
  const target = qs("#related");
  const query = rocketQuery(mission.rocket);
  if (!target) return;
  if (!query) {
    renderState(target, {
      type: "empty",
      message: "No related NASA images for this mission.",
    });
    return;
  }
  renderState(target, { type: "loading", message: "Searching NASA images…" });
  try {
    const images = await nasa.search(query, 6);
    if (!images.length) {
      renderState(target, {
        type: "empty",
        message: "No related NASA images found for this rocket.",
      });
      return;
    }
    target.innerHTML = relatedImagesTemplate(images);
  } catch (error) {
    renderState(target, {
      type: "error",
      message: error.message,
      onRetry: () => loadRelated(mission),
    });
  }
}

function show(mission, backView = "upcoming") {
  current = mission;
  qs("#back-link").href = withBase(`missions/?view=${backView}`);
  setMeta(
    `${mission.name} | Space Mission Explorer`,
    `${mission.name}: launch time, rocket, pad, provider, orbit and related NASA images.`,
  );
  container.innerHTML = missionDetailsTemplate(mission);
  const countdown = qs("#countdown");
  if (countdown) stopCountdown = startCountdown(countdown, mission.date);
  qs("#page-title")?.focus(); // move focus for keyboard and screen reader users
  loadRelated(mission);
}

async function init() {
  stopCountdown();
  const id = getParam("id");
  if (!id) {
    renderState(container, {
      type: "empty",
      message: "No mission was selected.",
      ...browseLink,
    });
    return;
  }
  renderState(container, {
    type: "loading",
    message: "Loading mission details…",
  });
  try {
    const mission = await launches.getMissionById(id);
    if (!mission) {
      setMeta(
        "Mission not found | Space Mission Explorer",
        "This mission could not be found. Browse upcoming or past launches instead.",
      );
      renderState(container, {
        type: "empty",
        message:
          "Mission not found. The link may be wrong, or the launch is no longer listed.",
        ...browseLink,
      });
      return;
    }
    const isPast =
      mission.date && new Date(mission.date).getTime() < Date.now();
    show(mission, isPast ? "past" : "upcoming");
  } catch (error) {
    renderState(container, {
      type: "error",
      message: error.message,
      onRetry: init,
    });
  }
}

init();
