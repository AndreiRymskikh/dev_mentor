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

PR: #29

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

## Database, browser and review progress
Full production integration passed at a50f1ee: disposable migrations up/down and empty schema diff; every saved details field blocks destructive down; draft/unpublish/role-removal denies public reads; strict owner/CSRF/32KiB and public allowlist checks; owner-authored content reloads; escaped sample and real disclosure; full public desktop/390px/320px light/dark captures. Existing auth/admin/outage/installer suites also passed and cleaned up. Eight deterministic public-profile Storybook browser checks pass in light/dark (rich, empty optional content and long code). Story typecheck passes.

Review found global header/footer selector overlap with invitation framing; scoped the new rules to the public-profile root and restored white/neutral light surfaces. Final focused production run is checking that revision. Replaced raw nested field paths in the custom form's error list with human-readable validation messages and an explicit ownership instruction; regression checks prevent exposing the internal confirmation key. Native browser keyboard activation verifies disclosure; synthetic Storybook keyboard events do not perform Chromium's default details action, so stories use click and the production browser covers Enter.

The author account cannot independently approve its own PR. Independent review and risk-high QA sign-off remain required. The mandatory npm audit gate fails on unchanged glob/minimatch advisories (25 moderate, zero high/critical). No dependency override/downgrade or policy waiver is claimed.

## Final correction verification
Kept mobile process numbers on one line; a computed-style browser assertion covers 320px. Optional repeated fields now reuse shared FormField/Input/Textarea controls and focus invalid input, with a regression checking ownership-confirmation focus. Final lint/typecheck and all 184 unit tests pass with 100% lines/statements/functions/branches (2207 statements, 1339 branches, 634 functions, 1521 lines). A final production build/profile-browser run is in progress; no further production changes are planned.
