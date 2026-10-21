# Users/auth implementation

## Goal
Implement [spec](../specs/2026-10-16-users-auth-application-primitives.md) using a subagent and separate commit per task. Owner defers GitHub auth to a coming-soon button and requires a manual checkpoint after each phase.

## Resume — issue #4
Owner requested `implement issue #4` after phase 1. GitHub confirms the issue matches this spec and is open with no assignee, labels or comments; open PR search returned none. Continue phase 2 in the existing checkout/run rather than duplicate the already committed foundation. Existing explicit phased delivery instructions govern this continuation; no PR publishing or tracker comments are part of this checkpoint. Owner manual results remain unconfirmed. Phase 2 acceptance: rate-limited registration with baseline developer membership, strict password/email validation, expiring digest-only tokens and bounded SMTP delivery with generic 202 responses, real disposable database/mail tests, and full coverage. Pause for manual API testing after phase 2.

## Plan and acceptance
See [tracker](../../track.md). Deliver database foundation, registration/email, credentials, UI, administration, final review in sequence. Preserve boundaries and lazy persistence. Require meaningful 100% unit coverage, lint/typecheck/audit/build and relevant disposable PostgreSQL/mail/browser checks. Never reset developer data. Pause after phase 1 for manual testing.

## Inspection and progress
Read spec, engineering standards, compatibility contract, lessons index and Storybook lesson. DB currently has type contracts only; reuse existing HTTP/UI/DI helpers. Existing untracked `.ai/prototypes/`, `.ai/runs/2026-10-20-accounts-screen-map.md` and `lekcja-07/` are outside scope.

Created tracker before implementation. No checks or implementation claimed yet.

## Risks
Security-sensitive transactions/schema need independent review before final acceptance. Disposable email tests cannot establish production SMTP delivery. Do not implement deferred GitHub protocol or speculative abstractions.

## P1.1 — Database runtime

Parent review: diff whitespace clean, runtime/config/tests inspected. Alternate documented `npm run build --workspace @devmentor/app -- --webpack` passed production compilation, TypeScript and static generation. Default Turbopack restriction remains recorded. Task committed with this update; proceed to P1.2.

Implemented `packages/db/src/config.ts`, `runtime.ts` and exports, exact database workspace dependency pins and lockfile, and `tests/db.test.ts`. Preserved the existing `Repository` type contract and made no app changes. ORM initialization, request forks, transaction callbacks, shutdown deduplication and failure/retry are explicit; request cleanup clears its identity map and never closes the process pool. Configuration reads DATABASE_URL lazily, rejects malformed/non-PostgreSQL URLs without echoing input, disables ORM diagnostic logging and bounds the pool to 0–10. Entity registration is intentionally empty until P1.2 adds the first real schemas.

