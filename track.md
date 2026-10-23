# Users/auth implementation tracker

Started 2026-10-21. [Specification](.ai/specs/2026-10-16-users-auth-application-primitives.md).

Each task uses a subagent, meaningful tests and a separate commit. Pause after each phase for owner manual testing. GitHub auth is deferred: show a button with coming-soon feedback; no OAuth endpoints or provider storage/secrets.

## Phase 1 — Database foundation
- [x] P1.1 Pinned MikroORM/PostgreSQL dependencies, lazy shared runtime, isolated request/transaction lifetime and tests.
- [x] P1.2 Users, memberships, credentials, sessions, action tokens and rate-limit schema; explicit migrations, safe rollback, operator commands and disposable PostgreSQL tests.
- [ ] Phase gate: lint, typecheck, 100% coverage, audit, build and disposable database verification; provide manual instructions.
- [ ] Owner manual checkpoint passed.

## Phase 2 — Registration and email
- [x] P2.1 Explicit repositories, strict registration validation, bcrypt and atomic database rate limits.
- [x] P2.2 Email port/SMTP adapter, token issuance/invalidation and registration service; delivery failure/retry checks.
- [x] P2.3 Scoped composition and registration API; CSRF, generic 202 response metadata and disposable database/mail tests.
- [ ] Validation and owner manual API checkpoint passed.

## Phase 3 — Verified credentials and sessions
- [x] P3.1 Verification request/confirm with serialized single-use token consumption and replay checks.
- [x] P3.2 JWT/session cookies, login/logout/session resolver, current role arrays and coordinated helper migration.
- [x] P3.3 Forgot/reset password, atomic credential replacement/session revocation and race tests.
- [ ] Validation and owner manual API checkpoint passed.

## Phase 4 — Authentication screens
- [x] P4.1 Accessible registration/login/recovery forms using existing UI; GitHub coming-soon button.
- [x] P4.2 Fragment-token verification/reset pages, safe history/referrer handling, account page and logout.
- [x] P4 manual-feedback correction: prominent registration acceptance, verification-before-sign-in next steps, focused heading and visible desktop/mobile links.
- [ ] Validation, browser evidence and owner manual UI checkpoint passed.

## Phase 5 — Roles and administration
- [x] P5.1 Self-enrollment, serialized admin role changes, last-admin protection and operator bootstrap.
- [x] P5.2 Bounded users query/DTO and protected admin API.
- [x] P5.3 Admin navigation/list/role controls; replace admin 404 tests with authorization scenarios.
- [ ] Validation, race/browser evidence and owner manual checkpoint passed.

## Approved security follow-up
- [x] S1 Upgrade Next.js to a compatible security patch after P5.3; separate subagent and commit before the manual handoff (owner approved2026-10-23).

## Approved phase 6 security follow-up
- [ ] S2 Upgrade Vitest and its V8 coverage package to compatible 5.0.5; separately committed after P6.1 and before final review/gates (owner approved2026-10-23).

## Phase 6 — Final validation and independent review (current)
- [x] P6.1 Complete database/mail/browser security/outage scenarios and deployment/operator docs.
- [ ] P6.2 Independent security review and QA through subagents; track and commit fixes separately.
- [ ] P6.3 Full validation gate, actual evidence, spec acceptance updates; move spec only after required work is complete.
- [ ] Owner final manual acceptance passed.

## Evidence
P3.1 commit: `f43fb18`; P3.2 commit: `2c716d4`. P3.3 commit: `0e13a07`. Phase 3 final evidence: lint/typecheck,99 unit tests at100% all four metrics, production Webpack build and full disposable PostgreSQL/SMTP/production HTTP/browser/installer integration passed. Default Turbopack build retains worker-port EPERM; audit reports six high and five moderate existing-toolchain findings. Owner manual acceptance and the complete audit gate remain open. These were the historical phase3 results; the corrected phase4 pipeline now passes both build engines.

