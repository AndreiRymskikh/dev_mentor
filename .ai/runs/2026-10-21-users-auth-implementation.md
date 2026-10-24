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
committed as `0e13a07`. Manual/full audit gates remain unchecked; phase4 follows below.

## P4.1 — Authentication entry forms (2026-10-22)

Owner authorized phase 4 with a subagent and commit per task, followed by a manual
UI checkpoint. GitHub remains an enabled coming-soon feedback button; no OAuth,
admin or role mutations are introduced. Read AGENTS, lessons, both active specs,
existing forms/integration harness and installed Next client/router documentation.

Plan: extract only CrudForm's reusable validation/pending/errors lifecycle into
`ui/backend/forms/useFormState`, preserving existing CRUD controls and shortcuts;
compose app-local registration/login/recovery with existing FormField/Input/Button/
Link and pure core schemas; verify interactions/100% coverage and actual disposable
SMTP/database/browser submissions; hand parent final build/integration before commit.

Added auth route group frame and scoped presentation using existing token/control
styles. Home source and assets remain intact. Inputs have visible linked labels,
password-manager autocomplete, required indicators, safe field feedback and first
invalid field focus. Duplicate submits share a synchronous in-flight guard; keyboard
Cmd/Ctrl+Enter works. Generic registration/recovery messages clear before validation
on each attempt, and registration/login offer verification retry navigation. Login
maps generic denial to email/password/verification guidance and uses fixed `/account`
navigation. GitHub only announces that sign-in will be implemented soon. Server/rate/
network errors remain visible; no arbitrary return URL or browser credential storage.

Unit assertions cover schema normalization/field failures/focus, actual CSRF helper,
pending duplicate prevention, generic success/stale feedback, all page composition,
GitHub no-request feedback, server/root/rate/network errors and fixed navigation.
Existing CRUD number/checkbox/root-validation/keyboard/error tests exercise the
extracted hook without changing their API. Full elevated coverage initially passed
103 tests with100% statements1059/branches633/functions263/lines810, before the final
small generic unauthorized feedback mapping; final revalidation follows below.
Lint/typecheck passed on initial source. Parent owns final build/audit/integration;
these checks and owner manual acceptance are not claimed as passed here.

Integration adds one owned HTTPS reverse proxy using the existing SMTP fixture's
short-lived IP-SAN certificate, passing bytes/cookies/headers to the same production
app. APP_ORIGIN is the actual HTTPS public address; browser certificate bypass is
fixture-only. Raw HTTP API assertions use this fixed configured origin and assert
matching mail link origins. Native browser requests exercise genuine CSRF Origin
and Secure cookies; production policy is unchanged. Browser cases cover generic
registration, SMTP/developer/unverified persistence, denied unverified login,
fixture verification then real login and authenticated session response, generic
recovery mail and quota feedback. Only runner-owned quotas are reset. Screenshot
failure capture and browser/app/proxy/SMTP/container cleanup remain explicit.

P4.1 final task-subagent checks: lint and typecheck passed;103 unit tests pass at
100% statements1061/1061, branches637/637, functions263/263 and lines812/812 after
frontend generic-denial mapping. No thresholds/exclusions changed. The initial
non-elevated run hit existing localhost EPERM tests and one SSR attribute-case
assertion; the corrected elevated full suite passed. Pinned CLI help confirms
standard wait operations use AGENT_BROWSER_DEFAULT_TIMEOUT, set from centralized
integration config (download-only --timeout flag is not used for text/URL waits).
Parent build/integration and task commit are still pending.

P4.1 production rendering correction: the first parent Webpack build/full integration
passed behavioral assertions, but visual screenshot review showed uncompiled Tailwind
utilities: an unbounded card and missing field spacing. That fallback pipeline had
emitted literal @utility/@apply because only a Turbopack-specific loader was configured.
Following installed Next16.4 CSS documentation, added exact @tailwindcss/postcss4.3.3
matching existing Tailwind4.3.3, one app-local PostCSS configuration, and removed the
manual Turbopack transform to avoid dual compilation. No existing dependency upgrade;
installation reports the unchanged six high/five moderate findings. The default
Turbopack build now passes in the parent run after this correction; the earlier EPERM
history is not the current build status. Parent is checking Webpack and full rendered
integration again before acceptance.

