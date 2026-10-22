# Users/auth implementation

## Goal
Implement [spec](../specs/2026-10-16-users-auth-application-primitives.md) using a subagent and separate commit per task. Owner defers GitHub auth to a coming-soon button and requires a manual checkpoint after each phase.

## Phase 3 resume
Owner explicitly requested continuation through phase 3, using a subagent and commit for each task, then pausing for manual testing. Preserve earlier unknown manual results. Plan: P3.1 verification request/confirm and race/replay safety; P3.2 verified bcrypt login, pinned JWT/session cookies, current multi-role principal and coordinated helper migration, logout/session endpoints; P3.3 recovery and atomic reset/session revocation. Acceptance includes strict bounded/CSRF/no-store HTTP contracts, failed-closed configuration/storage, disposable PostgreSQL/SMTP/production HTTP concurrency evidence, meaningful 100% coverage and required checks. UI and admin remain future phases. Existing audit advisories/default Turbopack environment restriction must be reported if still present. Each task gets parent review before its commit; independent scoped review before the phase checkpoint supplements later full-feature review.

Parent P3.1 review (resumed 2026-10-22): inspected transactional conditional token update, user locking, pure schema exports and actual full integration output; diff whitespace clean. Scoped independent review had no findings. P3.1 committed as `f43fb18`; proceed to P3.2. Prior manual test outcomes remain unknown.

Parent P3.2 completion (2026-10-22): final Webpack production build passed after the actual-empty-stream correction. Full integration against that final build passed (owned process session 65979): PostgreSQL migration/verification/session/rate races, authenticated SMTP, production HTTP verification/login/session/current-role/tamper/logout/strict-body/quota checks, browser home/admin404, installer preservation and complete fixture cleanup. Lint/typecheck and 93 tests with 100% statements/branches/functions/lines passed after the correction. Independent scoped review found no concrete session defect; the parent production probe identified bodyless logout400, now covered by nonnull-empty-stream and real HTTP regressions. Diff whitespace clean; P3.2 committed as `2c716d4`. Default Turbopack worker-port EPERM remains; latest audit has six high and five moderate findings in existing tooling (jose not affected). No CI or overall auth security sign-off claimed. Proceed to P3.3 only; manual phase checkpoint follows it.

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

## P2.2 — Registration orchestration and bounded SMTP delivery

Added RegistrationService with strict boundary validation and explicit field errors,
registration/email limits before hashing or persistence, bcrypt credentials, a cryptographic
32-byte base64url token and SHA-256 digest with 24-hour expiry. RegistrationRepository
now atomically writes the initial verification token with the identity/credential/developer
membership. Duplicate identities preserve existing data and return the same public result.
Storage failures become typed safe 503. Fixed SMTP configuration is validated before
persistence and evaluated lazily, independent of health/build.

