# Issue #37 — immediate bookings

Source doc: .ai/specs/2026-11-08-booking-and-completion-contract.md
Status: in-progress

Goal: implement immediate developer bookings and private reservation lifecycle from accepted design PR #39 (merged; #25 closed). #37 is unassigned, no competing implementation PR. Engine: om-auto-create-pr (steps: 7, --loop: no).

Scope: db entities/migration/atomic persistence; core validators, services and request-scoped DI; authenticated APIs and public options; direct-profile review/detail/actions with safe auth continuation; bounded retention and operational documentation; meaningful unit/integration/browser verification and independent review.

Non-goals: catalog (#36), full sessions workspace (#38), payments/chat, public reviews, mentor approval or completion.

Risks: interval and command concurrency, immutable terms, private history, role revocation, expiry and unknown outcomes. New bookings fail closed without real external guidance/support configuration. Existing obligations stay manageable. Preserve legacy DTOs. Never use the developer database for tests.

## Progress

PR: #42

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Persistence and domain

- [x] 1.1 Add entities, guarded migration and transactional locking/retry repository. — e6a38c9
- [x] 1.2 Add strict validators, business rules, private projections and explicit composition. — e6a38c9

### Phase 2: API and journey

- [x] 2.1 Add scoped booking/options/admin APIs and protocol checks. — 5832f60
- [x] 2.2 Deliver review/detail/actions and public CTA with safe auth continuation. — 5832f60

### Phase 3: Operations and verification

- [x] 3.1 Deliver bounded retention command and deployment/privacy runbook. — 1db4e69
- [ ] 3.2 Complete unit coverage and disposable PostgreSQL/browser checks.
- [ ] 3.3 Run full gate, independent review/QA and publish evidence.

## Validation

Preflight only: live tracker/spec/lessons/config and installed Next documentation read. No implementation checks run yet.


## Progress and evidence

Created isolated `.ai/tmp/issue-37-bookings` from current origin/develop f273c46, preserving primary checkout. Draft #42 opened after plan commit 9af60e2. Domain/API/UI/operator implementation is in progress; domain commit e6a38c9 pushed.

Full unit suite: 266 tests passed, 100% lines/statements/functions/branches (3272 statements,2162 branches,936 functions,2176 lines). Lint/typecheck and production build passed before final copy/style corrections; reruns pending those corrections. npm audit: zero vulnerabilities. Sandbox localhost/build/network restrictions required escalated execution; no developer database used.

Targeted disposable integration passed all database scenarios, including new ORM schema parity/up/down guard, same-command concurrent retries, different-start/cross-role conflicts, immutable terms and failed-move preservation, role/unpublish/removal replay, cancel/complete race and exact retention/cascaded purge. New production HTTP/browser scenario passed auth continuation, CSRF/ownership/admin denial, committed response-loss reconciliation, explicit move/cancel/complete, reason escaping/privacy and 1440/390/320 light/dark screenshots. Viewed dark320 detail: readable, no horizontal overflow. Full suite and final UI evidence still pending.

Resolved validation findings: canonical PostgreSQL interval/BETWEEN expressions caused perpetual schema diff; express entity constraints canonically without weakening DDL. Existing prices rollback test assumed its migration was last; explicitly target its predecessor so future additive migrations cannot silently bypass its data guard. Unit tests found/fixed empty-history list projection and hidden mentor completion-dialog mounting. No coverage thresholds/exclusions changed.

Final copy alignment replaces unavailable-booking claims in profile/catalog/account/owner surfaces. Legacy public offer/slots API meanings remain unchanged. Optional selected-slot filter in the new options API supports deep links beyond page one; every selected slot is still checked server-side. Run started Nov9; resumed evidence spans subsequent dates, retaining original log.


## Review fixes and final-gate restart — Nov11

Automated om-auto-review-pr pass checked package boundaries, all new route auth/CSRF and no-store guards, participant/admin isolation, ordered participant locks, concurrent command replay and interval capacity, immutable money, terminal transitions, retention, migration scope and compatibility/product decisions. No public review/payment/chat capability added. Human/independent risk-high review and QA approval remain required before merge; this run cannot self-grant qa-approved.

Found/fixed reload recovery (450de2c): restore a schema-validated pending create for its exact route before fresh bookability disables submission; preserve key/terms across unknown outcomes and reauthentication. Browser now reloads after a committed response loss and obtains the original booking. Retention cleanup failures are sanitized too. Unit suite now267 passing, all four metrics100%; lint/typecheck/build/audit passed before final index addition. Final coverage after index is recorded below when returned.

Added real operator regression:501 expired bookings purge in500/1/0 batches, and creation occurs at the inclusive two-hour lead boundary. These assertions passed in the Nov11 disposable DB suite. CI exposed a TS inference issue in that test helper; explicit output typing fixed it (2dcda56). Legacy profile QA assumed a disabled placeholder and its reputation guard rejected the verb 'review booking'; tests now assert no booking links for an unpriced fixture and still reject reputation controls. This changes test expectations for the real capability, not N02 policy. Full suite before these harness corrections passed new booking/catalog/prices/availability/auth/invitation paths then stopped at public-share. It is not recorded as a full pass.

Review also added booking_commands_booking_index (791164f) so bounded retention cascades do not scan global command history for every deleted booking. New migration/entity declarations stay in sync. Final full suite/CI restart is pending. Screenshot evidence is attached in https://github.com/AndreiRymskikh/dev_mentor/pull/42#issuecomment-6793399085; synthetic data only, light/dark320 and1440 screenshots. Current implementation head differs only in test/retention-index work from the pictured UI.
