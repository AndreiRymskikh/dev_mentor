import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "vitest";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import config from "../packages/app/postcss.config.mjs";

test("the shared PostCSS pipeline compiles auth layout utilities and visible control focus", async () => {
  assert.deepEqual(Object.keys(config.plugins), ["@tailwindcss/postcss"]);
  const root = path.resolve("packages/app");
  const compile = async (file: string) => (await postcss([tailwind({ base: root, optimize: false })]).process(await readFile(file, "utf8"), { from: file })).css;
  const globals = await compile(path.join(root, "src/app/globals.css"));
  assert.match(globals, /\.grid\s*\{\s*display: grid/);
  assert.match(globals, /\.max-w-lg\s*\{/);
  const auth = await compile(path.join(root, "src/app/(auth)/auth.css"));
  assert.match(auth, /\.dm-focus:focus-visible\s*\{[^}]*outline:/);
  assert.match(auth, /\.dm-auth \.gap-group\s*\{[^}]*gap: var\(--space-group\)/);
  assert.doesNotMatch(auth, /@(?:apply|utility)\b/);
});
