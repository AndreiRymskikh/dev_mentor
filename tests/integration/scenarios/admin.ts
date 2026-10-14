import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { IntegrationContext } from "../context";

export async function testAdmin({ baseUrl, artifacts, browser }: IntegrationContext) {
  // Owner-approved contract until the real admin feature exists.
  assert.equal((await fetch(`${baseUrl}/admin`)).status, 404);
  await browser("open", `${baseUrl}/admin`);
  const admin = await browser("snapshot");
  await writeFile(path.join(artifacts, "admin-snapshot.json"), JSON.stringify(admin, null, 2));
  assert.match(admin.data?.snapshot ?? "", /404/);
  assert.match(admin.data?.snapshot ?? "", /could not be found/);
  await browser("screenshot", path.join(artifacts, "admin.png"));
}