A meaningful pipeline unit regression compiles actual global/auth styles with the
configured plugin and asserts generated grid/card bounds and visible control focus,
with no remaining @apply/@utility. Final coverage passes104 tests with100% all four
metrics (1061 statements,637 branches,263 functions,812 lines). Browser assertions
now inspect desktop card bounds/grid/gaps, native Tab focus outline and320px absence
of horizontal overflow, saving desktop/mobile screenshots for parent inspection.
Lint/typecheck are being rerun; parent final integration and per-task commit pending.

P4.1 final follow-up: parent verified both default Turbopack and Webpack production
builds pass and inspected emitted CSS for actual grid/card bounds and expanded focus,
with no @apply/@utility. Final full integration is running against that Webpack
artifact. Renamed the data-identical PostCSS default literal to a named config export
to clear the lint warning; final lint is warning-free and the focused actual CSS
pipeline regression passes afterward. The full104-test coverage result above precedes
this export-style-only change; no TypeScript behavior changed. Parent integration
and manual desktop/mobile screenshot inspection remain pending at this point.


P4.1 final outcome: parent final full integration exited0 with actual PostgreSQL,
SMTP, production HTTP, native HTTPS browser and installer preservation/cleanup.
Computed desktop bounds/grid/gaps and native keyboard focus assertions passed,
as did320px no-overflow checks. Parent visually inspected desktop/mobile screenshots
and confirmed usable card width, spacing, wrapping and visible focus. Both default
Turbopack and Webpack production builds pass after the shared PostCSS correction;
audit remains six high/five moderate existing-toolchain findings. Final warning-free
lint, typecheck and104-test100%coverage evidence are recorded above. The export-only
config naming follow-up had its focused CSS regression and lint rerun; integration
used semantically identical configuration. No CI, clean audit or owner manual
acceptance is claimed. Parent reviewed P4.1; committed with this update. P4.2 remains
pending and follows on its own subagent/task commit; pause after phase4 for the
owner's manual UI checkpoint. Prior P3.3 commit is `0e13a07`.


## P4.2 — Fragment actions and protected account screens (2026-10-22)

Goal: complete the phase4 UI using the phase3 auth APIs, without GitHub OAuth or
phase5 role/admin actions. Implemented app-local verification/reset pages and a
memory-only token hook: capture fragment once, strip query/hash synchronously to a
fixed canonical path while preserving Next history state, reject duplicate/extra/
malformed/missing fragment fields, and fail closed if history removal fails.
Validated token publication uses one microtask after browser synchronization to
respect installed React lint rules; StrictMode effect replay does not lose it.
No token is rendered in hidden fields, errors or DOM, or stored in browser storage.
Verification requires an explicit button POST; reset requires explicit new-password
submission through the pure shared schema. Missing/used links expose retry paths,
verification resend remains generic, and neither success issues an automatic login.

Account uses installed Next async `headers()` with the existing raw cookie parser,
then exactly one `withScope`/`SessionService.resolve` call per page request; current
roles and display name render server-side. Duplicate cookie names are rejected:
parent found that installed Next `RequestCookies.getAll(name)` already collapses
raw duplicates, so the initial async-cookie approach was corrected before testing.
A storage failure displays safe same-path retry; absent/invalid sessions redirect
to fixed login outside the catch. Logout uses the shared pure logout schema and
API helper, blocks duplicate submissions, permits error retry and performs fixed
full navigation to login after server revocation. Sensitive pages are force-dynamic
with noindex metadata; token pages also set no-referrer. Existing self-hosted Next
fonts are retained, with no new third-party runtime resources.

Changed files: app routegroup action form/token hook/verification/reset/account/
logout pages, shared session-cookie input type, unit auth-action tests, disposable
browser action scenario and runner wiring/safe diagnostics, README, tracker,
specification and lessons. Browser tests use runner-owned HTTPS/DB/mail, actual
registration and emitted mail fragments, explicit verification/reset, no GET
consumption, token-free URL/history/DOM/storage before screenshots, no external
resources, desktop and320px no-overflow screenshots, generic resend, current roles,
reset old-session/password denial, replay/missing links, new login/account/logout.
Fixture SQL uses the real composite user_roles key. No raw action URL is retained
in browser command failure diagnostics.

