# Issue 16 — complete mentor home

Goal: compose the initial, partial and ready mentor workspace from shipped E02 contracts.

Source doc: .ai/specs/2026-10-29-e01-v2-screenshot-ui.md (S04 only); .ai/specs/2026-10-29-e02-v2-screenshot-ui.md (initial workspace).

## Scope and acceptance
Shared workspace shell, current identity/deadline, authoritative three-step progress, atomic price form/bounds, UTC publication, paginated availability/actions, and truthful public-share/payout states. Reuse E02 services/APIs and forms; retain existing standalone consumers. No booking, cancellation, payments, schema or policy changes.

Dependencies: #31 availability and #32 prices are merged on origin/develop at d89add4. PR #34 records accepted PLN policy and passed four CI checks. Source specs retain historical pending verification notes; these are not proof of missing code. Issue has no assignee, claim or implementing PR.

## Plan and risks
Keep form drafts outside loading boundaries. Read progress from the authoritative prices/readiness DTO; refresh after saved prices and slot changes, at time boundaries and visibility. Hide stale completion/share state on errors/loading. Current authorization denial clears all private controls; APIs retain owner isolation/CSRF. Use existing generic form/table and protected request helpers. Preserve existing URLs. Main risks: stale readiness, draft resets, role revocation, narrow table readability and confusing prepared offers with booking launch.

Verification: meaningful unit tests and full per-file coverage; lint, typecheck, production build, disposable PostgreSQL/production HTTP/browser integration, audit; Storybook initial/partial/ready/error/pending/unavailable states and light/dark 1440/390/320 screenshots. Report external failures as failures. Independent high-risk review/QA required before merge.

## Progress

PR: #35

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Compose the workspace
- [x] 1.1 Verify E02 entry contracts and compose workspace sections with reused forms and authoritative refresh.
- [x] 1.2 Add meaningful unit coverage for progress, sharing, draft retention, mutations and denied/error states.

### Phase 2: Verify and deliver
- [ ] 2.1 Add deterministic stories and production browser flows for initial/partial/ready and lower-page interactions.
- [ ] 2.2 Run full gate, inspect screenshots/diff and address review findings.
- [ ] 2.3 Publish verification and ready PR or document concrete unresolved gates.

## Activity
- Read issue/comments, reference screenshots, specs, lessons, engineering standards, installed Next headers/forms docs and current consumers.
- Created isolated worktree /private/tmp/devmentor-issue16 from current origin/develop; npm ci --ignore-scripts passed.

- Phase 1 committed as cd594c9: shared shell/current-role authorization/deadline, reused price and slot consumers, authoritative progress, public-share panel and unavailable payouts. Slot list now explicitly renders UTC; standalone URLs preserved. Any denied request clears all home controls; aborted obsolete denial is ignored. Embedded prices omit their independent readiness summary to avoid stale duplication.
- Passed lint, application/test typecheck, Storybook typecheck, and all 222 tests with per-file 100% lines/statements/functions/branches (177 executable production/harness files). First sandbox run failed disposable localhost probes; elevated full coverage passed. No thresholds weakened.
- Added deterministic home stories and extended disposable price browser fixtures to cover home 0/1/2/3 progress, atomic failure/retry/duplicate saves, exact UTC persistence, removal, stale-read errors, revocation and light/dark 1440/390/320 screenshots. Browser execution pending.

- Browser evidence on the first production build proved the E02 interaction flow but revealed missing shared frame CSS on `/mentor`: Workspace was previously only consumed inside auth/admin layouts importing frames.css. Added an explicit import and computed sidebar/mobile-collapse/panel-padding assertions. The corrected production build and new screenshots must be verified before claiming visual completion. Recorded the prevention rule in lessons.md.
- Storybook: all 20 home stories/checks passed across light/dark; initial sandbox socket failure resolved by the required elevated retry. Production build passed with lazy database configuration. Full audit: 25 moderate dev-tool findings, no high/critical; production-only audit zero. Suggested automated fixes are breaking downgrades (ESLint 4, Next ESLint 12, Storybook 8, Testcontainers 10), outside this UI slice; audit remains a blocker, not waived.
- Final empty-state/frame import adjustment: lint/typecheck and coverage rerun; all 222 unit tests remain at 100% on all four metrics. Disposable full integration is running against the first immutable production build; home/prices/availability flows and database checks passed so far. Final corrected-build evidence remains pending.
