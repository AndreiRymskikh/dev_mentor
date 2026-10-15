# DevMentor

DevMentor is a TypeScript application built with Next.js and React. Its target architecture is a monorepo with reusable domain, persistence, and UI packages.

## Technology choices

- **Application:** latest stable, mutually compatible Next.js, React, and TypeScript releases. The repository's installed versions are recorded in `package.json` and `package-lock.json`; upgrades should verify compatibility.
- **Database:** PostgreSQL with MikroORM for TypeScript entities, data access, migrations, and connection pooling.
- **Dependency injection:** Awilix, with explicit server container registration and request scopes in the core package.
- **Frontend pages:** Tailwind CSS.
- **Backend/admin pages:** shadcn/ui components. Backend pages here refer to the administrative UI.

## Package structure

```text
packages/
├── app/     # Main Next.js application and dependency composition
├── core/    # Reusable domain logic, contracts, and utilities
├── db/      # MikroORM entities, repositories, migrations, and database helpers
└── ui/      # Reusable React components and styles
```

Dependencies follow `app → core → db`, with standalone `ui` consumed by `app`. Core stays independent of Next.js and React; db and ui import no other workspace package. Shared code is consumed through package exports, with no circular dependencies.

Database access and the Awilix container stay on the server. Request-specific services use request scopes. MikroORM entity-manager scoping and connection pooling will be implemented in the persistence stage; schema changes will use migrations under `packages/db`.

The npm workspace structure is implemented. Routes live in `packages/app/src/app/`, static assets in `packages/app/public/`, and reusable components in `packages/ui/src/`. Package source exports are compiled by Next.js. The `core` and `db` packages currently expose shared contracts; PostgreSQL is provisioned locally and Awilix scopes are configured. MikroORM persistence and shadcn/ui components are subsequent phases in the [migration plan](.ai/specs/2026-10-14-monorepo-migration.md).

## Getting started

Install Node.js 24+ and Docker with Compose v2, and start the Docker engine. From a fresh checkout:

```bash
npm run setup
```

Setup installs missing or drifted dependencies, creates a private root `.env` only when absent, starts local PostgreSQL and verifies authenticated access, then starts the development server in the foreground. It uses Node builtins and works before `node_modules` exists. Browser installation and CI tests remain separate optional steps.

Rerunning validates current state and skips healthy dependencies, existing configuration and a healthy database. A setup-owned server with the same repository, dependency fingerprint, effective configuration and port is reused. Existing credentials and database data are preserved. Use `PORT=3001 npm run setup` on POSIX shells to choose another application port (PowerShell: `$env:PORT=3001; npm run setup`). `POSTGRES_PORT` and DATABASE_URL must describe the same database connection.

Ctrl+C stops only the development server owned by this setup invocation; PostgreSQL data remains. If another setup is still preparing, retry after it reports ready. An occupied port belonging to an unverified process is reported rather than killed. After an abnormal termination, verify no installer/dev process is running before removing only `.devmentor/setup.lock` and retrying; never remove database volumes for routine recovery.

Existing invalid or incomplete `.env` files are left unchanged with recovery instructions. Explicit POSTGRES_* and DATABASE_URL process values override the file, but must remain mutually consistent; the same effective settings are supplied to Compose, database checks and dev. If PostgreSQL storage already exists and credentials are missing, recover the original credentials instead of generating replacements. Secrets are not printed. Installer state under `.devmentor/` is ignored.

### Manual alternative

The original commands remain available. Prepare `.env` from `.env.example`, set POSTGRES_PASSWORD and the matching encoded DATABASE_URL (see Local PostgreSQL below), then run:

```bash
npm install
npm run db:up
npm run db:check
npm run dev
```

When the app needs DATABASE_URL, export it to the dev process or place the matching value in `packages/app/.env.local`; setup supplies it automatically.

