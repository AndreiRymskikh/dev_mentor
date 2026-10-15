# Implement issue #1: idempotent installer

Source doc: .ai/specs/2026-10-15-idempotent-installer.md (design PR #2)
Status: blocked (dependency audit)
Engine: om-auto-create-pr (steps: 6, --loop: no)

## Goal and scope

Implement the reviewed Node-builtins-only setup flow without changing application APIs, manual commands or persistent database data. Spec is on a separate design-only PR; no copied spec will be committed to this implementation branch.

## Progress

### Phase 1: Installer and unit coverage

- [x] 1.1 Native runtime and state/credential checks.
- [x] 1.2 Staged installer, CLI and npm setup command.
- [x] 1.3 Meaningful 100% installer unit coverage.

### Phase 2: Evidence and documentation

- [x] 2.1 Isolated first-run/rerun integration scenario.
- [x] 2.2 README Getting started and manual alternative.
- [x] 2.3 Full gate and code review; report unresolved blockers.

## Risks

Preserve credentials/volumes; never reclaim unverified locks or kill unrelated ports. Known braces audit advisory may block completion. No gh pipeline labels exist, so guarded mutations skip missing names.

Phase 1 verified: 35 unit tests pass, including native filesystem/control-channel/process adapters. All installer and existing production sources have 100% statements, branches, functions and lines. Typecheck passed. Initial sandbox socket failures were resolved by permitted execution; no tests were skipped.


Phase 2 implemented: `npm run test:setup` prepares a temporary checkout with unique Compose project/ports, exercises dependency installation and environment creation, reuses the verified running dev server, and proves unchanged credentials, installed lockfile and persisted SQL data. It cleans up only its own fixture. The normal integration runner includes this test. README documents setup, reruns, safe recovery and the manual alternative.

Review fixed process-tree fallback termination on POSIX and prevented Ctrl+C cancellation from aborting Windows taskkill cleanup. Regression coverage exercises both adapters; Windows execution itself remains platform-mocked on this macOS host.

Validation: lint and typecheck pass; 35 unit tests pass with 100% statements (420), branches (292), functions (99), and lines (285). Production build passes after retrying with network/localhost permissions and fresh output following sandbox font/socket failures. Full integration passes (ephemeral PostgreSQL, home page, admin 404, fresh installer/rerun and cleanup). Dependency installation was verified in both this worktree and the fresh installer fixture.

Remaining blocker: `npm audit` exits 1 with six high-severity entries rooted in GHSA-vfj7-8cjw-p6xm (braces), inherited through Awilix and Next ESLint. npm's proposed force fix downgrades Awilix to 6.0.0 and does not provide a compatible stack-wide repair. No audit suppression, downgrade or threshold weakening applied. Full-gate review verdict is request changes; implementation PR stays draft until the dependency blocker is resolved. Spec remains on design PR #2, not marked implemented.

Configured SDLC labels other than documentation are missing from the tracker; guarded mutations skip unavailable names. No application routes, package exports, schema or existing commands changed.