Registry verification selected mutually matching `@mikro-orm/core`, `postgresql`, `migrations`, and `cli` 7.2.5 (Node >=22.17, compatible with project >=24); no existing package was upgraded. Primary references: [quick start](https://mikro-orm.io/docs/quick-start), [transactions](https://mikro-orm.io/docs/transactions), [configuration](https://mikro-orm.io/docs/configuration). Installed 7.2.5 implementation confirms `MikroORM.init` creates metadata/managers without connecting; removed obsolete `connect:false` configuration after typecheck caught its removal in v7.

Validation: `npm run lint` and `npm run typecheck` passed. `npm run test:coverage` passed with 60 tests and 100% statements/branches/functions/lines (477/477, 356/356, 117/117, 338/338). Initial sandbox-only test attempt failed existing localhost tests with EPERM; escalated rerun passed. Real installed ORM initialization and distinct manager forks run in unit tests without any reachable DB. No disposable database/schema checks claimed yet.

`npm audit` completed with six high-severity findings rooted in existing braces/micromatch → fast-glob → Awilix/Next lint dependencies; its suggested fix changes existing dependencies and was not applied. No ORM vulnerability was reported. `npm run build` attempted both sandboxed and escalated: sandbox initially could not fetch existing Google fonts; escalation reached Turbopack but still failed worker port binding with EPERM. Parent should rerun build in its available execution context. P1.1 awaits parent review/commit; P1.2 and phase checkpoint remain unfinished.


## P1.2 — Explicit auth schema and migration

Added plural-concept `defineEntity` mappings for User/UserRole, Credential, AuthSession, ActionToken and RateLimitBucket, registered explicitly. GitHub entities remain deferred. The initial SQL migration enforces normalized unique email, bounded names, role/purpose checks, digest formats, cost >=12 bcrypt hash shape, foreign keys and rate bucket constraints. Destructive down takes ACCESS EXCLUSIVE locks on all six tables before inspecting user/operational data; failure retains schema and migration state. Static migration registration disables snapshots. CLI configuration makes existing root up/down aliases usable with process DATABASE_URL; no seeder is claimed.

`tests/integration/database.ts` runs only against the runner-owned Testcontainer, proves empty up/down, populated rollback refusal, all six tables' constraints, ORM UserRole/Credential persist/read with explicit user_id mapping, no entity/schema drift, distinct request managers and real transaction rollback. It also executes the actual root CLI down/up aliases against the disposable database. Existing home/admin-404/browser and installer checks are retained. README and compatibility inventory now describe implemented persistence and safe manual commands. Recorded the relation-column prevention lesson.

Validation: lint/typecheck passed; coverage passed 61 tests, 100% statements (511), branches (356), functions (119), lines (372), including migration methods. Sandboxed existing local-port tests failed EPERM; escalated coverage passed. `npm run build --workspace @devmentor/app -- --webpack` passed. Full integration passed with PostgreSQL, home, admin 404 and installer preservation; final CLI-inclusive rerun recorded below. Audit needed network escalation and completed with the same six existing high findings, so the overall phase gate is not fully green. No thresholds/exclusions were weakened. Default Turbopack build limitation remains from P1.1; no new default build success is claimed.

Changed files: packages/db entities/migration/config/exports/CLI config/package metadata; tests/db.test.ts, tests/integration/database.ts and run.mts; README, BACKWARD_COMPATIBILITY, lessons index, tracker and this log. Parent reviews and commits P1.2; owner manual checkpoint remains pending. No phase 2 work started.

Final CLI-inclusive `npm run test:integration` completed successfully: root db:migrate:down/db:migrate ran on Testcontainers DB, followed by browser home/admin-404 and installer preservation checks. All owned resources cleaned up. `git diff --check` passed.

Parent review completed: migration locking/data guard, explicit relation mappings, entity/schema parity, parameterized integration SQL and documentation checked. P1.2 committed with this update. Phase 1 implementation is ready for owner manual testing; the full gate remains qualified by existing audit findings and default Turbopack execution limits. No phase 2 task begins until owner feedback.

## P2.1 — Registration persistence, validation and rate limits

Added narrow RegistrationRepository.create: atomic User/developer/Credential creation, UUID and timestamps generated server-side; unique collisions return null without linking or modifying existing data. P2.2 must extend this transaction with initial verification token insertion. Added strict registerSchema via pure `@devmentor/core/validators/users` export: normalized email, trimmed bounded display name, unmodified 12–72 UTF-8-byte password, rejection of extra identity/role keys. hashPassword validates again and uses bcryptjs exact 3.0.3 with random salt/cost12. Verified version against npm and primary [bcrypt documentation](https://github.com/dcodeIO/bcrypt.js/) describing its otherwise unchecked 72-byte truncation. No existing dependencies upgraded.

RateLimitRepository consumes all sorted digest buckets within one transaction using PostgreSQL timestamp/hour and atomic upsert. Counters saturate at limit+1; rejected attempts commit rather than erase protection. RateLimitService registration10/hour/IP, email3/hour/address+20/hour/IP uses operation-separated HMAC-SHA256 with a separate injected >=32-byte secret. No raw identities reach persistence. Missing/throwing secret or storage failure maps to safe typed503; exceeded quota maps typed429 with 1–3600-second retry metadata. App must supply trusted direct IP or conservative shared identity in P2.3; no forwarded header interpretation was added. Fixed-hour windows chosen for simple shared database semantics.

Tests cover strict inputs/UTF8 boundaries, real bcrypt salts/cost/comparison, explicit persistence writes/collision/error, sorted atomic consumption and failed-closed limits. Real disposable PostgreSQL tests prove 12 simultaneous duplicate registrations create exactly one user/credential/developer, duplicate attempts preserve name/hash/roles, invalid credential rolls back identity, 30 concurrent attempts across two independent runtime pools permit exactly10 and retain count11, denied address bucket still increments IP bucket.

Validation: lint and typecheck passed. Elevated full coverage passed66 tests, 100% statements558/558, branches374/374, functions135/135, lines412/412. Sandbox coverage first failed existing local-port tests with EPERM, elevated rerun passed. Default build reproduced existing Turbopack worker-port EPERM; production Webpack alternate passed. Elevated npm audit completed with the same six existing high findings (no bcrypt advisory); install summary's four is superseded by full audit. Full disposable integration pending final completion below. No source thresholds/ignore rules changed; no routes or registration service added.

P2.1 full `npm run test:integration` passed: disposable database race/rollback tests, home/admin404 browser flows, installer preservation and cleanup. No developer Compose data touched. Parent review/commit pending; P2.2 not started by this subagent.

Parent reviewed P2.1 production code, unit assertions and disposable race checks; `git diff --check` passed. Task committed with this update. Proceed to P2.2; no manual phase result inferred.
