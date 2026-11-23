import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const page = (path) => fileURLToPath(new URL(path, import.meta.url));

// A build defaults to "/" so Render and Netlify work with no configuration.
// GitHub Pages serves this repo from a sub-path, so the deploy workflow sets
// BASE_PATH=/space-mission-explorer/ before building.
export default defineConfig(() => ({
  root: "src",
  base: process.env.BASE_PATH ?? "/",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: page("./src/index.html"),
        missions: page("./src/missions/index.html"),
        mission: page("./src/mission/index.html"),
        saved: page("./src/saved/index.html"),
        attributions: page("./src/attributions/index.html"),
      },
    },
  },
}));
