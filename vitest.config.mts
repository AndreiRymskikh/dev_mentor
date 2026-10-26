import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    include: ["tests/**/*.test.{ts,tsx}", "packages/ui/tests/**/*.test.{ts,tsx}"],
    environment: "node",
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: "v8",
      reportOnFailure: true,
      include: ["packages/**/src/**/*.{ts,tsx}", "packages/app/next.config.ts", "scripts/invite.mts", "scripts/bootstrap-admin.mts", "scripts/maintain-auth.mts", "scripts/setup.mjs", "scripts/setup/**/*.mjs"],
      exclude: ["**/*.d.ts"],
      reporter: ["text", "html", "lcov", "json", "json-summary"],
      thresholds: { perFile: true, statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
