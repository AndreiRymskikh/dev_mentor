<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Working principles

## DevMentor architecture

- DevMentor is a TypeScript monorepo targeting the latest stable, mutually compatible Next.js and React releases. Use the installed versions and their documentation; verify current releases before dependency upgrades.
- Use PostgreSQL for persistence and MikroORM for TypeScript entities, data access, migrations, and connection pooling. Keep database configuration, migrations, and persistence helpers in `packages/db`; isolate database access from browser code.
- Use Awilix for dependency injection. Compose application dependencies in `packages/app`, keep container setup on the server, and scope request-specific services and ORM entity managers to avoid sharing mutable request state.
- Use Tailwind CSS for frontend pages and shadcn/ui components for backend/admin pages. Here, backend pages mean the administrative UI. Put reusable UI components in `packages/ui`.
- Organize source into these minimum packages:

  | Package | Responsibility |
  | --- | --- |
  | `packages/app` | Main Next.js application, routes, pages, and application composition. |
  | `packages/core` | Reusable domain logic, contracts, and utilities independent of Next.js, UI, and persistence implementations. |
  | `packages/db` | MikroORM entities, repositories, migrations, PostgreSQL configuration, and data management helpers. |
  | `packages/ui` | Reusable React UI components, styles, and shared UI primitives. |

- Keep dependencies directed: `app` consumes `core`, `db`, and `ui`; `db` and `ui` may consume `core`; `core` must not depend on the other packages. Avoid circular dependencies and import shared code through package exports.
- The repository currently has a root-level Next.js `app/` directory. The package layout above is the target architecture; do not assume the workspace migration or planned dependencies are already installed.

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