Validation: lint warning-free; typecheck passed; full112-test coverage passed100%
all metrics (1134 statements,683 branches,288 functions,864 lines). Initial sandbox
coverage run failed only the existing localhost-bound setup tests; escalating the
same full command passed. Parent owns final production builds, audit and full
integration; these remain pending at this handoff. Source/test freeze declared to
parent; only metadata updated afterward. README contains the full phase4 manual UI
checkpoint, still unchecked. Spec remains in progress and unmoved. No CI, owner
manual acceptance or whole-feature security sign-off is claimed.


P4.2 parent checkpoint: default production Turbopack build passed with all three
new sensitive pages rendered dynamically. Scoped independent source review found
no concrete issue; this is not the phase6 whole-feature review. Audit remains six
high and five moderate existing-toolchain findings. Parent full disposable
integration is running against the final Turbopack artifact; its result and manual
screenshot inspection are pending. No source changes after freeze.


P4.2 final parent validation: full integration exited0 against the final default
Turbopack production artifact. Disposable PostgreSQL, authenticated SMTP, production
HTTP, both phases' native HTTPS browser flows, installer preservation, home/admin404
and owned-resource cleanup passed. Verification/reset tests proved canonical URL/
history/token privacy, no GET consumption, explicit action/replay/missing-link paths,
generic resend, current role display, old-password/session denial, new login and
logout. Parent inspected all six verification/reset/account desktop and320px
screenshots: clean layout, usable wrapping, no visual issues or token echo.
Final audit remains six high/five moderate existing-toolchain findings. Lint,
typecheck,112-test100% coverage and default production build results above are final.
Scoped independent review found no concrete issue; phase6 whole-feature security
review and GitHub CI have not run. P4.1 is `862c189`; P4.2 is reviewed and ready for
its own task commit. Phase4 implementation is complete with this commit; README
contains the manual UI checkpoint. Owner manual acceptance and the combined audit/
manual gates remain unchecked. Implementation pauses before phase5, with no role/
admin actions or GitHub OAuth added. Source/test freeze was preserved throughout
parent validation; final updates are metadata/documentation only.

## P5.1 — Role mutations and first administrator (2026-10-22)

Owner authorized phase5 only, a subagent and local commit per task, then a manual
checkpoint. Read AGENTS, lessons, auth/engineering specs, original tracker/run and
installed Next route docs before editing. Plan: narrow role persistence and pure
strict schemas/service, scoped DI and authenticated mentor route, UUID-only operator
bootstrap, meaningful unit coverage and disposable PostgreSQL/HTTP/CLI races.

All admin writers acquire one constant parameterized PostgreSQL transaction advisory
lock before locking actor/target User rows in UUID order. They reread verified actor
and current administrator membership inside the transaction. Mentor self-enrollment
locks its User and requires verified developer. Role changes preserve developer and
fail closed on a missing baseline. Bootstrap needs an existing verified developer,
is idempotent for that already-admin user and refuses another user once initialized.
The parent approved preserving the last VERIFIED administrator as the usable-admin
safety interpretation: unverified grants remain allowed, but cannot replace the last
account able to sign in. The count uses a fixed parameterized SQL join, because
installed MikroORM's mapToPk relation deliberately has scalar filter types.

Parent review identified uppercase valid UUID comparison against canonical database
UUIDs; the pure UUID schema normalizes lowercase and services pass parsed values.
Distinct conflict feedback explains last-verified-admin versus already-initialized
bootstrap. No arbitrary role management, UI/admin page, GitHub auth or dependency
upgrade is included. No developer database/accounts/env files were mutated.

Changed areas: db RolesRepository/export, core RolesService/pure schemas/scoped DI,
mentor POST route, injected operator runner and executable root command, unit tests,
disposable database/HTTP test harness, README/tracker/spec. Operator entry is explicitly
included in production coverage and process-boundary unit tests; no exclusions or
threshold changes. It always closes its pool and emits fixed safe cleanup feedback.

