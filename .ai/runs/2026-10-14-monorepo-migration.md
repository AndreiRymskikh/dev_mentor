# Monorepo migration run

Spec: [migration plan](../specs/2026-10-14-monorepo-migration.md).

Goal: implement phase 1, preserving current behavior.

Moved application/config/assets into packages/app; added npm workspaces, core/db contracts, shared PageShell, source exports, Tailwind shared-source discovery, and workspace checks. Database runtime and DI are subsequent phases.

Validation: lint and all four workspace type checks passed. Build blocked by environment: initial Google font fetch failure, followed by worker port binding denial on permission-enabled retries. HTTP/UI smoke check not run because the production build did not finish. No test suite exists. Diff whitespace check passed.

Outcome: structural phase implemented; phase completion awaits build and runtime verification. No dependency upgrades or business behavior changes intended. Next: complete runtime verification, then PostgreSQL/MikroORM phase.


## Phase 1 continuation

Rechecked phase markers: phase 1 remains first incomplete; phases 2 and 3 have not started. Added `scripts/smoke-app.mjs` and root `npm run smoke` to start the relocated production app, assert original homepage content, static assets and shared Tailwind CSS, and shut it down. Root lint now covers scripts too. README documents the smoke command.

Checks: offline dependency installation passed (367 packages, no reported vulnerabilities); workspace type checks passed; smoke script syntax passed. Production build again failed at the Tailwind/Turbopack CSS worker's local port binding (`Operation not permitted`), including an escalated retry. `npm run smoke` correctly refused to run without a production BUILD_ID. Thus application startup and visual UI checks remain unverified. No standalone unit test suite exists. Keep phase 1 unchecked; next action is a production build and smoke run in an environment permitting worker ports, followed by PostgreSQL/MikroORM phase 2.
