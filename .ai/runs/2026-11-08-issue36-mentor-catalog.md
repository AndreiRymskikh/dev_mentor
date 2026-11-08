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
- [x] 1.1 Bounded repository, validated service, scoped DI and meaningful unit/database tests.
- [x] 1.2 No-store API and HTTP route tests.

### Phase 2: Discovery UI
- [x] 2.1 Responsive catalog, states, paging, refresh, navigation and unit tests.

### Phase 3: Verification
- [ ] 3.1 Full validation, production browser evidence, review, fixes and publication.

## Validation and outcome
Not run yet. Installed Next page/route docs read before code. Four-step plain engine (threshold 20), no loop requested. Independent spec scope review approved. Design mockups deferred due absent prepared test-env descriptor; actual UI evidence required here.

Phase 1: targeted public-contract unit tests passed. Disposable PostgreSQL probe passed after normalizing driver timestamp strings; the query now materializes the bounded candidate page before eligible-slot lookups. Full integration revalidates that final query. First complete coverage pass: 100% all four metrics. Production build passed with elevated execution after sandbox CSS worker stalled; no build-pipeline change.

Phase 2: catalog page and all discovery links implemented; unit loading/empty/error/retry/paging/refresh/focus paths pass. Full coverage rerun after timestamp normalization: 100% (2750 statements, 1691 branches, 814 functions, 1875 lines). Lint/typecheck passed. Production build passed. Targeted production integration running with disposable fixtures.

Gate repair: npm audit identified 16 moderate transitive tooling findings rooted in GHSA-3g3m-2fjr-6pw4 (glob <=14.0.1) and GHSA-g3hv-75wg-m249 (minimatch <11.0.1). Registry verified current glob14.0.4/minimatch11.0.5; upstream advisory/changelog reviewed. Narrow vulnerable-range overrides preserve older unaffected minimatch3/5 consumers. Revalidate lint, typecheck, unit coverage, production/Storybook builds and disposable integration; no forced framework/tool downgrade or advisory suppression.