Actual subagent verification: lint and typecheck passed;117 unit tests passed100%
statements1248, branches751, functions315 and lines937. Initial sandbox full coverage
failed only existing localhost setup tests; elevated rerun passed. Final test-only
HTTP/config additions receive lint/typecheck rerun below. Parent owns final build,
audit and complete integration, not yet claimed. Disposable tests written include
real CLI success/idempotence/refusals, observed pg_blocking_pids bootstrap/actor
revocation blocking, parallel self-demotions, unverified usable-admin edge, current
session memberships and actual mentor HTTP auth/CSRF/strict/idempotence assertions.
Source/tests frozen for parent validation; only documentation/metadata follows.
Owner manual acceptance remains unconfirmed; phase6 remains open.

P5.1 final source/test lint and typecheck reruns passed after HTTP/config additions;
git diff whitespace check passed. Parent default production build passed with lazy
new route compilation; audit remains six high/five moderate existing tooling
findings. Parent disposable PostgreSQL stage passed the actual role/CLI/race tests,
including the fixed SQL verified-admin count and observed bootstrap/revocation
blocking. Full production HTTP/browser/installer suite is still running; no full
integration pass is claimed yet. Prior P4.2 is `3263a1d`; manual registration
acceptance feedback is `734c6e0`. No earlier owner gate was inferred passed.

P5.1 final parent handoff (2026-10-23): full disposable integration completed exit0
(session50873), including actual role PostgreSQL/CLI concurrency assertions, mentor
HTTP authentication/CSRF/strict-input/idempotence, existing production HTTP/email,
native HTTPS browser flows, installer preservation and owned-resource cleanup.
Default production build56545 passed; audit41076 remains six high/five moderate
existing-tooling findings. Lint/typecheck and117 tests at100% all four metrics
are recorded above. No source/tests changed after freeze; final updates are
metadata only. P5.1 is complete and checked in track.md, ready for the parent's
separate task commit before P5.2. No CI, clean audit or owner manual acceptance
is claimed; earlier manual gates remain unchecked. Phase5 still pauses only
after P5.2/P5.3 and final phase checks; phase6 remains pending.


### P5.2 bounded administration API (2026-10-23)

Task subagent implemented strict pure page/pageSize/q validation, a narrow
AdminUsersRepository and AdminUsersService, explicitly scoped DI and protected
GET users/PUT desired roles routes. The listing transaction takes a shared actor
User lock and rechecks verified administrator membership before querying. Fixed
parameterized strpos expressions treat wildcard characters literally. Stable
createdAt/id ordering and explicitly projected DTOs exclude credentials/tokens.
DTO type-only exports through the pure validator entry do not introduce browser
runtime persistence imports. Authentication/role checks precede query parsing,
body parsing and async route parameter resolution; PUT also checks CSRF.

Actual subagent lint/typecheck passed;120 unit tests passed100% statements1303,
branches776, functions331 and lines977. Initial sandbox coverage failed only the
existing localhost ownership/probe harness; elevated full rerun passed. Added real
production HTTP/disposable PostgreSQL assertions cover literal search, tie-order
pagination, empty/past-end results, strict query/body input, DTO exact keys,
authentication ordering, existing-cookie grants/revocations, CSRF and last-admin
409. The fixture deletes only its own seeded users/sessions/roles in finally.
Full build/integration/audit remain parent-owned and unclaimed here. Source/tests
are frozen for parent validation. P5.2 awaits parent review/commit; P5.3 and owner
manual acceptance remain pending. P5.1 commit is `ab3b3b1`; phase6 remains open.


P5.2 parent validation found an actual search defect: first full HTTP suite failed
503 versus200. An owned PostgreSQL probe showed empty search worked while plain
and literal search failed SyntaxErrorException SQLSTATE42601 near `=`. The raw
predicate included `>0` and MikroORM appended equality. Corrected to numeric
parameterized strpos with ORM `$gt:0`. Added actual repository checks to the early
disposable database stage for stable ties, exact DTO keys, literal wildcards,
email match, empty/past-end lists and persisted authorization. Parent build17048
passed; suite91224 passed all database checks including the new regression, then
failed an older login quota HTTP assertion (200 versus429). Earlier attempts were
separated by slow mail flows and could cross a15-minute bucket. The fixture now
seeds its own HMAC pair at5 in both current/next DB-time windows and asserts denied
spoofed-IP request429; real count/concurrency limits remain independently tested.
Temporary focused probe removed; no developer database accessed. Durable prevention
lessons recorded. All production/integration source frozen again.

