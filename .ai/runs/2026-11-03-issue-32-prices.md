# Issue 32 — atomic prices and offer readiness

## Goal and authorities

Implement [issue #32](https://github.com/AndreiRymskikh/dev_mentor/issues/32), using the [prices specification](../specs/2026-09-08-mentor-prices.md), [E02 specification](../specs/2026-09-08-mentors-become-bookable.md), engineering standards, and compatibility contracts. Base: develop at 3a6a0cf. Isolated checkout, branch `codex/issue-32`.

## Investigation and prerequisite

Issues #30 and #31 are closed. Availability implementation and owner-approved time boundaries are present. However, #30 has no comments, #6 has no recorded money reconciliation, and the E02 specification still calls USD/bounds unresolved. The availability run explicitly says money reconciliation remains #32's prerequisite. The prices specification separately records PLN approval from 2026-09-10. Issue #32 explicitly prohibits choosing production money policy silently. Asked owner to reconcile to PLN/two decimal places and inclusive 25-minute 90–600 / 50-minute 180–1,200 bounds. No runtime money behavior enabled pending that answer.

## Plan

1. Record confirmed money policy and reconcile conflicting active specifications.
2. Add exact bounded decimal parsing and a lazy fail-closed policy resolver; unit-test precision, input limits, bounds, malformed/unsupported configuration.
3. Add nullable positive integer price columns with additive migration and guarded down migration; atomic ownership/role-checked dual-price repository transactions and allowlisted snapshots.
4. Add authoritative owner and public offer projections using current publication, price validity and qualifying availability; preserve public profile contract and coordinate all consumers.
5. Add authenticated GET/PUT price API, CSRF mutation guard, field-keyed validation, and protected owner form with retained drafts, retry and pending-save exclusion; render public prices and preparation readiness without checkout capability.
6. Update environment examples, README, CI and disposable integration fixtures together. Test migrations/schema parity, owner isolation/revocation, repeated saves, failed writes/reads, readiness expiration and policy changes, and production browser flows.
7. Run lint, typecheck, meaningful 100% unit coverage on all four metrics, audit, build and disposable integration. Keep completion and CI claims tied to actual results. Independent high-risk review/QA remains required before merge.

## Progress and validation

Read repository instructions, lessons, issue #32, dependency issues/comments and relevant source contracts. No production files changed. No checks run yet: implementation awaits the required owner policy reconciliation.

Owner confirmed the complete proposed policy on 2026-11-03. Implementing with explicit required environment policy and no fallback. Separate public offer endpoint preserves the existing profile DTO contract.

## Implementation and evidence

- Recorded owner-confirmed PLN/two-decimal/inclusive bounds and current qualifying availability policy across active specs.
- Added bounded exact decimal parsing, strict lazy policy resolution, owner saved-price/bounds DTO and separately allowlisted public offer endpoint. Existing profile DTO fields remain unchanged.
- Added nullable positive integer columns and guarded down migration. Owner verification/current role is checked under the user lock; both values and response snapshot share one transaction. Readiness uses current publication, valid prices and qualifying slots; booking capability remains false.
- Added `/mentor/prices` and public prices with refresh/error/retry, retained drafts, field errors/focus, duplicate-save exclusion and authorization clearing. Shared time-refresh hook now accepts the minimal timestamp contract.
- Updated environment example, CI, README, compatibility and disposable fixtures. Setup preserves policy keys and single-quotes JSON bounds when writing dotenv, with round-trip regression proof.
- Passed local lint, typecheck, production database-independent build and all 216 unit tests, with 100% lines/statements/functions/branches per production file.
- Disposable PostgreSQL integration passed all existing database groups plus new atomic rollback/retry/concurrency, changed bounds, two-hour expiration/removal, public privacy, role/verification revocation and migration parity/guard checks.
- Local production browser phase could not launch: default socket directory is read-only; after moving sockets into owned `/tmp`, both regular Chrome and headless Chrome fail at macOS `bootstrap_check_in` MachPortRendezvousServer permission denial. No browser success or visual QA claim. The disposable app/database were cleaned up; developer Compose data was untouched.
- Online `npm audit` reports 27 moderate existing dependency findings (glob/minimatch and tooling dependents), no high/critical and no available fixes. No dependency or lockfile changes. Audit is not clean; this is a remaining gate, not suppressed.

Next: push reviewable implementation, run all four CI jobs (including actual Linux browser scenarios), inspect evidence, and retain independent high-risk review/QA requirement before merge. Do not close #32 or mark its source spec implemented while these verification gates remain.
