# Users/auth implementation tracker

Started 2026-10-21. [Specification](.ai/specs/2026-10-16-users-auth-application-primitives.md).

Each task uses a subagent, meaningful tests and a separate commit. Pause after each phase for owner manual testing. GitHub auth is deferred: show a button with coming-soon feedback; no OAuth endpoints or provider storage/secrets.

## Phase 1 — Database foundation (current)
- [ ] P1.1 Pinned MikroORM/PostgreSQL dependencies, lazy shared runtime, isolated request/transaction lifetime and tests.
- [ ] P1.2 Users, memberships, credentials, sessions, action tokens and rate-limit schema; explicit migrations, safe rollback, operator commands and disposable PostgreSQL tests.
- [ ] Phase gate: lint, typecheck, 100% coverage, audit, build and disposable database verification; provide manual instructions.
- [ ] Owner manual checkpoint passed.

## Phase 2 — Registration and email
- [ ] P2.1 Explicit repositories, strict registration validation, bcrypt and atomic database rate limits.
- [ ] P2.2 Email port/SMTP adapter, token issuance/invalidation and registration service; delivery failure/retry checks.
- [ ] P2.3 Scoped composition and registration API; CSRF, generic 202 response metadata and disposable database/mail tests.
- [ ] Validation and owner manual API checkpoint passed.

## Phase 3 — Verified credentials and sessions
- [ ] P3.1 Verification request/confirm with serialized single-use token consumption and replay checks.
- [ ] P3.2 JWT/session cookies, login/logout/session resolver, current role arrays and coordinated helper migration.
- [ ] P3.3 Forgot/reset password, atomic credential replacement/session revocation and race tests.
- [ ] Validation and owner manual API checkpoint passed.

## Phase 4 — Authentication screens
- [ ] P4.1 Accessible registration/login/recovery forms using existing UI; GitHub coming-soon button.
- [ ] P4.2 Fragment-token verification/reset pages, safe history/referrer handling, account page and logout.
- [ ] Validation, browser evidence and owner manual UI checkpoint passed.

## Phase 5 — Roles and administration
- [ ] P5.1 Self-enrollment, serialized admin role changes, last-admin protection and operator bootstrap.
- [ ] P5.2 Bounded users query/DTO and protected admin API.
- [ ] P5.3 Admin navigation/list/role controls; replace admin 404 tests with authorization scenarios.
- [ ] Validation, race/browser evidence and owner manual checkpoint passed.

## Phase 6 — Final validation and independent review
- [ ] P6.1 Complete database/mail/browser security/outage scenarios and deployment/operator docs.
- [ ] P6.2 Independent security review and QA through subagents; track and commit fixes separately.
- [ ] P6.3 Full validation gate, actual evidence, spec acceptance updates; move spec only after required work is complete.
- [ ] Owner final manual acceptance passed.

## Evidence
Planning only; no implementation checks run. Record task commits and evidence here and in the run log.
