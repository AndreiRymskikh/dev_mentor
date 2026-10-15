# Idempotent DevMentor installer

## TLDR

Add `npm run setup`: prepare dependencies, local environment and PostgreSQL, then start the existing development server. Reruns preserve credentials/data and reuse a server positively identified as owned by setup. Refs #1.

## Problem and scope

README currently requires separate dependency installation, credential configuration, database startup and `dev` commands. There is no setup entry point. This is additive repository tooling; preserve all manual commands and the application/API contracts.

No system-package installation, schema migration, seeding, browser installation, application feature or database reset is included. Node >=24, npm and a running Docker engine with Compose v2 are prerequisites. Installer code uses Node builtins only, so it can run without node_modules.

## Architecture and contracts

Entry: `scripts/setup.mjs`. Testable orchestration and native process/filesystem adapters live under `scripts/setup/`. Resolve the repository from the entry file, not the caller's working directory. Run npm through the current Node executable and npm_execpath; no interpolated shell commands.

Stages:
1. Check Node/npm, Docker engine and Compose availability.
2. Acquire an atomic repository-local setup lock. A running owner's private localhost control endpoint proves possession of a random instance nonce and reports the same canonical repository path and ready dev URL. A matching ready instance is reused. A live owner still preparing produces a retry instruction; unverified/stale metadata never authorizes killing a process. Existing dead/malformed owner metadata fails with an explicit instruction to verify no installer is alive and remove only .devmentor/setup.lock. Do not automatically reclaim locks: a cross-platform PID/file check cannot atomically exclude a concurrent reclaimer. Normal signal shutdown removes its own lock.
3. Validate dependencies against package-lock.json, workspace manifests and installed lock/version state, plus `npm ls`. Install with `npm ci` only when missing/drifted/unhealthy, then recheck. Save a validated fingerprint under ignored `.devmentor/` for reruns; a marker alone is never enough.
4. Read `.env.example` and existing `.env`, honoring explicit PostgreSQL process-environment overrides. Validate required user/database/password/port and that DATABASE_URL describes the same connection. Existing invalid/incomplete files fail unchanged. When absent, create `.env` exclusively with random credentials and a correctly encoded URL; never generate a new password for an existing Compose volume unless full valid credentials were explicitly supplied. Derive the actual volume name through Compose config and inspect it before generating anything. No secret is printed, including child-process errors.
5. Inspect PostgreSQL health. Skip `db:up` for a healthy instance, otherwise call the existing `db:up` (which waits). Always perform authenticated `db:check` before startup. Never remove/reset/recreate volumes or rotate credentials. Recheck readiness instead of trusting stage markers.
6. Verify the requested dev port is free, then launch existing `dev` with explicit PORT, localhost hostname and validated DATABASE_URL. Wait for /api/health and a still-live child. Only then publish ready control metadata and show the URL. An unrelated occupied port fails without stopping that process.
7. Own the foreground child until exit. Forward SIGINT/SIGTERM to the owned process tree (POSIX process group; Windows taskkill tree), dispose control server/listeners and remove only this owner's lock. Leave database storage and environment intact.

Effective configuration is .env (or .env.example for a new file), overlaid by explicitly supplied POSTGRES_DB/USER/PASSWORD/PORT and DATABASE_URL process variables. Partial overrides are allowed only when the resulting URL and individual values agree; mismatches fail unchanged. The identical effective values reach Compose, db:check and dev. Reuse requires the requested port and canonical configuration digest plus manifest/lock fingerprint to match the owner; mismatches require stopping that server and rerunning setup, never silent reuse.

PORT defaults to 3000 and must be an integer 1024–65535. Pass the exact port to Next so it cannot silently choose another. Readiness requires an alive child and HTTP 200 from /api/health with ok:true and data.status:ok; startup timeout is 120 seconds. All runtime timeouts are named shared constants. Port preflight is advisory; if another process wins the bind race, surface child failure without killing it.

Control endpoint is local-only and read-only; its random nonce identifies the managed instance, is stored with restrictive filesystem permissions, and is not a credential or an authorization bypass. It exposes no database secrets. This avoids adding any application endpoint or changing the health response.