Open [localhost:3000](http://localhost:3000). The current entry page is `packages/app/src/app/page.tsx`. Root `dev`, `build`, and `start` scripts delegate to the app workspace.

Available verification commands:

```bash
npm run lint
npm run typecheck
npm test
npm audit
npm run build
npm run smoke
```

## Specifications and AI workflow

[AGENTS.md](AGENTS.md) defines the shared architecture and coding-agent rules; [CLAUDE.md](CLAUDE.md) imports them.

- `.ai/specs/YYYY-MM-DD-slug.md`: SDD specifications, moved to `implemented/` after verification or `archive/` when superseded or abandoned.
- `.ai/runs/YYYY-MM-DD-slug.md`: autonomous AI run plans, progress, decisions, and verification results.
- `.ai/lessons.md` and `.ai/lessons/`: durable findings and prevention rules recorded after corrections and bug fixes.

`npm run smoke` starts the production app on localhost:3100, verifies the homepage, assets, and shared Tailwind styles, then stops the server. Run it after a successful build; override the port with `SMOKE_PORT`.

## Local PostgreSQL

Install Docker with Compose v2 and start its engine. From the repository root:

```bash
cp .env.example .env
# Set POSTGRES_PASSWORD and update DATABASE_URL in .env.
npm run db:up
npm run db:check
```

The official PostgreSQL 18 Alpine image uses a persistent named volume mounted at `/var/lib/postgresql`. The port is bound to `127.0.0.1:5432`; change `POSTGRES_PORT` and the URL if that port is occupied. Startup waits for the database health check. This is a local development database; the bootstrap user has administrative privileges.

`npm run db:psql` opens SQL shell access, `db:logs` follows logs, and `db:status` shows health. `db:check` checks password-authenticated TCP access inside the container. `npm run db:down` stops the stack while preserving its data. Initialization settings apply only to an empty volume; changing the environment does not change existing database users or passwords. Never remove the volume unless you intend to delete its data. Upgrade PostgreSQL major versions with an explicit data migration or backup/restore.

Compose reads the root `.env`. Next.js runs in `packages/app`, so when ORM integration is added, provide the same `DATABASE_URL` in `packages/app/.env.local` (or the process environment); Next.js does not automatically read the root file. Within Compose networking the hostname is `postgres` and the port is `5432`; host-run applications use `127.0.0.1` and `POSTGRES_PORT`. URL-encode special characters in passwords used in connection URLs. Environment files are ignored; only `.env.example` is committed.

MikroORM entities, migrations, pooling, and application connection lifecycle are still pending in phase 2. Schema changes will use ORM migrations rather than container initialization scripts.

## Shared engineering foundations

Core exports HTTP helpers through `@devmentor/core/http` and request scopes through `@devmentor/core/container`. `/api/health` demonstrates both without needing PostgreSQL. API responses use `{ ok: true, data }` or `{ ok: false, error: { code, message, fieldErrors? } }`.

UI exposes independent `@devmentor/ui/backend/api`, `/forms`, `/tables`, and `/feedback` entry points. Application code passes pure validation schemas into `CrudForm`; UI does not import core. `DataTable` uses controlled pagination: its caller supplies the current page rows, total count, and page-change callback.

The shared auth helpers require a verified session resolver; they do not implement login or JWT authentication. Auth/mentor entities, the users admin example, domain events, and concept validators will be added with their first feature specification. MikroORM integration remains a separate persistence stage. See the [engineering standards](.ai/specs/2026-09-01-engineering-standards.md).

## Database workspace commands

Root commands delegate to `packages/db` and forward CLI arguments:

| Root command | Database workspace command |
| --- | --- |
| `npm run db:migration:create` | `migration:create` |
| `npm run db:migrate` | `migration:up` |
| `npm run db:migrate:down` | `migration:down` |
| `npm run db:schema:update` | `schema:update` |
| `npm run db:seed` | `seed` |

These commands invoke the MikroORM CLI. They require the pending MikroORM setup: matching CLI/PostgreSQL/migrations/seeder packages, ORM configuration, entities and seeders. They are script definitions, not completed ORM integration. For example, once configured, `npm run db:migration:create -- --name=initial` forwards the name to MikroORM. Use migrations for tracked schema changes; reserve schema updates for local development. Review a down migration before running it, as rollback can remove data.

## PR CI and tests

[CI](.github/workflows/ci.yml) runs on every pull request, on pushes to `develop`/`main`, and manually. It uses Node 24 and `npm ci`, with separate **Production build**, **Lint and TypeScript**, **Unit tests (100% coverage)**, and **PostgreSQL and browser integration** jobs. Configure these four job names as required status checks in GitHub branch protection if merges must be mechanically blocked.

```bash
npm ci
npm run test:unit
npm run test:coverage
npm run browser:install          # Linux: add -- --with-deps
npm run build
npm run test:integration         # Requires a running Docker engine
```

Vitest/V8 enforces 100% lines, statements, functions and branches per production TypeScript/TSX file, including Next configuration. It does not exclude untested production files. Generated declarations, assets, dependencies and test/operational tooling are outside that metric. Reports are in `coverage/`; CI uploads them even when coverage fails.

Integration runs start a PostgreSQL 18 Testcontainer with random credentials and a random mapped port, verify SQL access, and start the production app on a free localhost port with the ephemeral DATABASE_URL. Agent-browser checks home content and the `/admin` not-found page, while HTTP checks verify 200/404 statuses. `/admin` remains intentionally unimplemented. The current app has no persistence runtime, so these tests verify database readiness and app/browser behavior separately; migration/fixture setup and actual persistence tests must be added with ORM integration. Developer Compose data is untouched.

The browser session, app process and test container are closed in cleanup. Snapshots, screenshots and app logs are retained in ignored `test-results/integration/` and uploaded by CI. Timeouts are centralized in `tests/integration/config.ts`. The integration script fails when no production build exists; it never silently skips tests when Docker or Chromium is missing.

`npm run check` additionally runs `npm audit`. The previously recorded unpatched braces advisory remains a separate local full-gate blocker; it is not concealed by the four requested CI checks.

`npm run test:setup` exercises a real first run and rerun in a temporary checkout with unique Compose resources and free ports. It verifies credential/dependency preservation, server reuse and a persisted SQL sentinel, then removes only its fixture resources. The normal integration runner includes this scenario. `scripts/setup` is included in the 100% unit coverage gate; no coverage threshold is relaxed.
