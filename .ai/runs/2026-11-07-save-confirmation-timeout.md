# Save confirmation timeout

Goal: dismiss shared profile/details save success after three seconds.
Plan: lifecycle-owned timeout with cleanup, preserve focus/new-save behavior; exact fake-timer regression and real browser expiry checks; lint/typecheck/coverage/build.
Spec: [mentor page](../specs/implemented/2026-09-08-mentor-page.md).
Progress: shared confirmation now expires after 3000ms; new save remounts it. Timer cleanup on unmount prevents stale updates.

Validation: lint, workspace/test typecheck, production build passed. All 228 unit tests passed at 100% lines/statements/functions/branches. Fake timers assert visible at 2999ms, hidden at 3000ms, new-save remount, and cancellation of the owned timer on unmount (unrelated DOM timers are ignored). Targeted profiles integration passed with disposable PostgreSQL/HTTPS/browser; both core profile and optional details show focused visible acknowledgements and then remove them automatically. Diff whitespace passed. Dependencies unchanged; no repeat audit after same-session result of 16 existing moderate tooling vulnerabilities.

Outcome: both shared success messages disappear after three seconds; new successful saves show them again. Previous changes preserved; no commit/PR or GitHub CI result is claimed.