Native operations return safe status/result objects. Orchestration errors identify a stage and an actionable next command, never dump raw environment or process output that might contain credentials. Publish environment files completely: write a mode-0600 temporary file under .devmentor, then hard-link it to .env (atomic, fails if .env exists), finally remove the temporary file. A crash before publication leaves no partial .env; unsupported hard links fail with manual configuration guidance. No overwrite-on-rerun. `.devmentor/` contains only disposable installer metadata; PostgreSQL volume data stays outside it.

## Failure cases and verification

- Dependency drift or partial installation: revalidate and reinstall, then recheck before recording success.
- Existing volume without usable credentials, malformed .env or URL mismatch: fail with recovery instructions; no automatic password rotation.
- Docker unavailable/unhealthy DB/install failure: nonzero status, no downstream startup.
- Concurrent preparation: no duplicate installs or processes; retry after the active owner finishes preparation.
- Stale/malformed owner state: Never automatically reclaim stale locks; report precise metadata-only recovery instructions.
- Child start failure/timeout or shutdown: terminate only owned children, clean metadata, preserve DB/env.
- Every module, including CLI launcher and native adapters, receives meaningful 100% unit statement/line/function/branch coverage. No ignore directives or weakened thresholds.
- Isolated integration uses a temporary checkout, unique Compose project, free DB/app ports, real installer first/rerun calls, an authenticated sentinel DB row, and credential/content comparisons. Stop owned processes and remove only fixture resources in cleanup. Never copy developer .env or touch devmentor's persistent volume.

## Compatibility and review

BACKWARD_COMPATIBILITY.md protects manual CLI commands, root env keys and persistent storage. Keep those contracts; no migrations or breaking changes. Installer process/secret/data handling warrants risk-high and independent review. No application UI changes or visual mockups are needed. Full configured validation includes the separately known npm audit blocker; do not suppress it to claim completion.

## Research and alternatives

Node child_process supports direct executable/argument invocation and process-tree ownership; prefer it over shell concatenation (https://nodejs.org/docs/latest-v24.x/api/child_process.html). Compose up supports --wait (https://docs.docker.com/reference/cli/docker/compose/up/), already used by db:up; reuse it instead of writing another database launcher. A dependency-heavy installer would fail before installation, a bare shell script would reduce portability, and a persistent success-marker alone cannot detect drift.

## Resolved assumptions (autonomous defaults)

| Question | Choice | Reason |
| --- | --- | --- |
| Start server? | Yes, foreground; reuse verified setup-owned instance on rerun. | Explicit owner confirmation. |
| Optional testing dependencies? | Do not install Chromium or execute tests during ordinary setup. | README treats testing separately; least added scope. |
| Existing malformed credentials? | Preserve and fail with recovery guidance. | Avoid secret rotation or invalidating existing volumes. |
| Concurrent preparation? | Fail safely with retry instruction, then succeed once owner is ready. | Avoid racing npm/filesystem changes. |
| Local metadata location? | Ignored .devmentor directory. | Keeps secrets/process state out of version control without changing AI metadata. |

No blocking product questions remain. Choices above do not permit data deletion or weakening existing security/contracts.

## Implementation Plan

### Phase 1: Installer and unit verification

1.1 Add native Node runtime adapters and state/credential checks.
1.2 Add staged installer, CLI entry, root command and ignored state path.
1.3 Cover first run, rerun, drift, failures, instance identity and shutdown with 100% unit coverage.

### Phase 2: Real-environment evidence and documentation

2.1 Add isolated installer integration scenario to the existing runner with centralized timeouts and safe cleanup.
2.2 Update README with Getting started and complete manual alternative.
2.3 Run full gate, review changes, record any unresolved verification blocker on the implementation PR.

## Design review

Fresh-context scope review found lock reclamation races, precedence/reuse ambiguity, interrupted environment writes and unspecified readiness. Resolved above with no automatic stale reclamation, explicit effective configuration matching, atomic no-overwrite publication, and fixed readiness/port criteria. One installer capability remains in scope; no app endpoint change is needed.
