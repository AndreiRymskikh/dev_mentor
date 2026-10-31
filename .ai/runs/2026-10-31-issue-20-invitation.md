# Issue 20 — Invitation landing

Source doc: .ai/specs/2026-10-29-e02-v2-screenshot-ui.md
Issue: #20. Design PR #18 is merged. Scope: V2-S01 only.
Engine: om-auto-create-pr (steps: 4, --loop: no)

## Goal and acceptance

Complete screenshot01 with account-aware public framing, responsive hero/card/chips/footer, configured publication window and real invitation expiry. Preserve existing services, identity/session/role contracts and optional self-service enrollment. Retain only exact validated invitation continuation through registration, verification, recovery and login in bounded first-party transient state; never log tokens.

## Plan and risks

1. Compose invitation presentation with semantic tokens, safe invalid/error/account states and retry.
2. Add bounded validated auth continuation without broadening redirect destinations.
3. Cover all changed production code at 100%; add stories and isolated production browser scenarios including interruption, role/session preservation and narrow/dark layouts.
4. Run full configured gate, independent review and browser QA; publish implementation PR referencing #18 and closing #20.

Affected areas: invitation route, auth UI, shared invitation presentation, stories and tests. No schema/API/authentication replacement. Publication deadline is computed on acceptance; show persisted invitation expiry before acceptance and configured acceptance-relative window. Risks: stale continuation, storage denial, token disclosure, duplicate accepts, misleading navigation to absent catalog. Use TTL/validation, no logging, generic failures and existing account destinations.

## Progress

- [ ] 1.1 Complete invitation presentation and safe states
- [ ] 1.2 Preserve exact invitation auth continuation
- [ ] 1.3 Add unit, story and isolated browser coverage
- [ ] 1.4 Validate, review and publish evidence

## Validation

Not run yet.
