# Monorepo migration run

Spec: [migration plan](../specs/2026-10-14-monorepo-migration.md).

Goal: implement phase 1, preserving current behavior.

Moved application/config/assets into packages/app; added npm workspaces, core/db contracts, shared PageShell, source exports, Tailwind shared-source discovery, and workspace checks. Database runtime and DI are subsequent phases.

Validation: lint and all four workspace type checks passed. Build blocked by environment: initial Google font fetch failure, followed by worker port binding denial on permission-enabled retries. HTTP/UI smoke check not run because the production build did not finish. No test suite exists. Diff whitespace check passed.

Outcome: structural phase implemented; phase completion awaits build and runtime verification. No dependency upgrades or business behavior changes intended. Next: complete runtime verification, then PostgreSQL/MikroORM phase.
