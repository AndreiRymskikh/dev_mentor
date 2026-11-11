# Issue #38: My sessions

Goal: replace the account placeholder with authoritative participant bookings and existing private management actions.
Source doc: .ai/specs/2026-11-11-my-sessions.md

## Plan
1. Review the list contract extension and publish its design PR.
2. Implement bounded list, refresh, pagination and private-detail links without a second state machine.
3. Add meaningful full unit coverage and production browser/integration evidence.
4. Run lint/typecheck/coverage/build/integration/audit, review and publish implementation PR.

## Progress
- [ ] 1.1 Reviewed design extension
- [ ] 2.1 Participant list and account composition
- [ ] 3.1 Unit and integration verification
- [ ] 4.1 Full gate, review and PR evidence

## Findings
#37 merged through PR #42. No open PR or competing issue claim. Existing DTO supplies participant-relative roles, authoritative actions and deterministic cursors. No new persistence or lifecycle required.

## Validation
Not run yet.
