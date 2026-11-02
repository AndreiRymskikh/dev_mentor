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


### Final regression refinements

- Draft [PR #33](https://github.com/AndreiRymskikh/dev_mentor/pull/33), implementation c7808e0. Initial CI build, lint/types and unit-coverage jobs passed; full integration pending at this entry.
- Strengthened the public refresh test to assert the eligible-to-disabled transition, rather than merely counting refetches. Concurrent database publication now includes equivalent explicit offsets; a fresh disposable run passed this case and the migration/ownership/time-boundary checks.
- Final local lint/typecheck and all 199 unit tests pass with 100% production metrics (2,416 statements, 1,425 branches, 711 functions, 1,657 lines). Production build passes. Browser execution remains blocked locally as described above.
- A temporary standalone ESM probe loaded ORM entity metadata through mixed module paths and failed before the fixture; the same probe using the existing test suite's CommonJS module path passed. No production change was made for this harness-only issue. Prefer the canonical integration runner; keep standalone ORM probes consistent with its module loading.

### CI evidence and outcome

All four CI jobs passed on implementation c7808e0 in [run 41424891610](https://github.com/AndreiRymskikh/dev_mentor/actions/runs/41424891610): lint/types, production build, 100% unit coverage, and the full disposable PostgreSQL/SMTP/HTTPS/production HTTP/browser/outage/installer suite. Availability browser acceptance passed for UTC publication, ownership/CSRF/revocation, duplicate conflict, remove/republish, resource/public retry, eligible/disabled/empty states and narrow light/dark layouts. [Integration evidence](https://github.com/AndreiRymskikh/dev_mentor/actions/runs/41424891610/artifacts/13131439127) includes the ten availability screenshots.

The following handoff adds only regression assertions and documentation, with unchanged production code. Its own CI must be checked separately; the implementation run does not certify a later head. Feature implementation and automated acceptance are delivered; audit remediation and independent high-risk review/QA remain pre-merge gates. Keep the PR draft and the issue open.