Phase 3 resume: owner explicitly authorized phase 3 with a subagent and commit per task, followed by a manual phase checkpoint. Prior manual-result checkboxes remain unconfirmed. Execute P3.1 verification, P3.2 sessions/login/logout, then P3.3 recovery; no phase 4 UI or GitHub OAuth in this run.

2026-10-21 resume: owner requested implementation of issue #4 after the phase 1 checkpoint. Continue phase 2 under the existing per-task subagent/commit and manual phase-gate workflow. This authorizes continuation; it does not establish that owner manual checks or the full phase 1 gate passed. Issue #4 remains open, unassigned and unclaimed by another actor; no open PR was found.

P1.1 reviewed and committed with this tracker update. Exact MikroORM 7.2.5 pins; lazy shared runtime and isolated request/transaction managers. Lint, typecheck and full unit coverage passed (60 tests; 100% all four metrics). Audit reports six existing high-severity dependency findings outside the new ORM tree. Default build fails with Turbopack worker port EPERM even with escalation; parent successfully verified `npm run build --workspace @devmentor/app -- --webpack`. Real ORM initialization without a connection passed; disposable PostgreSQL verification belongs to P1.2.

P1.2 reviewed and committed with this update: six explicit auth entity schemas and additive migration; locked empty-data rollback; root migration CLI config; real disposable ORM/constraint/CLI tests. Lint/typecheck, 61 unit tests with 100% coverage, production webpack build and full PostgreSQL/browser/installer integration passed. `npm audit` still reports the six existing high findings; therefore the complete phase gate remains open. Default Turbopack build has the previously recorded execution restriction. README supplies the phase 1 manual checkpoint (`npm run test:integration`) without touching Compose data. Owner checkpoint has not been performed. Implementation pauses here before phase 2.

P2.1 committed as `62eaefc`: narrow atomic registration repository, pure strict schema, pinned bcryptjs3.0.3 cost12, PostgreSQL atomic HMAC-only hourly limits. Lint/typecheck, 66 tests with100% all coverage metrics, Webpack build and full disposable PostgreSQL/browser/installer integration passed. Default Turbopack EPERM and six existing high audit findings remain; phase2 manual checkpoint remains pending.

P2.2 reviewed and committed with this update: atomic initial verification digest, strict registration service, explicit email port and Nodemailer10.1.7 SMTP adapter with TLS/fixed origin and ten-second active cancellation. Unit coverage74 tests100% all metrics; lint/typecheck, production Webpack build and full disposable DB/SMTP/browser/installer integration passed. Six existing high audit findings remain. SMTP recovery is subsequent new registration; same-account resend remainsP3.1. P2.3 and manual phase checkpoint remain open.

P2.3 implemented: explicit lazy scoped DI, bounded streaming JSON registration route, CSRF against validated configured public origin, generic202/no-store, safe429 Retry-After and compatible typed success metadata/cookies. Scoped independent review corrected SMTP timing enumeration with a15-second shared public completion window (documented outage limits). Lint/typecheck,82 tests100% all metrics, production Webpack build and full disposable PostgreSQL/authenticatedSTARTTLS/productionHTTP/browser/installer integration passed. Default Turbopack remains blocked by worker-portEPERM; audit retains six existing high findings. README includes local Mailpit/manual curl instructions. Phase2 owner manual checkpoint is pending; stop before phase3.

P2.2 commit: `4d3a667`. P2.3 parent-reviewed and committed with this tracker update. Phase 2 implementation is ready for manual testing; remaining acceptance/full-gate checkboxes stay open. Issue #4 is not complete.


P3.1 implemented by its task subagent (resumed 2026-10-22): strict verification resend/
confirm APIs, shared email quotas and generic 15-second window, serialized token
replacement/conditional cleanup/single-use confirmation; pure validators exported for
later UI. Lint/typecheck and 87 unit tests passed at 100% all four metrics. Full disposable
PostgreSQL/SMTP/production HTTP/browser/installer integration passed, including committed
race-state assertions and same-account resend recovery after SMTP failure. Webpack build
passed; default Turbopack EPERM and six existing high audit findings remain. Scoped
independent review found no concrete issue; whole-feature phase 6 review remains pending.
Parent review completed; P3.1 committed as `f43fb18`.