Latest subagent lint12377 and typecheck53505 passed. Sandbox coverage13141 failed
only existing localhost ownership/probe tests with EPERM; new source had full
coverage. Earlier elevated120-test100% result preceded the numeric correction;
parent owns final elevated coverage/build/full suite. No final integration pass
is claimed yet. New audit is12 findings:1critical Next16.4.0,6high,5moderate; first
build stopped for the new security notice, retry17048 passed with warning.
Owner approved separate Next patch task S1 after P5.3 and before manual handoff;
no dependency changes belong to P5.2. Earlier manual/CI/audit gates remain open.


Parent elevated coverage56339 exposed a pre-existing JWT boundary test race:
future iat was wall-clock now+1, which could become current during parallel coverage.
The JWT claim validation test now freezes Date only at a fixed timestamp and restores
real timers/environment in finally, keeping jose microtasks real. Production JWT
rules are unchanged. Parent owns final coverage rerun; latest120-test pass is not
claimed for that failed run. Integration41196 continues on frozen integration source.


P5.2 final-source parent elevated coverage83211 passed120 tests at100% statements
1303, branches776, functions331 and lines977 after the deterministic Date test fix.
Lint/typecheck and whitespace checks passed. Parent integration41196 passed all
owned database checks, the new admin production HTTP scenarios and auth browser
flows; installer/cleanup are still running, so complete integration is not yet
claimed. No source changes occurred during parent integration.


P5.2 final parent handoff: integration41196 ended exit1 and cleaned owned resources.
All application database, production admin HTTP and authentication browser stages
passed. Actual remaining failure was installer reuse: rerun stdout did not match
“Development: skipped; reusing”; it showed dependencies skipped, environment
preserved, PostgreSQL healthy and a new “Development: ready at” server. The earlier
homepage-fetch hang hypothesis was not proven. No installer source change is made;
root cause remains pending final phase validation after owner-approved S1 patch.
P5.2 relevant API checks, build17048, lint/typecheck and elevated coverage83211
(120 tests100%1303/776/331/977) are complete. Task is marked done and ready for its
separate parent commit; full phase gate is still open, with a dedicated installer
fix if needed after S1. CI/clean audit/owner manual acceptance are not claimed.


P5.3 source and tests prepared on 2026-10-23: protected per-page administrator
authorization with raw duplicate-rejecting cookies and direct scoped service reads;
account mentor enrollment/current-role navigation; bounded search/pagination and
explicit role controls using existing UI. Client requests abort superseded queries
and reject stale responses; access changes invalidate pending requests and clear
private DOM, including delayed-list/self-demotion races. GitHub remains coming-soon.
128 unit tests passed at100% statements/branches/functions/lines. Parent build,
HTTPS browser/disposable PostgreSQL integration and screenshot review are pending;
owner acceptance remains unchecked. Dependencies are unchanged; owner-approved S1
Next security patch is a separate task after this commit. No phase6 completion.

P5.3 parent browser validation found and corrected a narrow-screen table defect:
columns now retain readable minimum widths inside horizontal table scrolling;
computed checks require document no-overflow and actual table-wrapper scrolling.
Targeted admin run70444 reached self-demotion denial but initially failed because
body.textContent included already-delivered framework hydration scripts. The
assertion now checks visible innerText plus table removal; application authorization
and delayed-response invalidation remain unchanged. Targeted and full reruns are
pending; no validation pass or owner acceptance is inferred from the failure.


