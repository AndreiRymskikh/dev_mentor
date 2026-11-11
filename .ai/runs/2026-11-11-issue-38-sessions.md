# Issue #38: My sessions

Goal: replace the account placeholder with authoritative participant bookings and existing private management actions.
Source doc: .ai/specs/2026-11-11-my-sessions.md

## Plan
1. Review the list contract extension and publish its design PR.
2. Implement bounded list, refresh, pagination and private-detail links without a second state machine.
3. Add meaningful full unit coverage and production browser/integration evidence.
4. Run lint/typecheck/coverage/build/integration/audit, review and publish implementation PR.

## Progress
- [x] 1.1 Reviewed design extension
- [x] 2.1 Participant list and account composition
- [ ] 3.1 Unit and integration verification
- [ ] 4.1 Full gate, review and PR evidence

## Findings
#37 merged through PR #42. No open PR or competing issue claim. Existing DTO supplies participant-relative roles, authoritative actions and deterministic cursors. No new persistence or lifecycle required.

## Validation
Not run yet.

## Implementation progress
Design extension published as PR #43 with fresh-context approval; server-time timer clarification applied. Implementation draft PR #44 references it. The account list uses existing protected transport, resource panel and DataTable. Cursor pages replace rows; visibility/minute/server-relative end refresh restarts page one. Focus restores the exact booking link or heading and respects deliberate user movement. No lifecycle, schema or API changes.

Changed files: account page, colocated sessions TSX/CSS, sessions unit tests, booking/admin production integration scenarios and compatibility notes.

## Validation results so far
- lint and typecheck passed.
- Full test:coverage passed outside sandbox (local-port tests require binding): 274 tests; 213 executable production/harness files at100% lines/statements/functions/branches,22 type-only files.
- Build/integration/audit pending. No CI result claimed.
