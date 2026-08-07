import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "dist/**",
    ".wrangler/**",
    ".data/**",
    ".playwright-cli/**",
    "storage/**",
    "public/generated/**",
    "node_modules/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
  // Server and test layers are plain .mjs — ensure they are linted with
  // meaningful (not just vitals) rules even without type-aware checks.
  {
    files: ["server/**/*.mjs", "tests/**/*.mjs", "tests/**/*.ts"],
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "off",
    },
  },
]);

export default eslintConfig;
