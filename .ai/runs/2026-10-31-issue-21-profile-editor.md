# Issue 21 — Profile editor

Goal: deliver screenshot03 and atomic account-wide display-name saving.
Source doc: .ai/specs/2026-10-29-e02-v2-screenshot-ui.md (V2-S02 only).

Scope: strict optional name update, existing locked transaction, two-column editor/share layout, topic chips, recoverable errors and existing publication operations. No reviews, payouts, email/role/slug edits or new schema.
Risks: account-wide identity presentation; preserve old callers and public DTO, role checks and transaction rollback. #13 shell is present on base; merged design #18 defines this bounded slice. User implementation request authorizes this slice.
Validation: lint, typecheck, 100% coverage, build, disposable PostgreSQL/browser integration, audit; independent review and screenshots. Do not claim CI from local checks.

## Progress

### Phase 1: Name persistence
- [x] 1.1 Extend schema/service/repository and meaningful unit/database tests.
### Phase 2: Editor
- [x] 2.1 Match editor/share composition and topic chips; retain save/publication/error flows and test them.
### Phase 3: Verification
- [ ] 3.1 Verify consumers, browser/story evidence, full validation and review; report limits.

## Activity
- Read issue, spec, engineering rules, lessons and installed Next client-boundary guide. No competing implementation PR or claim found.

- Name persistence: strict optional trimmed 1–100, protected fields denied, name omission preserved; PostgreSQL proves rollback, session/admin/public consumers and serialized role removal. Unit coverage is 100%.

- Editor implemented in 17e7330: two columns, status, name/help, mentoring/work fields, selected icon chips, Cancel/Save/publication controls, readable selectable share URL and private preview. App stories live outside ui to preserve dependency direction.
- Lint/typecheck/Storybook typecheck pass; all 174 unit tests and 100% statements/branches/functions/lines pass. Eight light/dark editor stories pass accessibility and interactions. Clean standard Turbopack build passes after preserving a stale sandbox build cache.
- Full integration passed database/auth/invitation checks, then caught icon text changing checkbox accessible names. Corrected decorative spans to aria-hidden and rerunning profile flow; do not treat first full run as passed.
- Mandatory npm audit fails: 25 moderate, zero high/critical; no dependency/lock changes. Proposed automated direct fixes are breaking downgrades (Storybook/Testcontainers/ESLint/Next lint). No downgrade or suppression applied; full gate remains blocked.

- Final visual inspection found the editor route had inherited no workspace frame. Reused existing Workspace/current-role navigation and LogoutButton, added current profile state, and moved editor stories to app-owned harness paths. Unit coverage, lint/typecheck/story typecheck, all eight story checks and production build pass again. Full production integration rerun now uses this immutable build.
