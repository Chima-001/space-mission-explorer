import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const page = (path) => fileURLToPath(new URL(path, import.meta.url));

// GitHub Pages serves this repo from /space-mission-explorer/.
// Other hosts (Render, Netlify) serve from "/", so set BASE_PATH=/ there.
export default defineConfig(({ command }) => ({
  root: "src",
  base:
    process.env.BASE_PATH ??
    (command === "build" ? "/space-mission-explorer/" : "/"),
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: page("./src/index.html"),
        missions: page("./src/missions/index.html"),
        mission: page("./src/mission/index.html"),
        saved: page("./src/saved/index.html"),
      },
    },
  },
}));
