import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { settings: { next: { rootDir: "packages/app/" } } },
  { files: ["packages/**/*.{ts,tsx}"], rules: { "@typescript-eslint/no-explicit-any": "error", "no-empty": "error" } },
  ...[
    ["app", ["db"]], ["core", ["app", "ui"]], ["db", ["app", "core", "ui"]], ["ui", ["app", "core", "db"]],
  ].map(([name, forbidden]) => ({
    files: [`packages/${name}/**/*.{ts,tsx}`],
    rules: { "no-restricted-imports": ["error", { patterns: [
      ...forbidden.map((dependency) => ({ group: [`@devmentor/${dependency}`, `@devmentor/${dependency}/**`, `**/${dependency}/**`], message: "Respect the app → core → db boundary; ui is standalone." })),
      ...(name === "db" ? [] : [{ group: ["@mikro-orm/*"], message: "ORM imports belong exclusively to db." }]),
      ...(["core", "db"].includes(name) ? [{ group: ["next", "next/**", "react", "react/**", "react-dom", "react-dom/**"], message: "Core and db are independent of rendering frameworks." }] : []),
      ...(name === "ui" ? [{ group: ["next", "next/**"], message: "Shared UI is framework-independent." }] : []),
    ] }] },
  })),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "**/.next/**",
    "out/**",
    "build/**",
    "**/next-env.d.ts",
  ]),
]);

export default eslintConfig;
