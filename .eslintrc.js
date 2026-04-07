/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "tailwindcss"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "next/core-web-vitals",
    "plugin:tailwindcss/recommended",
    "prettier",
  ],
  ignorePatterns: ["node_modules/", ".next/", "out/", "coverage/"],
  rules: {
    "no-undef": "off",
  },
};
