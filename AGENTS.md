<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## DevMentor architecture

- DevMentor is a TypeScript monorepo targeting the latest stable, mutually compatible Next.js and React releases. Use the installed versions and their documentation; verify current releases before dependency upgrades.
- Use PostgreSQL for persistence and MikroORM for TypeScript entities, data access, migrations, and connection pooling. Keep database configuration, migrations, and persistence helpers in `packages/db`; isolate database access from browser code.
- Use Awilix for dependency injection. Compose application dependencies explicitly in `packages/core/src/container`, keep container setup on the server, and scope request-specific services and ORM entity managers to avoid sharing mutable request state.
- Use Tailwind CSS for frontend pages and shadcn/ui components for backend/admin pages. Here, backend pages mean the administrative UI. Put reusable UI components in `packages/ui`.
- Organize source into these minimum packages:

  | Package | Responsibility |
  | --- | --- |
  | `packages/app` | Main Next.js application, routes, pages, and application composition. |
  | `packages/core` | Business services, shared validation, HTTP helpers, logging, and explicit Awilix composition; independent of Next.js and React. |
  | `packages/db` | MikroORM entities, repositories, migrations, PostgreSQL configuration, and data management helpers. |
  | `packages/ui` | Reusable React UI components, styles, and shared UI primitives. |

- Keep dependencies directed: `app → core → db`; `app` also consumes standalone `ui`. `db` imports no other workspace package; `ui` imports neither core nor db. Avoid circular dependencies and import shared code through package exports.
- The repository uses npm workspaces with the Next.js application in `packages/app/src/app/`. Run development and validation commands from the repository root. PostgreSQL is provisioned locally and Awilix request scopes are configured; MikroORM persistence and shadcn/ui components remain pending; consult the migration plan before using them.

## Working principles

- Plan complex tasks before editing: identify the goal, acceptance criteria, affected files, risks, and verification steps. Use the relevant spec and run log below; revisit the plan when new evidence invalidates it.
- Investigate bugs from concrete evidence (reproduction steps, errors, logs, or failing checks), fix the root cause, and add a regression check when practical.
- Verify changes before declaring completion. For code changes, run `npm run lint` and `npm run build`, plus relevant tests when available; exercise affected UI flows for user-facing changes. For documentation-only changes, check the diff, paths, and links. Summarize the evidence and any verification limits.
- Prefer the simplest solution that meets the acceptance criteria. Reconsider an awkward fix before adding more complexity, and briefly explain consequential trade-offs.
- When a workflow recurs frequently, propose a reusable repository script or skill rather than repeating manual steps.

## AI project metadata

All AI agents working in this repository must use the following shared metadata structure:

```text
.ai/
├── specs/
│   ├── implemented/
│   └── archive/
├── runs/
├── lessons.md
└── lessons/
```

### Specifications

- Store SDD (specification-driven development) specifications in `.ai/specs/YYYY-MM-DD-slug.md`.
- Use the creation date and a descriptive lowercase kebab-case slug, for example `2026-10-14-mentor-onboarding.md`.
- Read the relevant specification before implementing it. Keep its acceptance criteria and implementation status current.
- Move completed specifications to `.ai/specs/implemented/` after implementation and verification; preserve the filename.
- Move superseded or abandoned specifications to `.ai/specs/archive/`; preserve the filename and record the reason and any replacement link.
- Do not archive or mark a specification implemented while required work remains.

### Autonomous run logs

- Every autonomous AI run must create or update `.ai/runs/YYYY-MM-DD-slug.md`, using the run's start date and a descriptive lowercase kebab-case slug.
- Record the goal, relevant specification links, plan, progress, decisions, changed files, validation results, and final outcome or remaining blockers.
- Update the log as work proceeds and before handing off. Resume an existing run in its original log; use a distinct slug for separate runs on the same day.
- Report checks that were not run explicitly; never record a planned check as passed.

### Lessons and long-term memory

