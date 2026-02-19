/** @type { import("eslint").Linter.Config } */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: ['eslint:recommended'],
  ignorePatterns: ['dist', 'node_modules'],
  overrides: [
    { files: ['*.cjs'], env: { node: true } },
  ],
};
