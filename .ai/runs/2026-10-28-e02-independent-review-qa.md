# E02 independent review and QA — PRs #9 / #10

Status: in-progress
Start: 2026-10-28
Goal: independently review and exercise #9 first, fix findings, then repeat for #10. No merge.

## Plan and acceptance

1. Claim #9, review its exact head in isolation with a separate reviewer and inherited feedback.
2. Run all configured gates and fresh independent browser QA with disposable fixtures.
3. Fix verified findings with regression tests, re-review/retest, publish evidence and release claim.
4. Bring the #9 prerequisite forward into #10, then independently review/QA its profile scope.
5. Publish exact head/results, labels and remaining external approval requirements; clean owned environments.

Risks: invitations grant current roles, both slices migrate persistence, public profile privacy, shared UI
contracts and stacked branches. Preserve self-service, developer data and current sessions. Never weaken
gates or reset Compose; use owned Testcontainers PostgreSQL and production processes only.

## Progress

- #9 checked out at cd0f5ba; no foreign active claim. Separate code reviewer found no blocking
  correctness/security defect, and one minor spec mismatch: event payloads promised but only fixed-name
  best-effort notifications exist. Corrected the specs to match the actual deliberately minimal observer
  contract, with no existing consumers or event-bus infrastructure. No production behavior change.
- Separate QA reviewer is authoring a fresh scenario; existing authored integration tests alone are not
  presented as independent QA. Primary runs the full configured gate. Results pending.
- GitHub account remains the PR author; separate-agent findings/evidence do not impersonate a different
  GitHub reviewer or apply author approval. High-risk no-self-QA rules remain in effect.

## PR #9 result

Separate static reviewer verified the fixed minor event-spec mismatch; no outstanding code findings.
Fresh full gate PASS: lint, typecheck, 146 tests at 100% lines/statements/functions/branches per file,
standard build, complete native disposable DB/SMTP/auth/admin/invitation/browser/outage/installer
integration and audit (zero vulnerabilities). No timeout or gate weakening.

Independent QA PASS 15/15 on cd0f5ba: anonymous/invalid states, wrong account and matching unverified
user denial, expiry, real CLI resend/revoke, long email at 320px light/desktop dark, login continuation,
visible keyboard focus, revoked-after-render error, delayed pending/disabled/aria-busy/status feedback,
retained original session/equal first deadline, one-use link and preserved optional self-service.
Browser evidence is distinguished from HTTP/DB assertions in the report. Multiple browser timezones
were not exercised; semantic datetime/current-zone rendering checked. All owned resources cleaned.
Reports/screenshots published to PR #9 on a dedicated evidence branch. Follow-up commit changes only
spec/run documentation; tested production source is unchanged. Formal second-person GitHub review and
high-risk QA approval remain required; no self-signoff or merge. PR #10 review/QA next.
