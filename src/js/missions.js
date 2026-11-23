import LaunchData from "./LaunchData.mjs";
import { statusTone } from "./mission.mjs";
import {
  bindCardFlips,
  missionCardTemplate,
  renderSourceNotice,
  watchBrokenImages,
} from "./MissionList.mjs";
import { bindSaveButtons } from "./saveButton.mjs";
import { getPrefs, setPref } from "./storage.mjs";
import {
  getParam,
  loadHeaderFooter,
  qs,
  renderListWithTemplate,
  alertMessage,
  renderState,
  setMeta,
} from "./utils.mjs";

const PAGE_SIZE = 9;
const VIEWS = ["upcoming", "past"];
const pick = (value, allowed, fallback) =>
  allowed.includes(value) ? value : fallback;
const defaultSort = (view) => (view === "past" ? "desc" : "asc");

const prefs = getPrefs();
// The URL is the source of truth and the words are the same as the nav
// links: "upcoming" and "past". Old links using ?view=previous still work.
const requested = getParam("view") ?? prefs.view;
const view = pick(
  requested === "previous" ? "past" : requested,
  VIEWS,
  "upcoming",
);

// Remember the list the user was last looking at, so a bare /missions/ visit
// reopens it. This is one of the properties kept in sme:prefs.
setPref("view", view);

const state = {
  view,
  search: "",
  status: pick(prefs.status, ["all", "go", "ok", "bad", "hold"], "all"),
  sort: pick(prefs.sort, ["asc", "desc"], defaultSort(view)),
  visible: PAGE_SIZE,
  missions: [],
  total: null,
  loadingMore: false,
};

loadHeaderFooter(view === "upcoming" ? "upcoming" : "past");
const launches = new LaunchData();
const list = qs("#mission-list");
const notice = qs("#notice");
const count = qs("#result-count");
const loadMore = qs("#load-more");
const title = qs("#page-title");
let byId = new Map();
let hasRendered = false;

const time = (mission) =>
  mission.date ? new Date(mission.date).getTime() : null;
function compareDates(a, b, direction) {
  const [ta, tb] = [time(a), time(b)];
  if (ta === null && tb === null) return 0;
  if (ta === null) return 1; // missing dates go last
  if (tb === null) return -1;
  return direction === "asc" ? ta - tb : tb - ta;
}

// Everything below runs in the browser on already-loaded data: no API calls.
function visibleMissions() {
  const term = state.search.trim().toLowerCase();
  return state.missions
    .filter(
      (m) =>
        !term ||
        [m.name, m.rocket, m.provider, m.location].some((field) =>
          String(field ?? "")
            .toLowerCase()
            .includes(term),
        ),
    )
    .filter(
      (m) => state.status === "all" || statusTone(m.status) === state.status,
    )
    .sort((a, b) => compareDates(a, b, state.sort));
}

function render() {
  const matches = visibleMissions();
  const shown = matches.slice(0, state.visible);
  byId = new Map(matches.map((mission) => [mission.id, mission]));
  const searching = state.search.trim().length > 0;
  const moreOnServer =
    state.total !== null && state.missions.length < state.total;
  count.textContent = searching
    ? `${matches.length} of ${state.missions.length} loaded missions match`
    : moreOnServer
      ? `${matches.length} of ${state.total} launches`
      : `${matches.length} launches`;
  list.classList.toggle("no-anim", hasRendered);
  hasRendered = true;
  if (!matches.length) {
    renderState(list, {
      type: "empty",
      message: "No missions match your search or filters.",
    });
    loadMore.hidden = true;
    return;
  }
  renderListWithTemplate(missionCardTemplate, list, shown);
  bindCardFlips(list);
  // "Load more" only disappears when the whole list is on screen.
  // Either the page is not fully shown, or more launches exist on the server.
  loadMore.hidden = shown.length >= matches.length && !moreOnServer;
  if (shown.length < matches.length) {
    loadMore.textContent = `Show more missions (${matches.length - shown.length} ready)`;
  } else {
    const left =
      state.total === null
        ? ""
        : ` (${state.total - state.missions.length} available)`;
    loadMore.textContent = `Load more from the API${left}`;
  }
}

async function load() {
  hasRendered = false;
  loadMore.hidden = true;
  count.textContent = "";
  notice.replaceChildren();
  renderState(list, { type: "loading", message: "Loading missions…" });
  try {
    const result = await launches.getMissions(state.view);
    state.missions = result.missions;
    state.total = result.total ?? null;
    renderSourceNotice(notice, result);
    render();
  } catch (error) {
    renderState(list, { type: "error", message: error.message, onRetry: load });
  }
}

function markView() {
  const label = state.view === "upcoming" ? "Upcoming" : "Past";
  title.textContent = `${label} missions`;
  setMeta(
    `${label} missions | Space Mission Explorer`,
    `Search, filter and sort ${label.toLowerCase()} space launches by name, rocket, provider or location.`,
  );
  document.querySelectorAll("[data-view]").forEach((button) => {
    const on = button.dataset.view === state.view;
    button.setAttribute("aria-pressed", String(on));
    // The HTML ships Upcoming as pressed; keep the pair agreeing with the URL.
    if (on) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  });
  document.querySelectorAll("#site-nav a").forEach((link) => {
    if (link.href.includes(`view=${state.view}`)) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function setView(next) {
  if (next === state.view) return;
  state.view = next;
  state.visible = PAGE_SIZE;
  state.sort = defaultSort(next);
  qs("#sort").value = state.sort;
  setPref("view", next);
  history.replaceState(null, "", `?view=${next}`);
  markView();
  load();
}

qs("#search").addEventListener("input", (event) => {
  state.search = event.target.value;
  state.visible = PAGE_SIZE;
  render();
});
qs("#status").addEventListener("change", (event) => {
  state.status = event.target.value;
  state.visible = PAGE_SIZE;
  setPref("status", state.status);
  render();
});
qs("#sort").addEventListener("change", (event) => {
  state.sort = event.target.value;
  setPref("sort", state.sort);
  render();
});
document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});
loadMore.addEventListener("click", async () => {
  // Reveal cards already in memory first; only then spend a request.
  if (state.visible < visibleMissions().length) {
    state.visible += PAGE_SIZE;
    render();
    return;
  }
  if (state.loadingMore) return;
  if (state.total !== null && state.missions.length >= state.total) return;

  state.loadingMore = true;
  loadMore.disabled = true;
  loadMore.textContent = "Loading more launches…";
  try {
    const page = await launches.loadMore(state.view);
    if (page.source === "sample-empty") {
      alertMessage(
        "This build uses a fixed sample of launches, so there are no more to load. " +
          "Live data is available when VITE_USE_SAMPLE is off.",
        "info",
      );
      state.total = state.missions.length;
    } else if (!page.missions.length) {
      state.total = state.missions.length;
      alertMessage("You have reached the end of the list.", "info");
    } else {
      state.missions = [...state.missions, ...page.missions];
      if (page.total !== null) state.total = page.total;
      state.visible += PAGE_SIZE;
      render();
    }
  } catch (error) {
    alertMessage(
      `${error.message} The launches already loaded are still shown.`,
      "error",
    );
  } finally {
    state.loadingMore = false;
    loadMore.disabled = false;
  }
});

watchBrokenImages(document);
bindSaveButtons(list, (id) => byId.get(id));
qs("#status").value = state.status;
qs("#sort").value = state.sort;
markView();
load();
