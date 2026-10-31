# Issue 20 — Invitation landing

Source doc: .ai/specs/2026-10-29-e02-v2-screenshot-ui.md
Issue: #20. Design PR #18 is merged. Scope: V2-S01 only.
Engine: om-auto-create-pr (steps: 4, --loop: no)

## Goal and acceptance

Complete screenshot01 with account-aware public framing, responsive hero/card/chips/footer, configured publication window and real invitation expiry. Preserve existing services, identity/session/role contracts and optional self-service enrollment. Retain only exact validated invitation continuation through registration, verification, recovery and login in bounded first-party transient state; never log tokens.

## Plan and risks

1. Compose invitation presentation with semantic tokens, safe invalid/error/account states and retry.
2. Add bounded validated auth continuation without broadening redirect destinations.
3. Cover all changed production code at 100%; add stories and isolated production browser scenarios including interruption, role/session preservation and narrow/dark layouts.
4. Run full configured gate, independent review and browser QA; publish implementation PR referencing #18 and closing #20.

Affected areas: invitation route, auth UI, shared invitation presentation, stories and tests. No schema/API/authentication replacement. Publication deadline is computed on acceptance; show persisted invitation expiry before acceptance and configured acceptance-relative window. Risks: stale continuation, storage denial, token disclosure, duplicate accepts, misleading navigation to absent catalog. Use TTL/validation, no logging, generic failures and existing account destinations.

## Progress

PR: #27

> Convention: `- [ ]` pending, `- [x]` done.

### Phase 1: Invitation landing and continuation

- [x] 1.1 Complete invitation presentation and safe states — 6d20af0
- [x] 1.2 Preserve exact invitation auth continuation — cdbd421
- [x] 1.3 Add unit, story and isolated browser coverage — a3723f3, fef101c
- [ ] 1.4 Validate, review and publish evidence

## Validation

Passed: lint, workspace/test typecheck, Storybook typecheck, production build, all 174 unit tests with 100% lines/statements/functions/branches across 145 measured executable files; 16 invitation story checks across light/dark Chromium. Full disposable PostgreSQL/browser suite passed; the final presentation refinement additionally passed a sequential build plus invitation-only suite.

Audit failed: 25 moderate findings from glob/minimatch in existing Storybook/ESLint/Testcontainers chains (GHSA-3g3m-2fjr-6pw4, GHSA-g3hv-75wg-m249). Forced recommended fixes downgrade major tooling; no blanket overrides/downgrades or threshold changes applied. This blocks a complete gate/approving verdict.

Sandbox-localhost failures in initial coverage/story runs passed on authorized elevated retry. Initial sandbox build stalled and was stopped; authorized normal production build passed without pipeline changes. Developer primary checkout and database were not modified.

Changed files: invitation route; shared InvitationView/export/frames CSS; auth form/action form and bounded invitation-return helper; unit/security regression tests; invitation story variants; disposable browser scenario/runner; compatibility notes and lessons.

Final independent review and human QA remain required; no approval or merge is claimed.

First full integration passed DB and HTTP suites, then browser navigation could not load after an overlapping rebuild changed the served `.next` assets. This run is not counted as passing. Final full rerun uses an immutable completed build; no threshold/assertion was weakened. Non-default 9-day publication configuration is now asserted in browser and against the persisted deadline.

## Final code and evidence

Presentation refinement fef101c restores brand/nav styling, uses truthful unavailable-catalog copy, aligns the desktop hero with the card and captures complete pages. Visual inspection checked full desktop and 320px pages including footer and safe long-email wrapping. The final screenshot capture explicitly sets light media before the light variants and verifies dark media for the dark variant.

Full integration passed: database migration/guarded rollback/constraints, registration/verification/recovery SMTP and HTTP, all auth browser forms/actions, invitation interruption/deadline/session checks, mentor profile, admin, independent auth QA, outage recovery and installer/resource cleanup. Final invitation-only run passed against the refined production build. Final explicit light/dark invitation-only run also passed, with full-page screenshots at desktop/tablet/390/320px.

Local author review found no additional code findings; mandatory audit remains a blocker. This is not second-person approval. The PR stays draft/in-progress; complete-gate step 1.4 remains unchecked. No merge, QA approval, whole-spec completion or all-green CI is claimed. Final PR CI remains separately reported rather than inferred from local results. Latest head CI was queued at the final status check; no CI completion is claimed.

Evidence: [production screenshots](https://github.com/AndreiRymskikh/dev_mentor/tree/qa-evidence-issue20-20261031/issue20). [Author review and gate findings](https://github.com/AndreiRymskikh/dev_mentor/pull/27#issuecomment-6542570994). Final outcome: implementation and local functional/UI validation complete; audit remediation and independent review/QA block readiness. Issue and PR work locks released at handoff; no merge performed.