EmailSender port has explicit verification/password-reset message types; SmtpEmailSender
uses exact Nodemailer 10.1.7 and its documented [SMTPConnection API](https://nodemailer.com/extras/smtp-connection).
Version verified through npm, with official [SMTP configuration](https://nodemailer.com/smtp)
and installed maintained implementation checked for close/deadline behavior. SMTP server
sink is exact smtp-server3.20.2, used only in tests. Production uses authenticated verified
TLS and HTTPS fixed APP_ORIGIN; explicit plaintext sink policy requires development/test
and IP literal loopback. Sender/origin never come from Host headers. A single ten-second
overall deadline owns and closes the SMTP connection across DNS/connect/auth/send; late
connect/auth callbacks cannot continue after settlement. All timer paths clear their timer.
No SMTP protocol debugging, raw credentials, recipients or tokens are logged.

Persisted tokens precede awaited send. On failure, fixed delivery_failed event is recorded
and invalidation locks User then conditionally consumes only the issued active digest.
A replacement remains valid. If invalidation storage itself fails, generic public success
still holds and a fixed invalidation_failed event records the limitation: simultaneous
DB outage prevents guaranteed immediate revocation. No automatic retry or outbox introduced.
Same-account resend remains P3.1; the integration recovery assertion is a subsequent
new registration after SMTP returns, not same-account resend.

Unit assertions cover strict/privilege validation, safe config/storage failures, ordering,
crypto digest/TTL, generic duplicate/delivery responses, fixed diagnostics, conditional
locked invalidation, production TLS/auth, hostile recipient/token input, every SMTP error
and timeout phase, and late callbacks after timeout. Real disposable Postgres+loopback SMTP
proves fragment token matches stored digest, delivery failure consumes token, a subsequent
send succeeds, stale invalidation preserves replacement, and stalled DATA is actively
bounded. Required-token fixture now uses a distinct digest for invalid-credential rollback
so its assertion reaches the credential constraint rather than a token unique collision.

Validation final: lint and typecheck passed. Elevated coverage passed74 tests with100%
statements647/647, branches428/428, functions153/153, lines488/488. Webpack production build
passed; existing default Turbopack worker-port restriction remains documented. Full elevated
integration passed PostgreSQL/SMTP plus home/admin404 browser and installer preservation,
with cleanup. npm audit reports the same six existing high findings; no unrelated fix
applied. git diff --check passed. README/.env.example document actual config and limitations.
P2.2 awaits parent review/commit. No routes or DI are added until P2.3; owner phase2 manual
checkpoint remains pending.

Parent reviewed service/repository atomicity, fixed diagnostics, SMTP timeout guards and disposable SMTP evidence. Task committed with this update; proceed to P2.3.

## P2.3 — Registration HTTP and scoped composition

Read repository rules, lessons, users/auth spec and installed Next16.4 route-handler documentation before editing app wiring. Added typed scoped registrations for existing repository/service/SMTP dependencies; configuration and shared ORM remain lazy. Added actual-stream4096-byte JSON bound and CSRF-before-scope registration handler. Response metadata extends existing apiHandler with optional per-result202/headers/multiple cookies, while preserving JSON error envelopes, no-store and bounded typed429 Retry-After. Forwarded address headers are ignored: Next exposes no trusted peer, so registration uses a documented shared conservative10/hour bucket.

Independent scoped review caught SMTP timing enumeration despite generic bodies. Corrected admitted success paths to share a15-second completion window (10-second SMTP deadline plus5-second cleanup budget), beginning after validation/config/rate admission. Token invalidation sets transaction-local1-second lock/statement timeouts. New, duplicate, failed/stalled delivery and storage-overrun unit cases cover this policy; database outages may exceed the window, and no cryptographic constant-time claim is made. This latency tradeoff is explicit in README. The scoped review does not replace phase6 whole-feature security/QA sign-off.

Changed core composition/HTTP/email policy/registration service, registration route, narrowly bounded invalidation repository, tests and documentation. Production integration fixture creates a short-lived IP-SAN certificate, authenticates STARTTLS and supplies its CA only to the owned app child; development sink exception is unchanged. All databases/mail/processes belong to the runner; no Compose data is reset.

Validation so far: lint/typecheck passed;81 unit tests passed100% statements701/701, branches448/448, functions164/164, lines532/532. Final Webpack production build passed. Default Turbopack build fails at worker-port EPERM as previously recorded. Audit successfully queried registry and reports the same six existing high findings. Full disposable integration is running; do not mark it passed yet. Manual phase2 checkpoint remains pending.

Production integration first exposed Next16.4 canonicalizing Request.url to localhost even with127.0.0.1 binding. Reproduced in a short owned production process: origin127 received403 while originlocalhost reached validation400. Extended requireCsrf with an optional validated fixed origin; registration passes lazy server APP_ORIGIN, and existing callers preserve prior defaults. Invalid/credential/path/query/hash/nonHTTP(S) override fails closed503. Independent reviewer rechecked this compatibility correction with no concrete regression; this is a scoped review, not phase6 sign-off. Updated final unit evidence:82 tests100%, statements709/709, branches458/458, functions164/164, lines538/538. Lint/typecheck and final Webpack build pass; default TurbopackEPERM remains. Full integration rerun is pending.

P2.3 final validation: full disposable integration passed after the configured-origin correction: real production HTTP202, duplicate/delivery-failure generic results, strict fields/forged roles, CSRF, bcrypt12/digest/developer persistence, no session, invalidated failed-delivery token and forwarding-spoof-resistant429; authenticated STARTTLS used a child-only trusted temporary certificate. Existing database/migration races, SMTP deadline, browser home/admin404 and installer data-preservation checks all passed, and fixture cleanup completed. Final lint/typecheck/82-test100%coverage/Webpack build passed; six existing high audit findings and default TurbopackEPERM are the documented limits. No GitHub CI result is claimed. Missingconfiguration503 and typed storage-failure behavior are covered by unit/service tests; the production HTTP fixture uses functioning storage/mail rather than claiming a real database-outage test. Parent review/commit remains required; owner manual phase2 checkpoint remains pending. Stop before phase3.

Parent review completed: production changes, test assertions, configured-origin compatibility, scoped review corrections and actual final integration output inspected; diff whitespace clean. P2.3 committed with this update. Phase 2 implementation pauses for owner manual API testing using README instructions. Issue #4 remains in progress; verification consumption/login/recovery, UI, administration and full-feature review remain unfinished. No owner acceptance or clean audit/default-build gate is inferred.


## P3.1 — Verification request and confirmation (resumed 2026-10-22)

Implemented by the task subagent after reading the auth spec, engineering standards,
lessons and installed Next route-handler documentation. Added narrow verification
repository operations, strict pure request/confirm schemas exposed through the existing
users validator package export, explicit scoped DI and CSRF-protected no-store POST
routes. Resends share the existing email HMAC quotas and 15-second public completion
window; no account existence is disclosed by the success body. Configuration/storage
failures deny safely. Tokens persist as SHA-256 digests, expire after 24 hours and never
supply identity data. User locks serialize replacement, conditional delivery cleanup
and conditional atomic consumption/email verification; no session is issued here.

Changed files: verification repository/db export; users verification service/schemas
and pure validator barrel/package export; cradle/container; request and confirm routes;
verification unit tests; disposable verification database tests, existing authenticated
SMTP/production HTTP fixture and centralized timing assertion setting; README and tracker.

Evidence: lint, typecheck and 87 unit tests passed. Final coverage is 100% statements
791/791, branches 478/478, functions 184/184 and lines 602/602. Full disposable integration
passed: token replacement, eight-way replay, six issuer/consumer races with persisted
state assertions, wrong purpose/expiry, conditional stale delivery cleanup; production
HTTP proved same-account failed-email resend recovery, no token for unknown/verified/
credentialless users, generic responses and timing, CSRF, POST-only consumption and
concurrent replay. Existing registration, PostgreSQL migrations, SMTP, browser home/admin
404 and installer preservation scenarios passed; owned fixtures were cleaned up. Initial
sandbox port restrictions required rerunning coverage and integration with escalation.
No developer Compose data was reset. Export-only follow-up reran lint/typecheck/coverage
and Webpack build; integration was not repeated for the pure re-export change.

Default Turbopack build still fails with the known worker-port EPERM restriction;
production Webpack build passed again after the pure validator export follow-up. Registry audit reports the same six existing high findings; no dependency
change or clean audit claim. Independent phase3_review scoped source/test review reported
no concrete P3.1 findings; this is not phase 6 full-feature security/QA sign-off and it did
not run validation gates. README supplies manual resend/confirm commands; owner phase 3
checkpoint waits until P3.2/P3.3 are complete. Parent review completed; P3.1 committed as `f43fb18`.

### P3.2 — Credentials login and sessions (2026-10-22)

Task subagent implemented explicit SessionRepository/SessionService/SessionJwt,
strict pure login/logout schemas, request-scoped DI, app-owned session-cookie
transport and dynamic login/logout/session HTTP routes. Exact-pinned jose6.2.13
was verified against npm and the primary panva/jose documentation; no existing
dependency upgrades. HS256, issuer/audience, UUID subject/session ID, required
iat/exp and absolute24-hour lifetime are pinned; roles never enter JWT claims.
The public principal contains only id/displayName/roles. Unknown and credentialless
accounts perform a fixed cost12 bcrypt comparison; unverified/wrong credentials
return generic401. Login uses PostgreSQL operation-separated HMAC buckets for
five attempts/email-IP pair and50/IP over900 seconds, retaining all counters;
existing email/registration default3600-second windows remain. Forwarded IP
headers are ignored in favor of the conservative shared peer bucket.

Session creation locks User and rereads the current Credential/hash/verified flag
before persisting AuthSession. P3.3 must take the same User write lock while
replacing credentials and revoking all AuthSession rows atomically. Session reads
verify signed JWT then current unrevoked/unexpired session, verified User and
current memberships. No cross-request cache. Logout revokes and expires cookies,
accepting bodyless POST or strict empty JSON only. Cookie deletion matches
HttpOnly/SameSite=Lax/Path=/ and production Secure/__Host- naming, no Domain.
Shared Session consumers migrated atomically from optional singular role to
required readonly developer/mentor/administrator roles. Legacy requireSession
retains401-on-resolver-error; concrete session lookup exposes safe503 outages.

Changed areas: core session/credential auth service, JWT helper, pure validators,
typed DI and HTTP authorization; db session repository and rate-window support;
app login/logout/session routes and cookie helper; unit/integration tests;
README, environment example, compatibility contract and this tracker/run.
Health/build remain database/secret-independent, admin remains404, GitHub/UI and
password recovery remain outside P3.2.

Validation: lint/typecheck passed; final93 unit tests passed with100% all four metrics
(924 statements,568 branches,223 functions,702 lines) after the actual-empty-stream correction.
Unit evidence covers real cryptographic verification, malformed/oversized/tampered
claims, algorithm/issuer/audience/UUID/time requirements, dummy bcrypt comparison,
repository lock/hash checks, cookie transport, quotas, DI and role arrays. Earlier
full disposable integration passed DB/session/SMTP/HTTP/browser/installer flows.
Final-source Webpack build and parent final full integration passed, including
the added pg_blocking_pids race proof,50/IP concurrent quota and production
bodyless/strict logout scenarios. Default
Turbopack build failed with the known worker-port EPERM. npm audit reports six
high and five moderate findings in existing tooling (moderate Vitest chain);
jose is unaffected. No CI or clean audit claim. Independent scoped source review
reported no concrete issue; phase6 whole-feature security/QA remains required.

Outcome: P3.2 complete and parent-reviewed, committed as `2c716d4`.
Continue with P3.3; pause after phase3 for manual tests.

P3.2 final integration correction: production Next represented a bodyless logout
POST as a nonnull empty stream, causing the strict content-type check to return400.
The parent confirmed this with a focused no-cookie/no-database production probe.
`readJsonBody` now has an explicit optional-empty mode used only by logout: read
bounded actual bytes, accept zero bytes, and require JSON for nonempty bytes. Its
default behavior stays strict, and Content-Length is never trusted. Unit regression
covers nonnull empty streams, absent bodies, nonJSON/malformed/oversized content
and forged zero lengths; HTTP assertions now name the logout behavior. Lint and
typecheck passed;93 tests passed with100% all four metrics (924 statements,
568 branches,223 functions,702 lines). The initial production failure was corrected;
parent rebuilt and the final production integration rerun passed before commit `2c716d4`.


### P3.3 — Password recovery (2026-10-22)

Resumed the original run for phase 3 only. Goal: generic forgot-password delivery,
existing-credential-only reset, atomic token consumption/password replacement and
all-session revocation, with observed reset/login race coverage. Acceptance follows
[the auth spec](../specs/2026-10-16-users-auth-application-primitives.md); phase 4
screens, GitHub and administration remain pending.

Plan executed: read repository lessons/spec/installed Next route documentation;
add narrow PasswordRecoveryRepository and PasswordRecoveryService, strict pure
schemas, explicit scoped DI and force-dynamic CSRF/no-store API routes; prove
meaningful unit behavior and add disposable database/SMTP/production HTTP tests;
document the complete manual API checkpoint; hand final build/integration to the
parent before the per-task commit and phase pause.

Forgot normalizes a strict email input, consumes the shared HMAC email quotas
before lookup, requires configured SMTP/fixed app origin and emits a generic202
in the same15-second delivery window for unknown, credentialless, delivered and
SMTP-failure outcomes. A random32-byte token has a30-minute expiry; persistence
contains only SHA-256 digest. User-locked issuance replaces older reset tokens.
Bounded SMTP failure cleanup locks User with one-second statement/lock limits and
invalidates only the issued digest. Fixed logs contain no address/token/raw error.
Storage failures deny with503; infrastructure outage timing is not concealed.

Reset prechecks a persisted active reset token and existing credential before
bcrypt; it reuses the cost12/UTF8 policy helper. Its transaction locks the same User
as session creation, requires the existing credential, conditionally consumes the
current unexpired token and updates Credential/passwordChangedAt, User/updatedAt
and all unrevoked AuthSessions atomically. Email verification remains unchanged;
no credential creation or auto-login/cookie. Parallel replay has at most one effect.

Changed files: core recovery service and pure validator/barrel; typed container;
db recovery repository/barrel; two app password routes; recovery unit tests;
disposable recovery DB tests/database runner; authenticated STARTTLS HTTP fixture;
README, tracker and this run. Parent early review requested shared hash helper and
allowlisted field feedback; both were applied before final checks. Scoped independent
phase3_review source review reported no concrete findings; it did not execute gates
and does not replace phase6 whole-feature security review/QA.

Final validation: lint and typecheck pass;99 unit tests pass with100% statements
(1021), branches(595), functions(247) and lines(784). Initial sandbox coverage run
failed only when setup tests bound localhost; escalated plain-command rerun passed.
No coverage exclusions/ignore directives/threshold changes. Disposable DB tests
include replacement/replay/expiry/purpose, credential removal, unverified reset,
all-session revocation and both actual reset/login repository race orders. Each
race asserts pg_blocking_pids before releasing User lock, then checks new credential
and no usable/unrevoked old-password session. HTTP scenarios include timed generic
unknown/credentialless/SMTP failure, same-account retry, fixed-origin TLS fragment,
digest/TTL, strict fields/CSRF, reset, denied old cookie/password, successful new
password, no auto-login, replay and expiry/purpose. These new integration assertions
passed in the parent final full integration run (exit0). Existing
registration/browser/admin404/installer assertions remain. Only runner-owned test
rate buckets are cleared between independent scenarios; developer Compose data
is untouched. Final parent Webpack production build passed (exit0), followed by full
`npm run test:integration` (exit0): actual PostgreSQL reset/login races, secure
SMTP/recovery HTTP, browser/home/admin404, installer preservation and owned fixture
cleanup. Default `npm run build` still fails with Turbopack worker-port EPERM.
`npm audit --json` reports six high and five moderate existing-toolchain findings.
No CI/clean audit or overall gate claim. Parent review completed; per-task commit
is next. No phase4 source was added.

README now gives the whole phase3 register/mailtoken/confirm/login-cookie/session/
forgot/reset/old-cookie+password-denial/new-login/replay sequence. Owner manual
checkpoint remains unconfirmed. Stop before phase4 after parent commit/manual handoff.


Final parent handoff: removed one consecutive duplicate test-only AuthSession cleanup
statement identified during final diff review; retained the required final cleanup
before User deletion. Typecheck and diff whitespace check passed afterward. The full
integration pass above preceded this redundant-statement removal; no production code
changed and the full suite was not repeated for this cleanup. P3.3 tracker is complete;
parent commit follows. Manual/full audit gates remain unchecked and phase4 is untouched.
