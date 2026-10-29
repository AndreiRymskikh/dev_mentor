# E02 independent review and QA — PRs #9 / #10

Status: complete
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

## PR #10 finding and correction

Merged #9's documentation-only correction, then a separate reviewer found a major cancellation bug:
useApiResource aborted pending fetches on effect cleanup but left apiCall's rejection unhandled.
The old stale-response test resolved after abort and missed actual fetch rejection. Added a regression
that rejects on AbortSignal for URL change and unmount; before the fix Vitest exits1 with two unhandled
AbortErrors. The hook now handles cancellation without stale state and provides safe retry feedback
for unexpected request rejection. Added invalid-path/recovery assertions. Targeted 11 UI tests pass.

Initial pre-fix gate: lint/typecheck/165-test100% coverage/build passed; integration failed the existing
stalled-SMTP elapsed-deadline assertion. No test/deadline weakened. Final post-fix gate and separate
browser QA remain pending. This run will report the actual final outcome, not infer it from earlier CI.

## Final PR #10 verification and outcome

Separate reviewer verified the cancellation correction; no remaining static findings. The complete
post-fix configured gate passes: lint, typecheck, 167 tests at100% per-file all-four coverage, standard
Turbopack build, full native disposable PostgreSQL/SMTP/auth/admin/invitation/profile/browser/outage/
installer integration and audit zero vulnerabilities. The earlier SMTP timing failure remains recorded;
the fresh complete run passed with unchanged timeouts/assertions. No production source changed after
791cdb9; this final handoff changes metadata only.

Independent QA passes11 exercised groups:7 browser groups and4 HTTP groups, with direct DB assertions.
Empty/partial drafts, readiness/publish, clipboard success-then-denial, published-data retention,
actual delayed loading/503/retry, keyboard,2000-character owner/public320px+1280px light/dark, current
ownership/CSRF denial, exact public allowlist and stable unpublish/republish/rename links all pass.
Browser React cleanup cancellation could not be proved with native anchor navigation and is explicitly
NOT_EXERCISED; the rejecting-on-abort unit regression and static re-review prove the fix separately.
Multiple-browser-timezone checks are also not claimed. Reports distinguish browser and HTTP/DB evidence
and record corrected harness assumptions (readiness422, trimmed fixture whitespace). Owned resources
were cleaned. Fresh evidence is published on PR #10's dedicated screenshot branch.

#9 final documentation-head CI completed all four jobs successfully at a0d3b60:
https://github.com/AndreiRymskikh/dev_mentor/actions/runs/40660729417
#10 final head CI is reported on the PR after this metadata commit; not inferred from local evidence.

Both user-requested independent-agent review/QA passes and fixes are complete. Formal second-person
GitHub review and high-risk QA approval remain external requirements because the authenticated account
is the PR author. No self-approval, QA signoff or merge was performed. Merge #9 first, then refresh #10
from develop after squash merge. Cleanup removes only this run's isolated worktrees and temporary services.
