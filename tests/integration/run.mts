import assert from "node:assert/strict";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";
import { integrationConfig as config } from "./config";
import type { BrowserResult } from "./context";
import { testHome } from "./scenarios/home";
import { testAdmin } from "./scenarios/admin";
import { testDatabase } from "./database";
import { testInstaller } from "./setup.mts";

import { registrationFixture } from "./registration-http";

const exec = promisify(execFile);
const session = `devmentor-${randomUUID()}`;
const artifacts = path.resolve(config.artifacts);
const browserCli = path.resolve("node_modules/agent-browser/bin/agent-browser.js");
let mail: Awaited<ReturnType<typeof registrationFixture>> | undefined;
let database: StartedPostgreSqlContainer | undefined;
let app: ChildProcess | undefined;
let appExited = false;
let appLogs = "";
let browserUsed = false;

async function browser(...args: string[]) {
  browserUsed = true;
  const { stdout } = await exec(process.execPath, [browserCli, "--session", session, "--json", ...args], { timeout: config.browserCommandTimeoutMs, maxBuffer: 4 * 1024 * 1024 });
  const result = JSON.parse(stdout) as BrowserResult;
  assert.equal(result.success, true, result.error ?? "agent-browser command failed");
  return result;
}
async function freePort() {
  const server = createServer();
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const port = address.port;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}
async function shutdown() {
  if (browserUsed) {
    try { await browser("close"); }
    catch { console.error("Browser cleanup failed; check integration artifacts."); process.exitCode = 1; }
  }
  if (app && !appExited) {
    const exited = new Promise<void>((resolve) => app!.once("exit", () => resolve()));
    app.kill("SIGTERM");
    await Promise.race([exited, delay(5000)]);
    if (!appExited) { app.kill("SIGKILL"); await exited; }
  }
  if (mail) await mail.close();
  if (database) await database.stop();
}
async function main() {
  await mkdir(artifacts, { recursive: true });
  await readFile("packages/app/.next/BUILD_ID");
  database = await new PostgreSqlContainer(config.postgresImage)
    .withDatabase("devmentor_integration")
    .withUsername("devmentor_test")
    .withPassword(randomBytes(32).toString("hex"))
    .withStartupTimeout(config.containerStartupTimeoutMs)
    .start();
  const client = new Client({ connectionString: database.getConnectionUri() });
  try {
    await client.connect();
    await client.query("CREATE TEMP TABLE integration_probe (value text NOT NULL)");
    await client.query("INSERT INTO integration_probe (value) VALUES ($1)", ["ephemeral"]);
    const result = await client.query<{ value: string }>("SELECT value FROM integration_probe");
    assert.equal(result.rows[0].value, "ephemeral");
  } finally { await client.end(); }
  process.env.DATABASE_URL = database.getConnectionUri();
  await testDatabase(database.getConnectionUri());
  mail = await registrationFixture();
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "packages/app", "--hostname", "127.0.0.1", "--port", String(port)], {
    env: { ...process.env, NODE_ENV: "production", ...mail.environment, DATABASE_URL: database.getConnectionUri() },
    stdio: ["ignore", "pipe", "pipe"],
  });
  app.once("exit", () => { appExited = true; });
  app.once("error", () => { appExited = true; });
  app.stdout?.on("data", (data: Buffer) => { appLogs += data.toString(); });
  app.stderr?.on("data", (data: Buffer) => { appLogs += data.toString(); });
  const deadline = Date.now() + config.startupTimeoutMs;
  let ready = false;
  while (Date.now() < deadline) {
    assert.equal(appExited, false, "App exited during startup");
    try { ready = (await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(2000) })).ok; }
    catch { ready = false; }
    if (ready) break;
    await delay(config.readinessIntervalMs);
  }
  assert.equal(ready, true, "App readiness timed out");
  const context = { baseUrl, artifacts, browser };
  await mail.test(baseUrl, database.getConnectionUri());
  await testHome(context);
  await testAdmin(context);
  await testInstaller();
  console.log("Integration passed: ephemeral PostgreSQL, home page and admin 404.");
}
try { await main(); }
catch (error: unknown) {
  if (browserUsed) {
    try { await browser("screenshot", path.join(artifacts, "failure.png")); }
    catch { console.error("Failure screenshot unavailable."); }
  }
  const message = error instanceof Error ? error.message : "Unknown integration failure";
  const safeMessage = database ? message.replaceAll(database.getConnectionUri(), "[DATABASE_URL]").replaceAll(database.getPassword(), "[REDACTED]") : message;
  await writeFile(path.join(artifacts, "failure.txt"), safeMessage);
  console.error(safeMessage);
  process.exitCode = 1;
} finally {
  const safeLogs = database ? appLogs.replaceAll(database.getConnectionUri(), "[DATABASE_URL]").replaceAll(database.getPassword(), "[REDACTED]") : appLogs;
  await writeFile(path.join(artifacts, "app.log"), safeLogs);
  await shutdown();
}
