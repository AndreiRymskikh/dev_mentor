# Profile save confirmation

Goal: give profile Save changes the same prominent visible success feedback as public details.
Spec: [mentor page](../specs/implemented/2026-09-08-mentor-page.md).
Plan: extract shared SaveConfirmation with green styling and focus on mount; apply to core profile beside save form and existing details; preserve pending/failure/non-save notices; test focus after resource reload and real browser save visibility; run mandatory validation.
Risk: profile reload unmounts content, so confirmation must refocus on remount after authoritative reload. Preserve all earlier local work.
Progress: found plain profile acknowledgement below columns; shared component implementation started.

Shared SaveConfirmation now owns green success styling and focus on mount/message change. Both details and profile use it; profile places it inside the edit card immediately after the form. Copy/unpublish notices retain their own text. New requests clear stale confirmation. Lint/typecheck/build passed; all 227 unit tests passed at 100% lines/statements/functions/branches, including focus after profile reload. Targeted profiles integration passed with owned disposable PostgreSQL/HTTPS/browser. Real Save changes confirmed the success panel is focused, fully visible and distinct after authoritative reload; optional preview, details saving and existing publish flows also passed. Inspected confirmation screenshot. Dependencies unchanged; audit not repeated after the same-session audit reported 16 existing moderate tooling vulnerabilities.

Outcome: shared save acknowledgement implemented for both profile forms. Diff whitespace check passed. No commit/PR or GitHub CI result is claimed; previous local changes preserved.
