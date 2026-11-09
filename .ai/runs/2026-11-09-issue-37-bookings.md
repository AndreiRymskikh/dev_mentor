# Issue #37 — immediate bookings

Source doc: .ai/specs/2026-11-08-booking-and-completion-contract.md
Status: in-progress

Goal: implement immediate developer bookings and private reservation lifecycle from accepted design PR #39 (merged; #25 closed). #37 is unassigned, no competing implementation PR. Engine: om-auto-create-pr (steps: 7, --loop: no).

Scope: db entities/migration/atomic persistence; core validators, services and request-scoped DI; authenticated APIs and public options; direct-profile review/detail/actions with safe auth continuation; bounded retention and operational documentation; meaningful unit/integration/browser verification and independent review.

Non-goals: catalog (#36), full sessions workspace (#38), payments/chat, public reviews, mentor approval or completion.

Risks: interval and command concurrency, immutable terms, private history, role revocation, expiry and unknown outcomes. New bookings fail closed without real external guidance/support configuration. Existing obligations stay manageable. Preserve legacy DTOs. Never use the developer database for tests.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Persistence and domain

- [ ] 1.1 Add entities, guarded migration and transactional locking/retry repository.
- [ ] 1.2 Add strict validators, business rules, private projections and explicit composition.

### Phase 2: API and journey

- [ ] 2.1 Add scoped booking/options/admin APIs and protocol checks.
- [ ] 2.2 Deliver review/detail/actions and public CTA with safe auth continuation.

### Phase 3: Operations and verification

- [ ] 3.1 Deliver bounded retention command and deployment/privacy runbook.
- [ ] 3.2 Complete unit coverage and disposable PostgreSQL/browser checks.
- [ ] 3.3 Run full gate, independent review/QA and publish evidence.

## Validation

Preflight only: live tracker/spec/lessons/config and installed Next documentation read. No implementation checks run yet.