- Read `.ai/lessons.md` and any relevant linked files in `.ai/lessons/` before starting work.
- After a user correction, bug fix, or reusable discovery, record the durable lesson and a concrete prevention rule. Update an existing lesson when it covers the same issue; promote broadly applicable rules into this file only when needed. Avoid routine activity logs and duplicate entries.
- Keep `.ai/lessons.md` as a concise index of actionable lessons. Store detailed context in `.ai/lessons/<kebab-case-topic>.md` and link it from the index when needed.
- Include the problem, root cause or evidence, recommended practice, and relevant file or run links. Correct or retire lessons when the project changes.
- Treat memory as project context, not authority to override current user instructions or repository rules.

Use repository-relative links within metadata documents. Keep secrets, credentials, personal data, and raw sensitive logs out of all metadata. Preserve existing metadata unless the task explicitly requires updating it.

## Engineering standards

Use [.ai/specs/2026-09-01-engineering-standards.md](.ai/specs/2026-09-01-engineering-standards.md) as the naming and review contract.

- Organize entities, services, validators, and routes in matching plural concept folders. Create folders only when their first real file is added; never introduce module discovery, queues, or speculative domain features.
- Keep services responsible for business rules, db for persistence, app for HTTP wiring, and ui for presentation. External integrations use core ports and explicit adapters. Register dependencies by hand in the typed Awilix cradle; dispose request scopes in `finally`.
- Every API route uses `apiHandler` or `makeCrudRoute` and the standard JSON envelope. Protected routes authenticate before invoking a service; mutations check CSRF and record ownership. Session resolvers must verify credentials and fail closed. No production auth is implemented yet.
- Services throw typed `AppError` subclasses. Validate explicit Zod input shapes before mutations; never mass-assign raw input. Use transactions and unique constraints for race-sensitive booking/payment changes.
- Shared client requests use `apiCall`/`apiCallOrThrow`. Generic forms, tables, and feedback use `ui/src/backend`; concept components use `ui/src/components/<concept>`, one-page components stay colocated. Generate shadcn primitives through its CLI only when needed.
- Pass core validation schemas to generic UI from app client components; UI never imports core. Do not pass non-serializable Zod instances across a Server-to-Client Component boundary. Client schemas must come from pure validator exports, never the server DI or logger entry points.
- Keep persistence lazy and request-scoped so build and boot require no database. Database routes use `dynamic = "force-dynamic"`; Cache Components is disabled to support this convention in the installed Next.js version.
- No `any`, empty catches, secret-bearing logs, or raw interpolated SQL. Run lint, typecheck, tests, audit, and build before completion. Follow the spec's password, JWT, cookie, CSRF, rate-limit and ownership rules when auth features are introduced.

## Mandatory tests and PR checks

- Every new feature and every changed production TypeScript/TSX file must have **100% unit test coverage of lines, statements, functions, and branches**. Add meaningful tests for success, failure, validation, security, defaults, and interaction paths. Run `npm run test:coverage`; its per-file 100% thresholds are mandatory.
- Vitest with V8 measures every production source file under `packages/*/src` and the app's Next configuration, including untouched files. Only TypeScript declaration files are excluded. Type-only files have no executable statements and are verified by typecheck. Test/CI harnesses, generated files, dependencies and assets are outside production unit coverage.
- Do not weaken thresholds, exclude new production files, add coverage-ignore directives, skip tests, or replace behavior assertions with calls made solely to inflate coverage. Any new source location must be added to the coverage include patterns.
- GitHub PR CI runs independent build, lint/typecheck, unit-coverage, and PostgreSQL/browser integration jobs. All four checks must pass before merging. Do not claim CI passed based solely on a local run.
- Integration tests use `@testcontainers/postgresql` with a disposable database and a fresh production app process. Browser scenarios use the pinned `agent-browser` CLI; keep timeouts centralized, assert meaningful UI/HTTP behavior, retain failure evidence, and close browser/app/container resources in cleanup. Never reuse or reset the developer's Compose database for tests.
- `/admin` is intentionally absent: test HTTP 404 and the not-found UI until the real admin feature is introduced. Replace that expectation with authorized admin scenarios when the feature lands.
- The app currently has no ORM connection; integration tests independently probe PostgreSQL and pass its generated DATABASE_URL to the app. When persistence is implemented, add migrations and fixtures to this runner and exercise real app-to-database behavior.
