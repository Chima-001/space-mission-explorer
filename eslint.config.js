import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-shadow": "warn",
      eqeqeq: "error",
    },
  },
  {
    files: ["vite.config.js", "eslint.config.js"],
    languageOptions: { globals: { ...globals.node } },
  },
];
