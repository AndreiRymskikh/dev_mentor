# Implement issue #1: idempotent installer

Source doc: .ai/specs/2026-10-15-idempotent-installer.md (design PR #2)
Status: in-progress
Engine: om-auto-create-pr (steps: 6, --loop: no)

## Goal and scope

Implement the reviewed Node-builtins-only setup flow without changing application APIs, manual commands or persistent database data. Spec is on a separate design-only PR; no copied spec will be committed to this implementation branch.

## Progress

### Phase 1: Installer and unit coverage

- [x] 1.1 Native runtime and state/credential checks.
- [x] 1.2 Staged installer, CLI and npm setup command.
- [x] 1.3 Meaningful 100% installer unit coverage.

### Phase 2: Evidence and documentation

- [ ] 2.1 Isolated first-run/rerun integration scenario.
- [ ] 2.2 README Getting started and manual alternative.
- [ ] 2.3 Full gate and code review; report unresolved blockers.

## Risks

Preserve credentials/volumes; never reclaim unverified locks or kill unrelated ports. Known braces audit advisory may block completion. No gh pipeline labels exist, so guarded mutations skip missing names.

Phase 1 verified: 35 unit tests pass, including native filesystem/control-channel/process adapters. All installer and existing production sources have 100% statements, branches, functions and lines. Typecheck passed. Initial sandbox socket failures were resolved by permitted execution; no tests were skipped.
