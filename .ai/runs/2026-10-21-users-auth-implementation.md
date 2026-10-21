# Users/auth implementation

## Goal
Implement [spec](../specs/2026-10-16-users-auth-application-primitives.md) using a subagent and separate commit per task. Owner defers GitHub auth to a coming-soon button and requires a manual checkpoint after each phase.

## Plan and acceptance
See [tracker](../../track.md). Deliver database foundation, registration/email, credentials, UI, administration, final review in sequence. Preserve boundaries and lazy persistence. Require meaningful 100% unit coverage, lint/typecheck/audit/build and relevant disposable PostgreSQL/mail/browser checks. Never reset developer data. Pause after phase 1 for manual testing.

## Inspection and progress
Read spec, engineering standards, compatibility contract, lessons index and Storybook lesson. DB currently has type contracts only; reuse existing HTTP/UI/DI helpers. Existing untracked `.ai/prototypes/`, `.ai/runs/2026-10-20-accounts-screen-map.md` and `lekcja-07/` are outside scope.

Created tracker before implementation. No checks or implementation claimed yet.

## Risks
Security-sensitive transactions/schema need independent review before final acceptance. Disposable email tests cannot establish production SMTP delivery. Do not implement deferred GitHub protocol or speculative abstractions.
