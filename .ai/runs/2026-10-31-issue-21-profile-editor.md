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
- [ ] 2.1 Match editor/share composition and topic chips; retain save/publication/error flows and test them.
### Phase 3: Verification
- [ ] 3.1 Verify consumers, browser/story evidence, full validation and review; report limits.

## Activity
- Read issue, spec, engineering rules, lessons and installed Next client-boundary guide. No competing implementation PR or claim found.

- Name persistence: strict optional trimmed 1–100, protected fields denied, name omission preserved; PostgreSQL proves rollback, session/admin/public consumers and serialized role removal. Unit coverage is 100%.
