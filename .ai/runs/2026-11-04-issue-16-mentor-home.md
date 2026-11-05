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
- [x] 2.1 Add deterministic stories and production browser flows for initial/partial/ready and lower-page interactions.
- [ ] 2.2 Run full gate, inspect screenshots/diff and address review findings.
- [x] 2.3 Publish verification and ready PR or document concrete unresolved gates.

## Activity
- Read issue/comments, reference screenshots, specs, lessons, engineering standards, installed Next headers/forms docs and current consumers.
- Created isolated worktree /private/tmp/devmentor-issue16 from current origin/develop; npm ci --ignore-scripts passed.

- Phase 1 committed as cd594c9: shared shell/current-role authorization/deadline, reused price and slot consumers, authoritative progress, public-share panel and unavailable payouts. Slot list now explicitly renders UTC; standalone URLs preserved. Any denied request clears all home controls; aborted obsolete denial is ignored. Embedded prices omit their independent readiness summary to avoid stale duplication.
- Passed lint, application/test typecheck, Storybook typecheck, and all 222 tests with per-file 100% lines/statements/functions/branches (177 executable production/harness files). First sandbox run failed disposable localhost probes; elevated full coverage passed. No thresholds weakened.
- Added deterministic home stories and extended disposable price browser fixtures to cover home 0/1/2/3 progress, atomic failure/retry/duplicate saves, exact UTC persistence, removal, stale-read errors, revocation and light/dark 1440/390/320 screenshots. Browser execution pending.

- Browser evidence on the first production build proved the E02 interaction flow but revealed missing shared frame CSS on `/mentor`: Workspace was previously only consumed inside auth/admin layouts importing frames.css. Added an explicit import and computed sidebar/mobile-collapse/panel-padding assertions. The corrected production build and new screenshots must be verified before claiming visual completion. Recorded the prevention rule in lessons.md.
- Storybook: all 20 home stories/checks passed across light/dark; initial sandbox socket failure resolved by the required elevated retry. Production build passed with lazy database configuration. Full audit: 25 moderate dev-tool findings, no high/critical; production-only audit zero. Suggested automated fixes are breaking downgrades (ESLint 4, Next ESLint 12, Storybook 8, Testcontainers 10), outside this UI slice; audit remains a blocker, not waived.
- Final empty-state/frame import adjustment: lint/typecheck and coverage rerun; all 222 unit tests remain at 100% on all four metrics. Disposable full integration is running against the first immutable production build; home/prices/availability flows and database checks passed so far. Final corrected-build evidence remains pending.

- First full local run and CI run41861969573 stopped at the legacy profile navigation selector `Edit your mentor profile`, after home/prices/availability, DB, auth HTTP/forms/actions and invitation checks passed. Updated the test to click the actual heading-scoped Edit profile link, preserving the home→editor navigation assertion. The corrected production build passes; full final integration is running. Last production change is token-colored progress styling; no TypeScript changed after full 100% coverage.

- Resumed 2026-11-05 in the original run. Corrected-build home/prices/availability and computed desktop/mobile shell checks pass. Inspected initial/ready desktop, light390 and dark320 screenshots: frame styles are correct; at320 checklist links squeezed the description column. Moved small-screen step links below text and added a >=120px description-width browser assertion. Lint and test-source typecheck pass. The full suite continues on the immutable prior build; after it exits, rebuild and rerun the targeted prices/home scenario for the CSS-only adjustment.

## Final evidence — 2026-11-05

- Implementation head: 5ceecd37d7036de57efaf9f2952fb692a2b4d020; remaining commit changes only metadata. PR35 remains draft, Status: in-progress, because the audit gate fails. No merge or issue closure.
- PASS: lint; application/workspace/test typecheck; Storybook typecheck; all222 unit tests with 100% per-file lines/statements/functions/branches; all20 light/dark home story checks; final production build; diff whitespace check.
- PASS: full disposable PostgreSQL/SMTP/production HTTPS/browser integration after the profile selector migration, including owner isolation/CSRF, home0/1/2/3, auth/verification/recovery, invitation deadline, profile/public details, admin/revocation, session expiry, actual database outage/recovery and installer preservation/cleanup. The prior run's old navigation failure was corrected, not skipped.
- PASS: after that suite exited, rebuilt for the CSS-only320px fix and ran `npm run test:integration -- --scenario=prices`; database checks, complete home scenarios, standalone prices, readable >=120px step-description column, computed shell/sidebar/card layout and light/dark1440/390/320 screenshots all passed; owned resources cleaned up. Inspected initial/partial/ready desktop and light/dark narrow screenshots, including the lower table and share panel. The narrow times table intentionally scrolls inside its labelled region; removal was exercised after scrolling.
- Final fixture-only screenshots: public branch `qa-evidence-issue16`, directory `issue16/`, eight `mentor-home-*.png` files; linked inline from PR35. Local copies retained outside the temporary worktree at `/private/tmp/issue16-final-evidence`.
- FAIL: refreshed full npm audit now reports16 moderate tooling findings, zero high/critical; production-only audit passes with zero. The earlier25 findings are historical. No dependency/lockfile changes; automatic suggestions still require breaking Storybook/Testcontainers/Next-ESLint downgrades. Gate is neither waived nor suppressed. Phase2 step2.2 remains unchecked for this reason.
- Author-side full code/compatibility/security review posted as COMMENT review5781975494 with REQUEST CHANGES verdict for audit; no remaining actionable code finding identified. Independent high-risk reviewer and QA are still required; no self-QA label granted. Full current-head CI integration was still running at review publication; build, lint/typecheck and unit coverage were green. Its final result will be reported separately if received before cleanup.

## Outcome / next action

The complete mentor-home code and automated local behavior/visual verification are delivered on PR35. Resolve the tooling audit gate or record an explicit maintainer decision, then obtain independent high-risk review/QA. Resume from this same plan/PR; never duplicate the implementation. Source specs remain active because broader milestones and required gates are unfinished. Rollback restores the previous UI without database or policy changes. Temporary worktree cleanup follows publication of the evidence; the user's primary checkout is untouched.