P5.3 completed by its task subagent and parent-reviewed on 2026-10-23. Final
lint/typecheck passed;128 unit tests passed at100% all four coverage metrics
(1412 statements/830 branches/360 functions/1041 lines). Parent default production
build39975 and targeted disposable PostgreSQL/HTTPS/admin-browser run61794 passed
(exit0), including permissions, real role changes, search/paging, last-admin
protection, self-demotion, revoked sessions and owned-resource cleanup. Parent
inspected final desktop/320px screenshots: readable columns, contained horizontal
table scrolling and no document overflow. Bounded independent source review found
no additional concrete issue; this is not phase6 whole-feature/security signoff.

The full integration gate remains pending for the separately approved S1 Next
security patch. Earlier full run59176 stopped on the corrected visible-content
assertion; earlier41196 stopped on installer reuse, whose cause remains unresolved.
Targeted success does not replace the full suite. Dependencies remain unchanged
in P5.3. GitHub remains a coming-soon button. Owner manual checkpoint remains
unchecked and follows S1; no issue completion, clean audit or CI pass is claimed.


S1 implementation prepared after P5.3 commit09beae4: exact Next and matching root/app ESLint config16.4.2 installed; only aligned Next lock entries changed, React retained. Lint/typecheck and elevated full coverage4931 passed128 tests at100% all four metrics (1412 statements/830 branches/360 functions/1041 lines). Install audit snapshot has no critical findings but6high/5moderate remain. Dependencies/source frozen for parent build/audit/full integration, including unresolved installer reuse regression. S1 remains unchecked pending those gates and separate commit; owner manual acceptance and phase6 remain pending. See [security patch run](2026-10-23-next-security-patch.md).


S1 parent gates: production build82327 passed on Next16.4.2 without the prior security notice. Final npm audit exited1 with0 critical,6 high and5 moderate findings (11total), with no Next advisory. Remaining findings include an Awilix/glob production dependency path, so they are not characterized as tooling-only. No clean audit is claimed and unrelated upgrades remain outside S1. Full disposable integration23294 is running; source/dependencies remain frozen. S1 and owner acceptance remain unchecked pending full integration and separate commit.


S1 final verification: full disposable integration23294 passed exit0, including PostgreSQL, SMTP/HTTP, authentication and administration HTTPS browser scenarios, installer fresh-start/reuse and owned-resource cleanup. The earlier installer failure did not recur; its cause was not established, and no causal claim about the patch is made. Parent production build82327 passed. Lint/typecheck and128 tests passed with100% statements/branches/functions/lines. Final audit exited1 with0 critical/6 high/5 moderate findings and no Next advisory; a clean audit and CI pass are not claimed.

