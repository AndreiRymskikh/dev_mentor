# Issue 36 mentor catalog implementation

Goal: deliver public persisted mentor discovery with truthful offers and working navigation.
Source doc: .ai/specs/2026-11-08-mentor-catalog.md (design PR #40; materialized locally, merges separately).

## Scope and risks
Public access, include published/current-role verified mentors even with incomplete offers, newest publication/ID descending; owner confirmed in chat. Preserve unrelated primary-checkout changes. Risk: privacy/current-role filtering, precise continuation, money/availability boundaries. No schema changes, booking, payment, filters or ranking.

## Implementation Plan
Phase 1: bounded DB/public service/API with unit and database checks.
Phase 2: accessible public listing and working discovery links with unit interaction checks.
Phase 3: full gate, production browser/HTTP fixtures/screenshots, authoritative review and ready PR.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Public contract
- [ ] 1.1 Bounded repository, validated service, scoped DI and meaningful unit/database tests.
- [ ] 1.2 No-store API and HTTP route tests.

### Phase 2: Discovery UI
- [ ] 2.1 Responsive catalog, states, paging, refresh, navigation and unit tests.

### Phase 3: Verification
- [ ] 3.1 Full validation, production browser evidence, review, fixes and publication.

## Validation and outcome
Not run yet. Installed Next page/route docs read before code. Four-step plain engine (threshold 20), no loop requested. Independent spec scope review approved. Design mockups deferred due absent prepared test-env descriptor; actual UI evidence required here.
