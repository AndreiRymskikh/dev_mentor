# PR CI and testing

Goal: independent PR build, lint/typecheck, 100% unit coverage and PostgreSQL/agent-browser integration gates.

Plan: migrate to Vitest coverage; test all existing production TypeScript; implement ephemeral database/app/browser lifecycle and home/admin scenarios; configure CI artifacts and document mandatory coverage.

Admin scope confirmed by owner: /admin must return 404 until a real admin feature exists. No privileged/admin feature is added.

Progress: completed locally. Application has no persistence runtime yet; test PostgreSQL connectivity explicitly and provide DATABASE_URL to the ephemeral app without pretending the home page uses the database.


## Changes and validation

- Added `.github/workflows/ci.yml` with independent PR build, lint/typecheck, unit-coverage and PostgreSQL/browser jobs, Node 24, read-only permissions, cancellation of superseded runs, time limits and uploaded evidence.
- Migrated the unit suite to Vitest 5/V8. Added tests for application rendering, health/config, HTTP/auth/CRUD failure and default paths, defensive client envelopes, form failures/numeric/checkbox/keyboard behavior, feedback and pagination. Production coverage includes all package TypeScript/TSX and Next configuration; no untested production source is excluded.
- Added Testcontainers PostgreSQL lifecycle, ephemeral app environment/port, pinned agent-browser CLI session, separate home/admin scenarios, centralized timeouts and finally cleanup. The developer Compose database is untouched.
- Documented mandatory 100% per-file coverage for every feature in AGENTS.md, README and CODE_REVIEW.md.

Passed: clean `npm ci`; lint; all package/test/tooling type checks; 19 unit tests in 6 files; 100% statements (181/181), branches (145/145), functions (51/51), lines (134/134); production build; twice-run integration scenarios after clean installation; workflow YAML/job structure validation; whitespace check. Screenshots and snapshots are in ignored test-results/integration; coverage reports in ignored coverage.

Verification is local (Node 26). Hosted GitHub execution on configured Node 24 and repository branch-protection settings have not been verified. Workflow is ready to execute on PR/push. Existing six affected dependency entries for the unpatched braces audit advisory remain; the root full check includes audit and remains blocked by that issue. None of the four requested CI jobs suppresses a test/build/lint failure.

Admin scope: HTTP 404 and real not-found UI only, as requested. PostgreSQL smoke verifies actual SQL, but the current app has no ORM runtime, so real app-to-DB CRUD/migration coverage is deferred until persistence exists. Add new feature-specific browser scenarios and fixtures with that work.
