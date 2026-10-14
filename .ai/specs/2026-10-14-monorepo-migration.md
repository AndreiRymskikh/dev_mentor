# DevMentor monorepo migration

Preserve the current home page, routes, fonts, styles, and assets while establishing the package boundaries in AGENTS.md.

## Phases and completion criteria

- [x] Phase 1: npm workspace foundation. Move Next.js to packages/app; create core, db, ui exports and dependencies; extract shared UI without changing rendering; root dev/start/build/lint/typecheck scripts work. Completion: lint, workspace type checks, production build, and HTTP smoke check pass.
- [ ] Phase 2: PostgreSQL and MikroORM. Add server-only configuration, pooled connection lifecycle, request entity-manager isolation, migration commands, and a local database environment. Completion: connection and migration smoke checks pass against PostgreSQL.
- [ ] Phase 3: Awilix and admin UI. Wire server request scopes and persistence services; configure shadcn/ui in the shared UI package when the first admin flow is specified. Completion: scope isolation checks and the agreed admin flow pass.

## Scope decisions

Use npm workspaces and source exports compiled by Next.js. Preserve installed framework versions during the structural migration. No business entities or admin screens exist yet; do not invent them.

## Progress

Phase 1 code implemented: npm workspaces and lockfile; moved routes, assets, and Next.js/TypeScript config; source exports and inter-package dependencies; shared PageShell retaining original markup/classes; shared Tailwind source discovery; root scripts and workspace type checks; nested output ignores and ESLint root settings.

Verification: `npm run lint` passed; `npm run typecheck` passed for all four packages; `git diff --check` passed. `npm run build` initially failed to fetch existing Google fonts in the restricted environment. Permission-enabled retries failed because the Tailwind/Turbopack worker could not bind a local port (`Operation not permitted`). Phase 1 remains unchecked until production build and HTTP/UI smoke verification pass in an environment permitting those operations. No tests were present. Next stage: finish phase 1 runtime verification, then phase 2 PostgreSQL/MikroORM setup.


## Phase 1 continuation

Rechecked phase markers: phase 1 remains first incomplete; phases 2 and 3 have not started. Added `scripts/smoke-app.mjs` and root `npm run smoke` to start the relocated production app, assert original homepage content, static assets and shared Tailwind CSS, and shut it down. Root lint now covers scripts too. README documents the smoke command.

Checks: offline dependency installation passed (367 packages, no reported vulnerabilities); workspace type checks passed; smoke script syntax passed. Production build again failed at the Tailwind/Turbopack CSS worker's local port binding (`Operation not permitted`), including an escalated retry. `npm run smoke` correctly refused to run without a production BUILD_ID. Thus application startup and visual UI checks remain unverified. No standalone unit test suite exists. Keep phase 1 unchecked; next action is a production build and smoke run in an environment permitting worker ports, followed by PostgreSQL/MikroORM phase 2.


## PostgreSQL local environment

Added root docker-compose.yml with official PostgreSQL 18 Alpine, localhost-only port mapping, persistent named storage at /var/lib/postgresql, and readiness health check. Added .env.example, ignored generated local credentials, root db lifecycle/SQL scripts, and README setup instructions.

Checks passed: Compose configuration validation; container startup with health wait; password-authenticated TCP SQL smoke query (PostgreSQL 18.6, devmentor database); git diff whitespace check; local .env confirmed ignored. Development database left running on localhost:5432. This completes the local environment part of phase 2 only. MikroORM integration, pool lifecycle, request entity-manager isolation, migrations and their smoke checks remain pending. Phase 1 build/runtime verification remains pending as previously recorded.


## Engineering standards follow-up

During engineering standards implementation, phase 1 production build and HTTP smoke verification passed under permitted execution (homepage, assets and shared styles). Phase 1 is now complete. Routes now live in packages/app/src/app and dependencies follow the engineering spec's app → core → db direction with standalone UI. Awilix request scopes and health route are implemented; ORM entity-manager scope integration remains phase 2 work. The full engineering gate has a separate unresolved dependency audit blocker, recorded in its specification.
