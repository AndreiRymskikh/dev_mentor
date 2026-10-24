# Independent users/auth QA — 2026-10-23

Scope: issue #4, owner-approved email/password and roles/admin implementation. GitHub remains a coming-soon button; OAuth/provider acceptance is deferred. This QA subagent did not implement production auth/admin code. This is independent browser exploration and evidence, not a security-review approval, CI result or owner acceptance.

Tested production HEAD: `1b8245e72709c9339a240277751b6df9f5057c72` (P6.1 `180dbf1`, approved Vitest security patch `1b8245e`). The only uncommitted executable differences during QA were the dedicated test scenario and runner hook committed with this report. The existing production build was unchanged throughout. The parent owns final full-build/full-suite verification after this test commit.

## Actual execution

- `npm run lint`: passed, including the final cleanup correction.
- `npm run typecheck`: passed, including the final cleanup correction.
- `npm run test:integration -- --scenario=qa`: final run session31309 exited0. Disposable PostgreSQL migrations, guarded rollback, constraints, real SMTP failure/retry, token and credential races, session/current-role checks, role/bootstrap races, admin repository checks and bounded maintenance checks passed before independent browser QA.
- Initial run36870 completed the browser assertions but exited1 during this new fixture's cleanup because reset action tokens retained a restricted User foreign key. The test now deletes only its own fixture tokens before fixture users; the entire focused command was rerun successfully. No production change was required.

The runner owned a fresh PostgreSQL container, SMTP fixture, production app process, HTTPS proxy and isolated pinned agent-browser session. It closed these resources. It did not access the developer Compose database, private env values, server3000 or real accounts. Only fixed synthetic fixture identifiers were used; no raw token, credential or action URL was retained in evidence.

## Independently exercised behavior

| Area | Observed result |
| --- | --- |
| Actual UI login and GitHub | Coming-soon feedback stays on login; verified credentials reach account and admin pages. |
| Keyboard | Tab from the labelled search input reaches Search with visible solid focus outline. |
| Long content | A100-character unbroken display name and long email remain readable through wrapping and contained table scrolling; document has no horizontal overflow at1280px or320px. |
| List loading/error/retry | Loading replaces the private table. A503 displays safe feedback and retry; restoring transport and retry loads actual data. |
| Empty search | No-results feedback appears and a later matching search restores actual rows. |
| Role failure/retry | A503 leaves persisted mentor membership unchanged. Retrying actual PUT succeeds. |
| Duplicate role submission | Two immediate form submissions during a delayed request generate one request; role fieldsets are disabled until completion. Actual database shows exactly one mentor membership. |
| Actual CSRF | A same-origin role PUT without the required CSRF header returns403 and leaves membership unchanged. |
| Current authorization | Removing the fixture actor's admin membership in the owned DB causes the next actual list request to clear the table and display access denied. |
| Missing action links | Reset and verification pages provide a safe new-link path; missing reset token exposes no password mutation field. |
| Actual SMTP reset | Forgot-password UI emits an owned SMTP token. Fragment is removed from URL/history; token is absent from DOM/storage and referrer policy is no-referrer. Short password validation focuses the invalid password field. Valid reset succeeds. |
| Reset/replay/session lifecycle | Existing cookie is denied after reset; replay is rejected; old password fails, new password succeeds; logout returns to login and account entry is denied. |

**Synthetic transport states:** list/role503 and delayed loading were injected only into the browser's same-origin fetch calls, using standard envelopes, then unwound before actual security/DB assertions and in cleanup. These prove presentation, retry and duplicate-submission behavior; they do not prove an actual database/network outage. The separate P6.1 full run83907 exercised a real disposable database outage. Real authorization, CSRF, reset, login/logout and database effects above were not mocked.

## Screenshot inspection

The QA subagent visually inspected all ten images from the final scenario's identical states at1280×1000 and320×900. No actionable visual defect was found. Feedback and navigation remained legible; mobile admin data intentionally scrolls inside the table wrapper. These ignored local artifacts contain synthetic fixture content only:

- [Long content desktop](../../test-results/integration/qa-admin-long-content-desktop.png), [mobile](../../test-results/integration/qa-admin-long-content-mobile.png).
- [Safe error desktop](../../test-results/integration/qa-admin-error-desktop.png), [mobile](../../test-results/integration/qa-admin-error-mobile.png).
- [Loading desktop](../../test-results/integration/qa-admin-loading-desktop.png), [mobile](../../test-results/integration/qa-admin-loading-mobile.png).
- [Empty desktop](../../test-results/integration/qa-admin-empty-desktop.png), [mobile](../../test-results/integration/qa-admin-empty-mobile.png).
- [Denied desktop](../../test-results/integration/qa-admin-denied-desktop.png), [mobile](../../test-results/integration/qa-admin-denied-mobile.png).

Artifacts are replaceable on a later runner execution and are not committed binary evidence. The reproducible test is [independent-auth-qa.ts](../../tests/integration/scenarios/independent-auth-qa.ts); the full runner includes it, and `--scenario=qa` runs its owned focused setup.

## Limits and outcome

No concrete production defect was found in this independent exploration. This does not replace the separately assigned whole-feature security review or final full validation. Anonymous/non-admin entry, last-admin/self-demotion, verification confirmation and broader token races additionally remain in the established full suite; this focused scenario adds different failure/interaction exploration rather than claiming those old checks were newly authored independent QA. Live deployment SMTP, assistive-technology testing and owner final manual acceptance remain pending. Six high transitive braces dependency findings are tracked separately; this report does not accept that residual risk or claim a clean audit.
