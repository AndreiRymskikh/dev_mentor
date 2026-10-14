import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

// Exercise the actual production server, using the relocated app directory.
await readFile(new URL("../packages/app/.next/BUILD_ID", import.meta.url)).catch(() => {
  throw new Error("Production build missing. Run npm run build before npm run smoke.");
});
const port = process.env.SMOKE_PORT ?? "3100";
if (!/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535) {
  throw new Error("SMOKE_PORT must be a port between 1024 and 65535.");
}
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [
  "node_modules/next/dist/bin/next", "start", "packages/app", "--hostname", "127.0.0.1", "--port", port,
], { stdio: "inherit" });
let stopped = false;
server.once("exit", () => { stopped = true; });
try {
  let response;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (stopped) throw new Error("Production server exited before becoming ready.");
    try {
      response = await fetch(origin, { signal: AbortSignal.timeout(2000) });
      if (response.ok) break;
    } catch { /* Wait for startup; final assertion reports failure. */ }
    await delay(500);
  }
  if (!response?.ok) throw new Error("Homepage did not return HTTP 200 within 30 seconds.");
  const html = await response.text();
  for (const expected of ["To get started, edit the", "Deploy Now", "Documentation", "bg-zinc-50"]) {
    if (!html.includes(expected)) throw new Error(`Homepage missing: ${expected}`);
  }
  for (const asset of ["next.svg", "vercel.svg", "file.svg", "globe.svg", "window.svg", "favicon.ico"]) {
    const result = await fetch(`${origin}/${asset}`);
    if (!result.ok) throw new Error(`Asset unavailable: ${asset} (${result.status})`);
  }
  const cssUrls = [...html.matchAll(/href="([^" ]+\.css(?:\?[^" ]*)?)"/g)].map((match) => match[1]);
  if (!cssUrls.length) throw new Error("No stylesheet linked from homepage.");
  let css = "";
  for (const url of cssUrls) {
    const result = await fetch(new URL(url.replaceAll("&amp;", "&"), origin));
    if (!result.ok) throw new Error(`Stylesheet unavailable: ${url}`);
    css += await result.text();
  }
  if (!css.includes(".bg-zinc-50")) throw new Error("Shared PageShell Tailwind styles missing.");
  console.log("Production smoke check passed: homepage, static assets, shared styles.");
} finally {
  if (!stopped) {
    const exited = new Promise((resolve) => server.once("exit", resolve));
    server.kill("SIGTERM");
    await Promise.race([exited, delay(5000)]);
    if (!stopped) server.kill("SIGKILL");
  }
}
