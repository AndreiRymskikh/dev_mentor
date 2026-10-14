import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { IntegrationContext } from "../context";

export async function testHome({ baseUrl, artifacts, browser }: IntegrationContext) {
  assert.equal((await fetch(baseUrl)).status, 200);
  await browser("open", baseUrl);
  const home = await browser("snapshot");
  await writeFile(path.join(artifacts, "home-snapshot.json"), JSON.stringify(home, null, 2));
  assert.match(home.data?.snapshot ?? "", /To get started, edit the/);
  assert.match(home.data?.snapshot ?? "", /Deploy Now/);
  assert.match(home.data?.snapshot ?? "", /Documentation/);
  await browser("screenshot", path.join(artifacts, "home.png"));
}
