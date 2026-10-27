# E02 slices 1 and 2 implementation

Status: complete — invitation implementation; independent review/QA required
Source doc: .ai/specs/implemented/2026-09-08-invitations.md
Shared architecture: .ai/specs/2026-09-08-mentors-become-bookable.md
Story specs: .ai/specs/2026-09-08-invitations.md and .ai/specs/2026-09-08-mentor-page.md
Epic: #6; invitations: #7; profile/share link: #8.

## Goal and scope

Implement optional secure invitations, durable first-publication deadlines, owner profile editing/publication and stable public share links. Use current authentication, MikroORM, explicit Awilix and Storybook primitives.

Owner decisions, 2026-10-26: preserve verified self-service mentor enrollment and add optional invitations; track locally under #6 and create slice issues. External original #8/#15/#16 are provenance only. Slice 1 and 2 ship as separate PRs. Slots, prices, payments, ratings and OAuth remain outside scope.

## Architecture adaptation and risks

The source specs describe a different historical tree. Current roles are developer/mentor/administrator; sessions resolve persisted roles on every request and have no sessionVersion. Invitation acceptance must preserve the current session rather than introducing a second token/session system. No MentorProfile exists: introduce the floor, not fictional placeholder fields/seeds. Reuse current DB runtime and migration registry. Preserve self-service membership and make both enrollment paths reach profile creation. Raw invitation tokens must never enter logs. Schema and auth changes require independent review and QA.

## Implementation plan

### Phase 1: Optional invitations (#7)

1. Reconcile story/epic contracts with owner decisions, current auth and tracker IDs.
2. Add invitation/profile floor migration and persistence with identity/locking/uniqueness invariants.
3. Add validated services, operator command, typed DI and HTTP routes.
4. Add invitation continuation and mentor home/deadline using shared primitives.
5. Verify unit, database, HTTP and browser paths; full gate, PR review and QA evidence.

### Phase 2: Profile publishing (#8, separate PR)

6. Add vocabulary/readiness/slug utilities, profile migration and owner/public persistence.
7. Add owner services, route callbacks and explicit public projections.
8. Add draft/publish/share UI using Storybook primitives and generic form/resource feedback.
9. Verify ownership, projections, collisions, publish transitions and public browser flow; full gate, PR review and QA evidence.

## Verification

Not yet run: lint, typecheck, coverage, build, integration, audit, review and UI QA. Initial checkout clean; source specs are now committed on develop (38c99b0), superseding the earlier issue's durability blocker. GitHub connector cannot access this repository; authenticated gh works outside sandbox.

## Latest evidence — slice 1

Implemented invitation/profile schema, partial uniqueness and acceptance checks; digest-only persistence;
user-before-invitation locking; create/accept/revoke/resend; strict validation and bounded day settings;
operator audit output; typed DI; no-store API routes; invitation page/continuation; UTC hydration and
mentor deadline page. Self-service enrollment remains available.

Passed: lint, typecheck, 145 unit tests with 100% statements/branches/functions/lines (112 production
files); isolated disposable PostgreSQL migration up/down, empty schema diff, identity denial,
concurrent create/accept, accept-versus-revoke, deadline preservation and existing-session resolution.
Standard build failed: Turbopack CSS worker local-port EPERM persists after elevated retry. Supported
Webpack production build passed; full integration is running against it. CSS styling was subsequently
adapted to the shared token/controls contract and needs a fresh build/browser pass. Audit/review/QA
not yet completed. Temporary standalone DB harness is untracked and must not enter the PR.

## Progress

PR: #9

- [x] 1.1 Reconcile contracts and tracker mapping.
- [x] 1.2 Implement invitation persistence.
- [x] 1.3 Implement services, operator command and HTTP wiring.
- [x] 1.4 Implement invitation and mentor deadline UI.
- [x] 1.5 Verify and finalize invitation PR.

## Follow-up verification

Final invitation source passes lint/typecheck, 145 unit tests and 100% per-file coverage on all four
metrics. Webpack build passes. Native focused `--scenario=invitations` passes all database stages,
real operator command, HTTP denial and optional enrollment, browser login continuation/acceptance,
preserved session and deadline refresh, replay rejection, desktop/320px screenshots. Inspected both
mobile screenshots: controls fit and deadline includes the viewer zone. Full integration earlier
stopped during existing SMTP/auth HTTP tests with a request timeout; a fresh full run remains owed.

Audit found Undici 8.12.1 (development-only JSDOM/Testcontainers chain). Registry verified compatible
8.12.3 (Node >=22.19); only that lockfile entry changed. Installed version is 8.12.3 and audit reports
zero vulnerabilities. No thresholds or assertions were weakened. The focused HTTP fixture now uses
the internal HTTP URL with the configured HTTPS origin; browsers still use the owned HTTPS proxy.
Acceptance returns `publishDueAt` for that invitation; the owner read preserves `initialPublishDueAt`.

## Final invitation outcome

Implemented in PR #9, code head aaebae5457f45cb4220a7eeadb0004c3a8bb52ba. All four GitHub CI jobs
passed and the workflow completed successfully: production build, lint/typecheck, 100% unit coverage,
and the complete disposable PostgreSQL/browser integration suite. Local lint/typecheck/coverage,
Webpack build, focused native invitation DB/HTTP/browser scenario and zero-vulnerability audit pass.
Local default Turbopack still hits worker-port EPERM and the local full suite timed out in SMTP/auth;
those environment limits are not represented as passing local runs. No thresholds were relaxed.

Source acceptance criteria use the owner-approved optional-invitation adaptation. No production
schema/data was reset. The invitation specification moves to implemented after implementation and
verification; independent high-risk review and QA approval remain merge requirements. Configured
pipeline/category/priority/risk/QA labels are absent and guards skip them.

Slice 2 is tracked in [its own run](2026-10-26-e02-mentor-profile.md), issue #8 and PR #10. Its pending
steps are not a completion claim for this invitation PR. The epic remains active for later slices.