All phase5 implementation tasks are complete in separate commits: P5.1 ab3b3b1, P5.2 5d8a8a7, P5.3 09beae4. S1 is verified and completed with this separate commit. Stop for owner manual testing using the [README checkpoint](../../README.md#phase-5-manual-browser-checkpoint); restart npm run dev to load Next16.4.2. Owner acceptance remains unchecked, GitHub Auth remains coming-soon, and phase6 remains pending.


## Phase 6 resume — 2026-10-23

Goal: final validation and independent review of issue #4 under the owner's per-task subagent/commit workflow, followed by final manual testing. No previous owner acceptance is inferred. GitHub remains coming-soon only.

P6.1 plan and acceptance: implement the specification's missing bounded operator cleanup of expired sessions/action tokens/rate buckets, preserve all identities and active records, and prove bounded/idempotent behavior using meaningful unit tests and isolated PostgreSQL. Add real production HTTP/browser database-outage denial while preserving independent health/static access; existing real SMTP failure/retry remains. Document migration-first deployment, SMTP activation, bootstrap, secret rotation, retention/maintenance and rollback. Affected files: db repository/export, core operator, CLI/npm/coverage include, unit/integration fixtures, README and metadata. Risks: concurrent cleanup, secret-safe diagnostics and outage isolation; use fixed bound SQL, DB cutoff, SKIP LOCKED and only runner-owned Testcontainers. Subagent runs lint/typecheck/100% coverage; parent runs final build/audit/full integration after source freeze. P6.2 and P6.3 remain pending, as does owner final acceptance.


P6.1 source/tests prepared: expire-only maintenance deletes at most500 rows/table
(1500 total), uses one database cutoff, SKIP LOCKED and fixed SQL/timeouts; safe
operator entry accepts no arguments and always closes its pool. Isolated tests
exercise501-row bounds, held token/session locks, nonempty concurrent600-row
sweeps, idempotence and preservation of identity/credential/role/unexpired rows.
The real production outage fixture restricts itself to the asserted disposable
database/role, retains a controller, denies new connections and terminates only
other same-database/same-role sessions; finally restores LOGIN, then tests real
session/admin recovery. HTTP/browser assertions require safe denial/no new cookie
or private UI while health/home remain available. Deployment/rotation/maintenance/
rollback and final owner acceptance instructions are added. No live SMTP credential
verification is claimed. GitHub remains coming-soon; S2 is separately approved.

Local lint28648/typecheck45458 passed. Elevated coverage2709 passed131 tests with
100% statements1435/1435, branches833/833, functions364/364, lines1059/1059.
A subsequent integration-only change strengthens concurrent cleanup from empty
sweeps to600 actual expired records/table; parent build/audit/full integration
remain pending. P6.1 is not yet marked complete. Owner checkpoints remain open.


P6.1 parent verification in progress: default production build41936 passed. Full
disposable integration83907 has passed maintenance bounds/nonempty concurrency/
locked-row preservation/real CLI, all database and HTTP/auth/admin browser stages,
and the new real database-outage scenario: safe503/no new cookie/no private UI,
health/home independence and same-process authenticated recovery. Installer and
final cleanup are still pending, so no full integration pass is claimed yet.
Audit19648 reports0 critical/6 high/5 moderate; separately approved S2 follows
P6.1. P6.1 completion and owner final acceptance remain unchecked.


P6.1 completed and parent-verified2026-10-23; committed with this task update.
Full disposable integration83907 finished exit0, including all maintenance, real
database outage/recovery, PostgreSQL/SMTP/HTTP/native HTTPS auth/admin browser,
installer fresh-start/reuse and owned-resource cleanup checks. Default production
build41936 passed. Final lint86733/typecheck94738 and diff check passed; elevated
coverage2709 passed131 tests at100% statements1435/1435, branches833/833,
functions364/364 and lines1059/1059. Audit19648 remains0 critical/6 high/5
moderate; no clean audit or CI result is claimed. S2 is separately approved
and unchecked, followed by independent P6.2 review/QA and P6.3 final evidence.
Owner final manual acceptance remains unchecked, the specification is not moved
to implemented, and GitHub Auth remains a coming-soon button.


S2 owner-approved Vitest security patch: four direct existing packages and nine lock records are aligned to5.0.5; actual installed package versions were checked after npm12 stale-tree correction. Next16.4.2/React19.3.0 and Storybook runner4.1.11 remain unchanged. Post-install lint/typecheck passed; parent full coverage on actual5.0.5 passed131 tests at100% all metrics (1435/833/364/1059). Parent both-theme Storybook browser tests25246, build, audit and full integration remain pending. Source/dependencies are frozen; S2 and owner acceptance remain unchecked. See [patch run](2026-10-23-vitest-security-patch.md).

S2 final patch gates: lint48350/typecheck66912 passed; parent actual Vitest5.0.5 coverage passed131 tests at100% all four metrics, Storybook25246 passed30 files/92 tests in both themes, production build49676 passed. Audit45346 exited1 with zero critical/zero moderate/six high findings in the braces dependency chain. S2 is complete and ready for its separate parent commit. Final full application integration on this patch remains pending P6.2 after the QA hook; P6.1 integration83907 predates it and is not patch integration evidence. Owner final manual acceptance remains unconfirmed.


P6.2 independent QA: dedicated test-only browser scenario and `--scenario=qa` runner hook added against production HEAD1b8245e; no production changes. Lint/typecheck passed. First focused run36870 completed behavioral assertions but failed its own fixture token/user cleanup; corrected narrow cleanup and final entire focused run31309 passed exit0, including owned DB/SMTP/HTTPS/browser cleanup. Real login/CSRF/current-role/reset/replay/session checks plus clearly labelled synthetic list/role503/delay/retry/duplicate-submission states and keyboard/long-content/desktop320 checks passed. QA subagent inspected all ten state screenshots without actionable visual findings. See [independent QA report](../qa/2026-10-23-users-auth-qa.md). Independent security review/final complete gate/owner acceptance remain pending; GitHub remains coming-soon. Source/test changes frozen for parent review and separate task commit.

P6.2 independent whole-feature security review completed on frozen
`804be590f0ee12ad408c916d3ccfc230e59d577e`, explicit range49b363c..804be59
(unrelated discovery prototype excluded). The reviewer independently executed
all six configured commands in order: lint68368/typecheck60107 passed;
coverage90419 passed131 tests with100% statements1435/1435, branches833/833,
functions364/364, lines1059/1059; default Next16.4.2 build28796 passed;
full disposable integration80533 passed exit0, including native HTTPS auth/admin,
independent QA, real DB outage/recovery, maintenance/concurrency, SMTP, installer
fresh/reuse and final cleanup. Final audit76926 exited1 with six high transitive
entries for unpatched braces GHSA-vfj7-8cjw-p6xm; zero critical/moderate remain.
Registry/upstream research confirmed latest braces3.0.3 and no published patch.
No additional concrete auth production defect was found; no forced downgrade,
advisory suppression, source/test edit, remote approval or CI claim was made.
The mechanical review verdict is **request changes**. See [security review](../reviews/2026-10-23-users-auth-security.md).
P6.2 review/QA execution is done; P6.3 complete clean gate, spec acceptance and
owner final manual testing remain open. GitHub stays coming-soon. The spec is not
moved to implemented. The review update also removes the duplicate unchecked S2
tracker row; the actual committed5.0.5 security task remains marked done once.


## P6.3 final evidence and manual handoff — 2026-10-24

Resumed this original run after the owner's continuation; no implementation or
dependency change followed the frozen independent review. P6.1 commit180dbf1,
approved S2 patch1b8245e, independent QA804be59 and security report60a1ffc are
recorded. Added a reduced-scope acceptance matrix to the active specification,
final owner checklist/evidence links to README, current admin/maintenance contracts
to BACKWARD_COMPATIBILITY and precise partial/composite status to track.md.

Independent reviewer evidence is attributed to frozen804be59: lint68368,
typecheck60107, coverage90419 (131 tests;100% statements1435/1435,
branches833/833, functions364/364, lines1059/1059), build28796 and full
integration80533 passed. Audit76926 exited1 with zero critical/moderate and
six high entries for the single unpatched braces advisory. The reviewer found no
additional concrete auth production defect but retains **request changes**;
P6.3 does not override this verdict or waive the audit gate.

Only documentation validation is needed for this update; the six commands were
not rerun by the documentation subagent and no CI result is claimed. Relative
links/anchors and diff whitespace are checked before parent handoff. P6.3
evidence/runbook subtask is complete; full validation, approving review and owner
acceptance remain open. Specification stays in active specs. Pause for final owner
[manual testing](../../README.md#final-authentication-manual-acceptance). No remote
tracker action, PR, push, developer database change or live-service claim is made.
GitHub Auth remains a coming-soon button.


P6.3 Oct24 audit reconciliation: fresh parent audit41819 exits1 for one high
Undici finding, zero critical/moderate. The six braces entries from the independent
Oct23 review are historical; the upstream advisory was withdrawn Oct23 as not
practically exploitable. Installed Undici8.12.1 has an available8.12.2 patch in
the jsdom/testcontainers development dependency paths. The owner explicitly chose
“Leave versions unchanged and document it.” No S3 patch was implemented. This is
a scope choice, not a waiver of audit failure or risk approval. The independent
reviewer owns a fresh audit-only dated addendum; the unchanged source's five other
passing configured checks above are not represented as newly rerun on Oct24.
P6.3 full gate and owner acceptance remain unchecked.

Final independent audit refresh2026-10-24: reviewer tool chunk8b2188 exited1
with zero critical/moderate and one high Undici entry; the dated security report
addendum retains request changes. Production source/tests/dependencies are unchanged
from frozen804be59. Documentation-only diff/path/anchor checks passed; no unchanged
code gate was represented as newly rerun for this handoff.
