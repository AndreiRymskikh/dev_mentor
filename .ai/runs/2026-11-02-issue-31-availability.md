# Issue 31 — owned availability

Goal: implement [#31](https://github.com/AndreiRymskikh/dev_mentor/issues/31) against current develop, preserving ownership, no-store API envelopes and public allowlists.

## Accepted owner decision — 2026-11-02

In this chat the owner confirmed: publication accepts strictly future instants no more than six months ahead; public eligibility includes exactly two hours ahead and ends immediately after that boundary; availability progress requires at least one currently eligible, unremoved slot. This resolves #30's availability questions only; money policy remains #32's prerequisite.

Six months means six UTC calendar months, preserving time of day and clamping the day to the destination month's last day. Upper bound is inclusive. Server clock is sampled after acquiring mutation locks. Progress is read-time qualification, never persisted; expiration makes it false without a write. Public future slots inside two hours remain visible with a disabled explanation. No booking capability is implied.

## Plan

1. Reconcile time-policy sources and add schema/migration with populated rollback guards.
2. Add user-first locked repository, explicit instant validation/service, owner/public DTOs, scoped DI and protected APIs.
3. Deliver /mentor/slots and public availability with real clocks, UTC input, shared feedback/forms/tables, retry and private-state handling.
4. Verify exact boundaries, ownership, revocation, concurrent publication/removal, schema parity/rollback, HTTP/browser flows and required checks. Independent high-risk review remains a pre-merge requirement.

## Progress

- Read issue, current #30/#6 state, specs, engineering standards and lessons. #30 closed with no accepted policy in current develop; obtained missing time decisions directly from owner.
- Created isolated checkout on codex/issue-31-availability; existing unrelated local changes preserved.
- Installed locked dependencies offline.

## Validation

Pending implementation. No tests claimed passed.

### Implementation and local verification

- Added Slot entity, additive Migration202611020001, active-start partial unique index and preserved publication history. Corrected migration FK update semantics after the schema-parity test exposed a mismatch with MikroORM metadata.
- Added explicit ISO/UTC schemas, six-calendar-month publication validation sampled under user lock, read-time eligibility/progress, safe owner/public projections, scoped service/repository and no-store session/CSRF APIs.
- Added /mentor/slots, link from mentor home, public profile availability, shared form/table/feedback, UTC input, labelled local display, past toggle, retry/pending protections and time/visibility refresh. Refresh subtracts request round-trip time so transport latency does not extend eligibility.
- Added boundary/ownership/security/concurrency/rollback and browser regression coverage; adjusted existing details rollback target to keep testing its own migration after the additive migration.
- Local lint, typecheck, 198 unit tests with 100% statements/branches/functions/lines and production build passed before final verification. Final check results are recorded below when complete.
- Disposable PostgreSQL suite passed including availability integration, schema up/down/parity, populated rollback guards, concurrent duplicates/remove/republish, current roles and private public profiles.
- Local production browser suite cannot launch Chromium: macOS sandbox denies MachPortRendezvousServer bootstrap registration. Workspace-local browser socket resolved the separate home-directory write restriction; both installed Chromium and headless shell still fail at the OS process boundary. No browser pass is claimed. GitHub's unrestricted Linux integration job will exercise the committed browser suite.
- npm audit reports 27 moderate findings in existing tooling chains, no high/critical findings. package-lock.json is unchanged. No available safe automated fix for the direct affected tooling; no overrides/downgrades/suppressions introduced. Audit remains a merge blocker, separate from availability.
- Independent high-risk review/QA remains required before merge. No merge, approval or issue closure is claimed.
