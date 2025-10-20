const { defineConfig } = require("eslint/config");
const js = require("@eslint/js");
const globals = require("globals");
const pluginJest = require("eslint-plugin-jest");

module.exports = defineConfig([
  {
    files: ["**/*.{mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
  },
  {
    files: ["**/*.js"],
    ignores: ["./tdd/**/*.js", "./test/**/*.js", "./load-db.js"],
    languageOptions: { sourceType: "commonjs", globals: { ...globals.node } },
    plugins: { js },
    extends: ["js/recommended"],
    rules: {
      quotes: ["error", "double"],
      indent: ["error", 2, { SwitchCase: 1 }],
      semi: ["error", "always"],
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    },
  },
  {
    files: ["**/*.{mjs,cjs}"],
    languageOptions: { globals: globals.browser },
  },
  {
    ignores: ["**/generated/*", "**/node_modules/*"],
  },
  {
    // update this to match your test files
    files: ["**/*.spec.js", "**/*.test.js"],
    plugins: { jest: pluginJest },
    languageOptions: {
      globals: pluginJest.environments.globals.globals,
    },
    rules: {
      "jest/no-disabled-tests": "warn",
      "jest/no-focused-tests": "error",
      "jest/no-identical-title": "error",
      "jest/prefer-to-have-length": "warn",
      "jest/valid-expect": "error",
    },
  },
]);