P3.2 implemented by its task subagent on 2026-10-22: exact-pinned jose6.2.13,
verified bcrypt credentials login, fixed24-hour JWT plus persisted sessions,
current role arrays, app-owned cookies, strict login/logout/session APIs and
shared PostgreSQL15-minute login quotas. Final unit tests93 passed with100% lines,
statements, branches and functions after strict/bodyless logout validation;
lint/typecheck passed. Scoped independent source review found no concrete issue.
Default Turbopack build retains worker-port EPERM; final-source Webpack build
and full disposable integration passed under parent verification, including explicit
lock-blocking evidence,50/IP concurrent quota and production bodyless/strict logout.
Audit reports six high and five moderate existing-toolchain findings; jose is not
affected. Parent review completed; P3.2 committed as `2c716d4`.


P3.3 implemented and parent-verified on2026-10-22: generic timed forgot API, shared
email quotas,30-minute digest-only reset tokens, user-locked replacement/conditional
SMTP cleanup, existing-credential reset and atomic all-session revocation.
Lint/typecheck and99 unit tests pass at100% all metrics (1021 statements/595 branches/
247 functions/784 lines). Final Webpack build and full disposable integration passed,
including both actual reset/login repository race orders with observed lock blocking,
SMTP failure/retry, recovery HTTP, old-cookie/password denial, browser/admin404,
installer preservation and owned-resource cleanup. Default Turbopack worker-port
EPERM and six high/five moderate existing tooling audit findings remain. Parent
review completed; committed as `0e13a07`. README contains the whole phase3 manual
sequence. Owner manual acceptance, overall audit gate and phase6 independent
whole-feature review remain open. Stop before phase4.

2026-10-22 phase4 resume: owner authorized P4.1 and P4.2, subagent and local commit per task, then manual UI testing. P4.1 implementation and parent verification are complete and committed with this update. P4.2 starts after that task commit. GitHub remains coming-soon only; previous manual checkboxes stay unconfirmed.

P4.1 rendering gate correction: first behavioral integration passed but parent screenshot review found uncompiled Tailwind under Webpack. A shared exact-version PostCSS pipeline now replaces the Turbopack-only CSS transform; parent default build now passes.104 unit tests pass100% all four metrics, including actual CSS compilation. Desktop/mobile computed layout/focus checks and screenshots are added; both final parent builds and full disposable integration passed; desktop/mobile screenshots were inspected. P4.1 is committed with this update. Historical default-build EPERM notes above no longer describe the corrected pipeline.

P4.1 final evidence: warning-free lint, typecheck,104 unit tests with100% all four metrics, actual CSS compilation regression, default Turbopack and Webpack production builds, full disposable PostgreSQL/SMTP/HTTP/native HTTPS browser/installer integration and cleanup passed. Parent inspected desktop and320px screenshots and computed focus/layout checks. Audit remains six high/five moderate existing-toolchain findings; no CI or manual acceptance is claimed. Continue P4.2, then pause for owner manual testing.


P4.2 implemented by its task subagent on2026-10-22: explicit fragment-token
verification/reset screens with immediate canonical URL/history removal, memory-only
client token storage, no-referrer/noindex metadata, generic verification resend,
server-authorized account/all-role display and revoking logout. Account reads raw
async headers through the shared duplicate-rejecting cookie parser, since installed
Next cookie stores collapse duplicates. Local lint/typecheck and112 unit tests pass
at100% all metrics (1134 statements/683 branches/288 functions/864 lines).
Production and integration test source is frozen for parent validation; build,
audit and disposable HTTPS browser results are pending. Owner manual acceptance
remains unchecked; no phase5 work is started.

P4.2 parent default production build passed; scoped independent source review
found no concrete issue. Audit retains six high/five moderate existing-toolchain
findings. Full disposable integration and screenshot inspection remain pending.


