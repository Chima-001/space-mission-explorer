# Space Mission Explorer

An educational web app for exploring upcoming and past space launches, reading mission
details, looking at related NASA images and saving the missions you follow. Built with
HTML, CSS and vanilla JavaScript (ES modules) on Vite, for WDD 330.

It is not a real-time mission control tool. Data is refreshed from public APIs and cached
in the browser.

## Live site

- GitHub Pages: `https://chima-001.github.io/space-mission-explorer/`
- Render (static site): deploy from this repo using `render.yaml`

## What it does

| Page                                                  | What it shows                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| Home (`/`)                                            | Rotating NASA hero, the featured NASA image of the day, the next three launches |
| Missions (`/missions/?view=upcoming` or `?view=past`) | Search, status filter, date sort, load more                                     |
| Mission detail (`/mission/?id=<launch id>`)           | Full details, live countdown, related NASA images                               |
| Saved (`/saved/`)                                     | Missions kept in `localStorage`                                                 |

Also included: a full-bleed rotating hero, a featured image that cycles through daily NASA
pictures, mission cards that flip to show quick facts (mouse and keyboard), loading, empty,
error and not-found states with a retry, and sample-data fallback.

## Requirements

- Node.js 20 or newer (built on Node 24, npm 11)
- No API keys. No server. No database.

## Getting started

```powershell
npm install
Copy-Item src/.env.sample src/.env   # optional: see Configuration
npm run dev
```

Open <http://localhost:5173/>.

Production build and local check:

```powershell
npm run build
npm run preview
```

Quality gates, run before each commit:

```powershell
npm run format
npm run lint
```

## Configuration

`src/.env` is optional and git-ignored. Everything in it is public configuration, not a
secret, and the code has working defaults for all of it.

| Variable              | Default                             | Purpose                                                                |
| --------------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| `VITE_USE_SAMPLE`     | `false`                             | `true` reads the bundled sample JSON instead of calling the launch API |
| `VITE_LAUNCH_API_URL` | `https://ll.thespacedevs.com/2.2.0` | Launch Library 2 base URL                                              |
| `VITE_NASA_API_URL`   | `https://images-api.nasa.gov`       | NASA Image and Video Library base URL                                  |

Use `VITE_USE_SAMPLE=true` while working on styling. Launch Library 2 allows about 15
requests per hour, and the bundled sample files let you build without spending any.

## Data sources and limits

**Launch Library 2 (The Space Devs).** `launch/upcoming/` and `launch/previous/`. 100
launches per request, because 100 is the API's ceiling: its own documentation answers
`?limit=150` with a `next` link of `limit=100`, so a bigger number is silently capped.
More launches are fetched with `?offset=` only when the ones already in memory are used up,
so "Load more" can reach every launch the API holds (thousands, not a fixed slice).
Lists are cached for 10 minutes, so a revisit or refresh picks up changed dates and
statuses, and the detail page reuses the cached list.

**NASA Image and Video Library.** `search?q=...&media_type=image`. Image sizes come from
the links NASA returns (`preview` = thumbnail, `alternate` = medium, `canonical` = full
size). There is no `~large` file: requesting one returns HTTP 403, so the code never
builds a file name by hand. Images are cached for 24 hours.

If a request fails, the app says so and offers a retry, and falls back to a cached list or
to the bundled sample data with a visible notice. A failure never looks like an empty list.

## Project structure

```
src/
  index.html  missions/  mission/  saved/     the four pages
  css/style.css                              variables, layout, animations
  js/
    LaunchData.mjs  NasaImageData.mjs         data layer (fetch, normalise, cache)
    mission.mjs  cache.mjs  storage.mjs       model, cache and localStorage helpers
    MissionList.mjs  MissionDetails.mjs
    FeaturedSpace.mjs  HeroRotator.mjs        views
    countdown.mjs  saveButton.mjs  text.mjs  utils.mjs
    main.js  missions.js  mission.js  saved.js  attributions.js   page controllers
  attributions/                              credits and sources page
  public/data/                                sample launch JSON
  public/images/icon.svg
```

localStorage keys: `sme:saved` (saved missions), `sme:prefs` (last view, sort and status
filter), `sme:cache:*` (timestamped API cache).

## Deployment

- **GitHub Pages is the chosen host.** `render.yaml` is an optional backup: if you ever
  connect this repo to Render, it configures the static site for you. You do not need it
  for GitHub Pages, and it can be deleted without affecting anything.
- **GitHub Pages**: pushing to `main` runs `.github/workflows/deploy.yml`. The workflow
  builds with `BASE_PATH=/space-mission-explorer/` because Pages serves the repo from a
  sub-path. Set Settings → Pages → Source to _GitHub Actions_ once.
- **Render**: create a Blueprint from this repo. `render.yaml` builds with the default
  `base` of `/`, which is what Render needs.

## Attribution

- Launch data: [The Space Devs](https://thespacedevs.com/), Launch Library 2
- Images: [NASA Image and Video Library](https://images.nasa.gov/)

## Author

Chimamkpam Nnaji (Chima) — WDD 330, BYU-Idaho.
