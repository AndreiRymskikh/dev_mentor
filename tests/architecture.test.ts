import { test } from "vitest";
import assert from "node:assert/strict";
import { ESLint } from "eslint";

test("lint rejects imports that violate package or ORM boundaries", async () => {
  const eslint = new ESLint();
  for (const [file, module] of [
    ["packages/ui/src/boundary.ts", "@devmentor/core/http"],
    ["packages/db/src/boundary.ts", "@devmentor/core"],
    ["packages/core/src/boundary.ts", "react"],
    ["packages/app/src/boundary.ts", "@devmentor/db"],
    ["packages/core/src/boundary.ts", "@mikro-orm/core"],
  ]) {
    const results = await eslint.lintText(`import "${module}";`, { filePath: file });
    assert.ok(results[0].messages.some((message) => message.ruleId === "no-restricted-imports"), `${file} must reject ${module}`);
  }
  const allowed = await eslint.lintText('import "@devmentor/db";', { filePath: "packages/core/src/boundary.ts" });
  assert.equal(allowed[0].errorCount, 0);
});
