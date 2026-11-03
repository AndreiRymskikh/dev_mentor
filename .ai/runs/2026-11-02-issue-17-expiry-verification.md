# Issue 17 — remaining expiry verification

## Goal and scope

Verify the remaining acceptance work in issue #17 against develop at `1e259e9`. The issue records that implementation shipped in PR #26; do not reimplement S05. Authority: [E01 specification](../specs/2026-10-29-e01-v2-screenshot-ui.md), [original implementation run](2026-10-29-e01-v2-ui.md).

## Plan

1. Check issue ownership, current scope, and existing implementation/test evidence.
2. Run existing unit coverage and disposable integration QA where possible.
3. Record a focused acceptance matrix and distinguish automated checks from native password-manager and real browser zoom verification.
4. Fix concrete failures only; retain manual checks as outstanding unless actually observed.

## Progress

- Issue is open, unassigned, without an active claim or open implementation PR.
- Current scope explicitly preserves native password-manager/autofill and manual 200% browser zoom checks, plus focused keyboard/focus/logout/Back/expiry evidence.
- Existing spec and PR #26 already record implementation and automated verification. No production change is justified by triage alone.
- Primary checkout contains unrelated untracked run logs; preserve them.

## Validation

- `npm run test:coverage`: PASS — 40 test files, 186 tests; 100% statements, branches, functions and lines. Initial sandbox run failed two local socket probes; the elevated rerun passed without changing code or thresholds.
- `git diff --check`: PASS (tracked diff empty; this new run document reviewed separately).
- `npm run test:integration -- --scenario=qa`: PASS — disposable database migration/rollback/security checks and real login, roles, CSRF, reset/replay/logout, synthetic loading/error/retry, keyboard and desktop/320px browser checks. Runner completed cleanup. Uses the pre-existing October 29 production build, so this is a smoke result for that build, not current-develop browser acceptance. The initial sandbox invocation failed IPC creation; the elevated rerun passed.

## Focused acceptance matrix

| Requirement | Current evidence | Remaining verification |
| --- | --- | --- |
| Expiry display only; empty credentials | Fresh `e01-frames.test.tsx` pass | Native manager save/fill |
| Protected read/mutation cleanup | Fresh `admin-ui.test.tsx` pass; both 401 and 403 remove private DOM | Current production-browser expiry |
| 401 recovery versus 403 denial / 503 retry | Fresh `session-recovery.test.tsx` pass | Focused current browser matrix |
| Cancel obsolete requests without stale updates | Fresh resource-hook cancellation tests pass | Current production-browser race checks |
| Keyboard and focus | Fresh frame/form tests pass; historical PR #26 browser evidence | Native expiry-page keyboard pass |
| Logout and Back | Existing QA runner verifies logout and a subsequent protected navigation | Actual browser Back acceptance remains open |
| Narrow layout at 320/390px, light/dark | Historical PR #26 built-story/browser evidence | Current page inspection and real browser 200% zoom |

## User response

The user will perform native password-manager and real 200% browser zoom checks after implementation. Explained that implementation is already merged in PR #26 and available to test. Do not treat this response as a passing result or waiver.

## Outcome

No production change justified by triage. Issue remains open for acceptance; no duplicate PR, claim, spec-completion marker or QA approval. Native password-manager save/fill and actual browser zoom must be observed directly; scripted field fill, DOM attributes, CSS zoom and viewport resizing do not prove those checks. Lint, typecheck, build, audit and the full integration suite were not run in this verification-only task.
