import { test, vi } from "vitest";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => createElement("span", { role: "img", "aria-label": alt }) }));
vi.mock("next/font/google", () => ({ Geist: () => ({ variable: "--font-geist-sans" }), Geist_Mono: () => ({ variable: "--font-geist-mono" }) }));
import Home from "../packages/app/src/app/page";
import RootLayout, { metadata } from "../packages/app/src/app/layout";
import { GET, dynamic } from "../packages/app/src/app/api/health/route";
import nextConfig from "../packages/app/next.config";

test("home, root layout and Next config preserve existing behavior", () => {
  const home = renderToStaticMarkup(<Home />);
  assert.match(home, /To get started, edit the/);
  assert.match(home, /Deploy Now/);
  assert.match(home, /Next.js logo/);
  const html = renderToStaticMarkup(<RootLayout params={Promise.resolve({})}><Home /></RootLayout>);
  assert.match(html, /lang="en"/);
  assert.match(html, /--font-geist-sans/);
  assert.equal(metadata.title, "Create Next App");
  assert.ok(nextConfig.transpilePackages?.includes("@devmentor/ui"));
  assert.ok(nextConfig.turbopack?.root);
  assert.equal(nextConfig.turbopack?.rules, undefined, "Tailwind uses the shared PostCSS pipeline rather than a second Turbopack transform");
});
test("public health uses the API envelope and a fresh request scope", async () => {
  const first = await GET(new Request("http://localhost/api/health"));
  const second = await GET(new Request("http://localhost/api/health"));
  assert.equal(dynamic, "force-dynamic");
  assert.equal(first.status, 200);
  const result = await first.json();
  assert.equal(result.data.status, "ok");
  assert.notEqual(result.data.requestId, (await second.json()).data.requestId);
});
