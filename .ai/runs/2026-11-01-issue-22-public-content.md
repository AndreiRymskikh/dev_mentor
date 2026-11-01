# Issue 22 — optional public content and profile layout

Start: 2026-11-01. Status: in-progress.
Source doc: .ai/specs/2026-10-29-e02-v2-public-profile-and-reviews.md
Issue: #22. Design: #18 (merged). Engine: om-auto-create-pr (steps: 6, --loop: no).

## Goal and scope
Implement C1/C2 optional owner-authored language, timezone, topics, sample answer and process plus separate owner/public details APIs and non-review public layout. Preserve five-key public DTO, publication readiness, slug and owner preview. No reviews, booking system or inferred expertise. Partial delivery: #6 prices/slots and #25 accepted booking destination remain missing; keep #22 open.

## Plan / acceptance
1. Strict bounded schemas, explicit allowlists, additive guarded migration and current verified mentor persistence.
2. Separate no-store owner/public routes, CSRF and bounded request.
3. Accessible authoring and long public page, safe disclosure, empty omission and truthful unavailable offer.
4. Unit coverage, disposable migration/privacy/API/browser checks, full desktop/mobile/dark evidence.
5. Configured lint/typecheck/coverage/build/integration/audit gate.
6. Independent review, PR evidence and handoff.

## Risks and verification
Public/private separation, role revocation and rollback data loss are material risks. Reuse current ownership locks and read predicates; test unknown keys, duplicate topics, invalid zones/languages, sample ownership, XSS-as-text and unchanged publication criteria. Run all configured commands; never report a planned check as passed.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append commit SHA when completed.

### Phase 1: Persistence and APIs
- [x] 1.1 Strict details contract and additive persistence
- [x] 1.2 Owner/public routes and privacy tests

### Phase 2: Authoring and public page
- [x] 2.1 Owner editing and public non-review layout
- [ ] 2.2 Unit, migration and browser evidence

### Phase 3: Verification and delivery
- [ ] 3.1 Full configured validation
- [ ] 3.2 Review, evidence and handoff

## Implementation and initial validation
Separate MentorDetails repository/service and explicit public projection retain existing five-key DTO and core readiness. Optional details editor uses shared useFormState with native repeated rows because CrudForm supports flat fields; no generic form framework was added. A native details/summary disclosure keeps the sample keyboard-accessible without client JavaScript. No review/offer/booking data is invented.

Passed: lint; workspace/test typecheck; 184 unit tests and 100% all four coverage measures (elevated rerun needed for existing localhost test servers). Sandboxed build stalled and was terminated; elevated build in progress. Audit returns 25 moderate dependency entries through glob/minimatch, zero high/critical; no dependencies changed or forced downgrades applied. Integration and visual QA still pending.