Phase4 implementation is complete with this task commit. P4.1 is committed as
`862c189`; P4.2 is parent-reviewed and ready for its per-task commit. Final default
production build and full disposable PostgreSQL/SMTP/production HTTP/native HTTPS
browser/installer integration passed, including verification/reset privacy, real
account roles and session revocation. Parent visually reviewed all six desktop/
320px verification, reset and account screenshots: usable layout/wrapping, no
visual findings or token echo. Lint/typecheck and112 unit tests passed100% all four
coverage metrics. Audit remains six high/five moderate existing-toolchain findings;
CI and clean audit are not claimed. Owner manual UI acceptance and combined gates
remain unchecked. Stop here for owner testing; phase5 is untouched.


Phase4 manual-feedback correction2026-10-22: registration202 now replaces the
submitted form with a focused “Request accepted” heading, generic check-email
instructions and visible sign-in/resend links. Password controls are removed;
verification is still required before login. Initial registration/login retain
GitHub coming-soon. Task subagent implemented and parent reviewed the correction.
Lint/typecheck,112 tests at100% all four metrics, default production build and
full disposable PostgreSQL/SMTP/HTTP/HTTPS browser/installer integration passed.
Desktop and320px accepted-screen assertions and parent screenshot review confirm
focus, single status, no retained form and both next-step links within viewport.
Audit remains six high/five moderate existing findings; owner manual acceptance
and combined phase4 checkpoint remain unchecked. Phase5 is unstarted. See
[correction run](.ai/runs/2026-10-22-registration-acceptance-feedback.md).

P5.1 implementation is in parent validation: verified mentor self-enrollment,
serialized role changes/last-verified-admin protection, first-admin operator command,
117 tests at100% all four coverage metrics and lint/typecheck passed. Parent full
build/integration/audit evidence and the task commit follow; owner manual checkpoint
remains unconfirmed. Production/test source is frozen for that validation.

Prior phase4 commits: P4.2 `3263a1d`; registration acceptance feedback `734c6e0`. Owner manual gates remain unconfirmed.

P5.1 final parent validation: default production build and full disposable PostgreSQL/SMTP/HTTP/HTTPS browser/installer integration passed (exit0), including role/bootstrap races and real operator subprocess. Lint/typecheck and117 tests at100% all four coverage metrics passed. Audit remains six high/five moderate existing-tooling findings; CI and owner manual acceptance are not claimed. Parent task commit follows before P5.2.


P5.2 source/tests are frozen for parent validation: bounded strict users query,
allowlisted DTOs, persisted verified-admin recheck and protected no-store list/role
APIs. Subagent lint/typecheck and120 tests at100% all four coverage metrics passed.
Production HTTP/disposable PostgreSQL scenarios are written and wired, not yet
claimed passed. Parent build/integration/audit and per-task commit follow; P5.3 and
owner manual checkpoint remain pending. P5.1 is committed as `ab3b3b1`.

P5.2 validation correction: first full suite failed search503; actual isolated
PostgreSQL probe proved SQLSTATE42601 from a raw boolean predicate. Numeric strpos
plus ORM $gt:0 corrected it. Parent production build17048 passed with the newly
published Next security warning; subsequent full suite91224 passed all database
checks including actual literal/plain/empty search, but exposed the old HTTP login
quota fixture's fixed-window boundary assumption. HTTP denial fixture now seeds
only its owned HMAC pair at5 in current/next windows and expects429. Final full
suite and elevated unit rerun remain parent-owned/pending. Last lint/typecheck
passed; latest sandbox coverage failed only existing localhostEPERM tests, so
that failed run is not recorded as a pass. Earlier elevated120-test100% result
predates the numeric search correction. Audit now1critical/6high/5moderate; Next
security patch S1 is owner-approved separately after P5.3. Manual gates stay open.

