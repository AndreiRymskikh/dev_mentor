# PR CI and testing

Goal: independent PR build, lint/typecheck, 100% unit coverage and PostgreSQL/agent-browser integration gates.

Plan: migrate to Vitest coverage; test all existing production TypeScript; implement ephemeral database/app/browser lifecycle and home/admin scenarios; configure CI artifacts and document mandatory coverage.

Admin scope confirmed by owner: /admin must return 404 until a real admin feature exists. No privileged/admin feature is added.

Progress: in progress. Application has no persistence runtime yet; test PostgreSQL connectivity explicitly and provide DATABASE_URL to the ephemeral app without pretending the home page uses the database.
