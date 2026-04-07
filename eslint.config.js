const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "coverage/**"],
  },
  ...compat.config({
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint", "tailwindcss"],
    extends: [
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "next/core-web-vitals",
      "plugin:tailwindcss/recommended",
      "prettier",
    ],
    rules: {
      "no-undef": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-require-imports": "off",
    },
  }),
  {
    files: ["next-env.d.ts", "test/**/*.ts", "scripts/**/*.js", "eslint.config.js"],
    rules: {
      "@typescript-eslint/triple-slash-reference": "off",
      "@next/next/no-assign-module-variable": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