P5.2 final-source elevated coverage83211 passed120 tests at100% all four metrics;
lint/typecheck passed. Integration41196 has passed DB/admin HTTP/auth browser
stages; final installer/cleanup remain pending. P5.2 stays unchecked until final
parent verification and task commit. No owner acceptance is inferred.

P5.2 parent handoff: final coverage83211 passed120 tests100% all metrics; final
production build17048 passed. Integration41196 completed exit1 with owned-resource
cleanup: all application DB/admin HTTP/auth browser scenarios passed, but the
installer rerun expected “Development: skipped; reusing” and instead reported a
new “Development: ready at” server. This is an installer reuse failure, not an
assumed homepage-fetch hang; its cause is not established. P5.2 API work is done
and ready for separate parent commit. Whole-phase full gate remains pending after
P5.3/S1, with a dedicated fix if installer reuse still fails. Owner acceptance,
CI and clean audit remain unclaimed. No unrelated installer edit was made.


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


S1 implementation prepared after P5.3 commit09beae4: exact Next and matching root/app ESLint config16.4.2 installed; only aligned Next lock entries changed, React retained. Lint/typecheck and elevated full coverage4931 passed128 tests at100% all four metrics (1412 statements/830 branches/360 functions/1041 lines). Install audit snapshot has no critical findings but6high/5moderate remain. Dependencies/source frozen for parent build/audit/full integration, including unresolved installer reuse regression. S1 remains unchecked pending those gates and separate commit; owner manual acceptance and phase6 remain pending. See [security patch run](.ai/runs/2026-10-23-next-security-patch.md).


S1 parent gates: production build82327 passed on Next16.4.2 without the prior security notice. Final npm audit exited1 with0 critical,6 high and5 moderate findings (11total), with no Next advisory. Remaining findings include an Awilix/glob production dependency path, so they are not characterized as tooling-only. No clean audit is claimed and unrelated upgrades remain outside S1. Full disposable integration23294 is running; source/dependencies remain frozen. S1 and owner acceptance remain unchecked pending full integration and separate commit.


S1 final verification: full disposable integration23294 passed exit0, including PostgreSQL, SMTP/HTTP, authentication and administration HTTPS browser scenarios, installer fresh-start/reuse and owned-resource cleanup. The earlier installer failure did not recur; its cause was not established, and no causal claim about the patch is made. Parent production build82327 passed. Lint/typecheck and128 tests passed with100% statements/branches/functions/lines. Final audit exited1 with0 critical/6 high/5 moderate findings and no Next advisory; a clean audit and CI pass are not claimed.

All phase5 implementation tasks are complete in separate commits: P5.1 ab3b3b1, P5.2 5d8a8a7, P5.3 09beae4. S1 is verified and completed with this separate commit. Stop for owner manual testing using the [README checkpoint](README.md#phase-5-manual-browser-checkpoint); restart npm run dev to load Next16.4.2. Owner acceptance remains unchecked, GitHub Auth remains coming-soon, and phase6 remains pending.


2026-10-23 phase6 resume: owner authorized P6.1–P6.3, one subagent and local commit per task, then final manual testing. P6.1 plan: bounded expire-only auth maintenance command; disposable PostgreSQL/production HTTP/browser storage-outage checks; deployment, key rotation, maintenance and rollback documentation. Existing real SMTP failure/retry, role/token races and denied/forged-role checks are retained. Parent owns build/audit/full integration after source freeze. P6.2 independent security/QA and P6.3 final evidence follow. Earlier owner checkpoints remain unconfirmed; GitHub remains coming-soon only.


P6.1 prepared: bounded expire-only auth maintenance and safe operator CLI; actual
disposable database outage/recovery HTTP/browser scenarios; deployment/rotation/
maintenance/rollback/final manual runbook. Local lint/typecheck and131 tests at100%
all four coverage metrics passed (1435 statements/833 branches/364 functions/1059
lines). Nonempty concurrent cleanup fixture is strengthened after that unit run
(integration-only). Parent build/audit/full integration and task commit remain
pending. Owner final acceptance is unchecked; no live SMTP or clean audit claimed.


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
