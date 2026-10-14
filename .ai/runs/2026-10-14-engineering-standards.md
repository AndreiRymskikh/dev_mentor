# Engineering standards implementation

Source doc: .ai/specs/2026-09-01-engineering-standards.md
Status: in-progress

## Implementation Plan

1. Align package boundaries and src/app layout; reconcile agent and product docs.
2. Implement shared HTTP errors, handler, validation, fail-closed auth, and CRUD builder.
3. Implement independent client API utilities and generic forms/tables/feedback.
4. Add explicit Awilix scopes and health reference route; verify tests, lint, types, audit, build and startup.

## Progress

### Phase 1: Boundaries and documentation

- [x] 1.1 Align package boundaries and docs.
### Phase 2: HTTP foundations

- [x] 2.1 Shared HTTP foundations.
### Phase 3: UI foundations

- [x] 3.1 Shared UI foundations.
### Phase 4: Integration and verification

- [x] 4.1 DI, reference route and regression tests.
- [ ] 4.2 Full verification gate (blocked by dependency audit).

Existing auth/mentor entities, users service and admin screen assumed by the source spec do not exist. Do not invent domain features. Event bus and concept validators remain deferred until their first real consumer, as specified. No pipeline config or gh CLI is available; this user-directed update is implemented locally, without claiming PR review or publication.


## Outcome

All workspace boundaries, reusable foundations, docs and reference health route implemented. Existing home rendering and static assets preserved. Cache Components disabled to honor the spec's force-dynamic route contract; no database connection is made during build or health requests.

Verification: dependency installation, lint, workspace/test typecheck, 11 tests, production build, HTTP startup/assets/styles/health/request-scope smoke and diff check passed. Full gate stopped at audit: unpatched braces stack-exhaustion advisory, six affected dependency entries. Latest registry release is 3.0.3; force fixes would downgrade Awilix and Next ESLint. No unsafe downgrade or ignored audit failure. Next: address upstream advisory, rerun full gate, then domain/persistence specifications. No gh/pipeline configuration; no PR/review claimed.
