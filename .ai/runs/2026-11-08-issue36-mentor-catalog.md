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

PR: #41

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Public contract
- [x] 1.1 Bounded repository, validated service, scoped DI and meaningful unit/database tests. — 7b49681
- [x] 1.2 No-store API and HTTP route tests. — 7b49681

### Phase 2: Discovery UI
- [x] 2.1 Responsive catalog, states, paging, refresh, navigation and unit tests. — b5681fa

### Phase 3: Verification
- [x] 3.1 Full validation, production browser evidence, review, fixes and publication.

## Validation and outcome
Initial state: checks had not yet run. Installed Next page/route docs read before code. Four-step plain engine (threshold 20), no loop requested. Independent spec scope review approved. Design mockups deferred due absent prepared test-env descriptor; actual UI evidence required here.

Phase 1: targeted public-contract unit tests passed. Disposable PostgreSQL probe passed after normalizing driver timestamp strings; the query now materializes the bounded candidate page before eligible-slot lookups. Full integration revalidates that final query. First complete coverage pass: 100% all four metrics. Production build passed with elevated execution after sandbox CSS worker stalled; no build-pipeline change.

Phase 2: catalog page and all discovery links implemented; unit loading/empty/error/retry/paging/refresh/focus paths pass. Full coverage rerun after timestamp normalization: 100% (2750 statements, 1691 branches, 814 functions, 1875 lines). Lint/typecheck passed. Production build passed. Targeted production integration running with disposable fixtures.

Gate repair: npm audit identified 16 moderate transitive tooling findings rooted in GHSA-3g3m-2fjr-6pw4 (glob <=14.0.1) and GHSA-g3hv-75wg-m249 (minimatch <11.0.1). Registry verified current glob14.0.4/minimatch11.0.5; upstream advisory/changelog reviewed. Narrow vulnerable-range overrides preserve older unaffected minimatch3/5 consumers. Revalidate lint, typecheck, unit coverage, production/Storybook builds and disposable integration; no forced framework/tool downgrade or advisory suppression.

Review improvement: add a scoped public-profile 404 with a keyboard-accessible Browse mentors return link, rather than leaving discovery users at the framework default. Unit and production keyboard navigation checks added; revalidate after the running full suite stops (never rebuild its live .next).

Full configured integration suite passed on the catalog implementation with patched dependencies (database migrations/constraints, catalog, mentor home, prices, availability, auth, invitation/profile/admin flows, independent QA, actual database outage/recovery and installer preservation/cleanup). Final recovery-page follow-up: lint/typecheck passed; unit coverage 100% (2751 statements, 1691 branches, 815 functions, 1876 lines). Rebuild and targeted catalog verification pending.

## Final verification and outcome

Implemented on PR #41; design remains separate on PR #40. All implementation steps complete. Final `npm run lint`, `npm run typecheck`, `npm run test:coverage` passed; coverage remains 100% in all four metrics (2751 statements, 1691 branches, 815 functions, 1876 lines). Production build passed after the scoped profile-404 follow-up; targeted catalog integration passed again against that final build, including 404 keyboard return and a narrow screenshot. The configured full integration suite passed before this isolated recovery-page follow-up, covering the unchanged DB/API/UI core plus all existing flows. `npm audit` passed with zero findings. Storybook build passed with patched transitive tooling. Diff whitespace and documentation paths/links checked.

Changed areas: bounded db catalog projection, core validation/service/scoped composition, additive no-store API, catalog page/summary/pagination/feedback/refresh, account/workspace/public-profile navigation, scoped unavailable-profile recovery, unit and disposable integration tests, compatibility/readme guidance and raw-timestamp lesson. No schema migration or auth/CSRF changes. Security overrides are isolated in their own commit as the mandatory audit repair.

Code/compatibility/security review found no remaining blocker/major code findings; its one recovery-page improvement is fixed and verified. The authenticated GitHub identity is also the author, so review is recorded as COMMENT rather than claiming independent approval. Human second-person review and manual QA (`needs-qa`) remain merge gates. No QA sign-off or merge performed. Screenshots use disposable synthetic fixtures and live on the separate `qa-evidence-issue36` branch; primary checkout and developer database preserved. Latest remote required checks are reported on the PR separately from local evidence; a final documentation push may leave them pending.
