# Registration acceptance feedback — 2026-10-22

## Goal and evidence

The owner’s manual screenshot showed a successful202 registration response with a subtle paragraph below the unchanged form. Sign-in was below the fold, making acceptance and next steps unclear. Improve presentation without claiming that an account exists, delivery succeeded, or login is available before verification.

Relevant specification: [users/auth](../specs/2026-10-16-users-auth-application-primitives.md). This is a phase4 manual-testing correction; phase5 remains unstarted.

## Plan and acceptance criteria

- Replace the accepted registration form with a prominent “Request accepted” heading and generic check-email guidance.
- Focus the new heading, remove password controls, and expose sign-in and resend links with explicit verification-before-sign-in instructions.
- Retain GitHub coming-soon on initial registration/login; the accepted screen prioritizes verification next steps.
- Preserve login/recovery retry behavior and all server authentication/security contracts.
- Verify meaningful unit100% coverage, lint/typecheck, parent production build/audit and disposable browser/integration, including desktop/mobile success screenshots.

## Implementation

- `packages/app/src/app/(auth)/auth-form.tsx`: terminal accepted registration presentation with focused heading, generic status, guidance and visible next-step links. Initial forms/GitHub feedback and login/recovery remain compatible.
- `tests/auth-ui.test.tsx`: assert terminal acceptance, focus, no retained password DOM, single status, links, duplicate prevention and recovery invalid retry.
- `tests/integration/scenarios/auth-forms.ts`: real registration acceptance removes the form, focuses heading, keeps both links within desktop/320px viewport and captures both accepted-state screenshots.
- `README.md`, `track.md` and `.ai/lessons.md`: manual instructions, completed correction task/evidence and prevention rule; owner manual acceptance remains unchecked.

## Validation and handoff

Initial sandbox coverage:110/112 passed; two existing localhost-listener tests failed with EPERM. The changed production file reached100%; the overall run failed and is not a passing gate. Final escalated coverage retry passed112 tests with100% statements(1139/1139), branches(693/693), functions(289/289), and lines(867/867);77 executable production/test-setup files fully covered,15 type-only empty files skipped by the reporter. Lint and all-workspace/test typecheck passed. `git diff --check` passed. Parent final verification completed successfully:

- `npm run build`: passed (production default build, exit0).
- `npm run test:integration`: passed (exit0), including the new accepted desktop/mobile viewport, focus, single-status and removed-form checks, real disposable SMTP/database/HTTP flows, verification/reset/replay/logout, home and admin404 expectations, and installer/resource cleanup.
- Parent inspected `auth-register-accepted-desktop.png` and `auth-register-accepted-mobile.png`: prominent acceptance heading, readable guidance, and both next-step links visible; no visual findings.
- `npm audit --json`: existing6 high and5 moderate advisories remain; no dependency upgrades or advisory suppressions were introduced.

Implementation and automated verification are complete; owner manual acceptance remains unchecked. Parent will review and commit this correction. No CI or owner manual acceptance is claimed. No developer configuration/data changes, no phase5 work, and no GitHub OAuth.
