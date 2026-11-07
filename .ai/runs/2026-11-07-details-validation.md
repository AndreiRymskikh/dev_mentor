# Public details validation

Goal: align optional sections with conditionally required content and red inline validation on the details editor.

Spec: [public content](../specs/2026-10-29-e02-v2-public-profile-and-reviews.md).

Plan: label added-row/sample content required; clarify optional sections; use field errors for select/confirmation and group errors; remove duplicated validation list; fix CSS specificity; add UI/schema/browser regressions; run lint/typecheck/coverage/build/profile integration.

Risks: preserve empty optional sections/timezone/code, sample ownership gate, draft inputs and first-error focus. Do not relax validation.

Progress: identified default Optional labels on conditionally required content and muted paragraph rule overriding error color.


Implementation: required indicators for added rows/sample content, clear schema messages, inline select/ownership/group errors, removed duplicated error list. Optional timezone/language/code remain blank-saveable; empty sections still save. Scoped muted-paragraph styles exclude error text. First browser pass found native checkbox borders were controlled by platform appearance; added a red outline for invalid ownership confirmation and reran build/browser validation.

Validation so far: lint, typecheck and production build passed. All 226 unit tests passed with 100% lines, statements, branches and functions. Final targeted profile/invitation integration retry passed, including disposable DB/HTTP checks, both-theme computed red ownership-outline/error-text checks, missing sample title message, nested-field focus and optional timezone/code assertions. Inspected dark required-state screenshot. No dependency changes; audit result from earlier same-session run remains 16 existing moderate tooling vulnerabilities; audit not repeated.

Outcome: requested validation correction implemented locally; no remaining blockers. Changed details editor/styles, pure details schema messages, unit/browser regressions, spec clarification and lessons. Diff whitespace passed. No commit, PR or GitHub CI result is claimed.
