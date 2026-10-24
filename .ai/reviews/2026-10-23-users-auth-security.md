# Independent users/auth security review — 2026-10-23

Latest status: see the dated2026-10-24 addendum below. The original findings and validation table record the actual2026-10-23 review; braces is no longer the current audit blocker.

## Verdict

**request changes** — lint, typecheck, coverage, build and integration passed, but the mandatory dependency audit failed. Six high dependency entries remain for one unpatched braces advisory. This review does not approve release, merge, owner acceptance, or the unresolved dependency risk.

## Summary

Reviewed the email/password registration, verification, recovery, persisted JWT sessions, mentor enrollment, administrator listing/role changes, bootstrap and maintenance implementation in explicit range `49b363c..804be590f0ee12ad408c916d3ccfc230e59d577e`. GitHub OAuth is owner-deferred; the coming-soon button is intentional. Unrelated discovery prototype changes in that range were excluded.

This independent reviewer did not implement production feature code. Source and integration tests were frozen at the full SHA above throughout this review's gates. No additional concrete authentication or authorization defect was found in the examined code. That bounded finding does not establish absence of vulnerabilities.

## Findings

### Blocker

- [package-lock.json:8059](../../package-lock.json#L8059) — `braces@3.0.3` causes `npm audit` to exit1 for [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). The vulnerable recursion can exhaust the stack when processing sufficiently nested patterns. Installed paths are Awilix13.0.5 → fast-glob3.3.3 → micromatch4.0.8 → braces3.0.3, and Next ESLint16.4.2 → fast-glob3.3.1 → the same micromatch/braces. The configured gate requires every command to pass, so this blocks approval even though feature tests pass. Resolve with a compatible maintained dependency fix when published, or an explicitly reviewed dependency replacement; rerun the full gate. Do not suppress the advisory or apply npm's forced Awilix6/Next ESLint14 downgrades as an incidental feature fix.

Read-only upstream research on2026-10-23 independently checked the successful registry command `npm view braces version versions --json`: latest published version is3.0.3, with no newer published version. The [upstream package](https://raw.githubusercontent.com/micromatch/braces/master/package.json) also identifies3.0.3; [upstream issue70](https://github.com/micromatch/braces/issues/70) remains open and the reviewed advisory lists no patched version. Thus no compatible published braces patch was found; this conclusion does not rely solely on npm's forced-downgrade suggestion. No application call to `loadModules`, `listModules`, micromatch or braces was found in the searched production TS/TSX/MTS under `packages`; current DI bindings are explicit. This is not proof that all transitive exposure is unreachable, and does not waive the gate.

## Validation Gate

Executed independently in the configured order against the frozen SHA; parent-supplied results did not substitute for these commands.

| Command | Status | Actual evidence |
| --- | --- | --- |
| `npm run lint` | PASS | Session68368, exit0. |
| `npm run typecheck` | PASS | Session60107, exit0; all workspaces and test sources. |
| `npm run test:coverage` | PASS | Session90419, exit0; actual Vitest5.0.5,131 tests/27 files;100% statements1435/1435, branches833/833, functions364/364, lines1059/1059.97 executable production files fully covered;15 empty/type-only files contain no executable coverage. |
| `npm run build` | PASS | Session28796, exit0; Next16.4.2 default Turbopack production build, protected routes dynamic. No private environment values were read or printed by this reviewer. |
| `npm run test:integration` | PASS | Session80533, exit0; complete disposable PostgreSQL/SMTP/production HTTP/native HTTPS browser suite, independent QA, real database outage/recovery, installer fresh/reuse preservation and final owned-resource cleanup. |
| `npm audit` | FAIL | Session76926, exit1; six high entries for braces; zero critical/moderate findings remain after approved Next/Vitest patches. No override, suppression or forced fix applied. |

No CI result is claimed. The parent separately reported92 both-theme Storybook tests passing on Vitest5.0.5; those were not executed by this reviewer and are not part of this review's configured six-command gate.

## Contracts and security evidence

Reviewed explicit strict Zod inputs and bounded JSON bytes; server-side CSRF against configured origin; duplicate-cookie rejection; pinned JWT algorithm/issuer/audience/lifetime and persisted session revocation/current memberships; bcrypt UTF-8 byte limits; allowlisted principal/admin DTOs; parameterized SQL; lazy isolated ORM scopes; token digest/purpose/expiry/single consumption; reset/session-create User locking; administrator advisory/User locking and verified-last-admin protection; bounded SMTP TLS/deadline/fixed-origin fragment links; no-referrer/history stripping; migration up/down safeguards; bounded expire-only maintenance and operator cleanup.

The full integration run proved denied and forged input paths, literal bounded admin queries, current authorization, parallel token replays/replacements, both reset/login lock orders, stale-admin mutation denial, parallel last-admin/bootstrap behavior, actual SMTP failure/retry, cookie lifecycle, real database outage denial/recovery and preservation of active/identity records during maintenance. Existing HTTP helpers retain their default envelope; new status/cookie metadata and the coordinated singular-to-array session migration have consuming-side tests. Administrator UI intentionally replaces the old404 contract with protected behavior. No destructive production rollback or developer database reset was performed.

Independent QA is recorded separately in [the QA report](../qa/2026-10-23-users-auth-qa.md). Its synthetic503/delay states prove presentation and retry; actual outages were separately exercised. This security review does not award self-QA or owner acceptance. Live deployment SMTP, assistive-technology testing and final owner manual testing remain pending. The specification stays in active specs while required acceptance and the clean audit gate remain open.

## Audit addendum — 2026-10-24

**Verdict remains request changes.** Production source, tests and dependency versions are unchanged from the tested revision804be590f0ee12ad408c916d3ccfc230e59d577e; HEAD60a1ffc adds review metadata. The original six-command evidence above remains historical evidence for that executable tree. This reviewer refreshed only the externally changing audit, rather than repeating unchanged code gates.

Own `npm audit` refresh (tool chunk8b2188) exited1: **zero critical, zero moderate and one high dependency entry**, `undici@8.12.1`. Own `npm ls undici --all` confirms development/test paths jsdom30.1.2 and @testcontainers/postgresql12.2.1 → testcontainers12.2.1. No application runtime exploit is claimed from those paths alone.

### Current blocker

- [package-lock.json:15112](../../package-lock.json#L15112) — undici8.12.1 is within the affected8.0.0–8.12.1 range reported for [EventSource parser memory exhaustion](https://github.com/advisories/GHSA-4qv8-2p9j-2685), [non-lowercase SRI algorithm bypass](https://github.com/advisories/GHSA-f72v-6w45-q472), and [unhandled-error denial of service](https://github.com/nodejs/undici/security/advisories/GHSA-xjj6-f33q-929c). The maintainer identifies8.12.2 as a patched8.x version for the high-severity denial of service: a malicious response with excessive content encodings and early close can terminate the affected process. A compatible patch is available, but the owner explicitly chose **“Leave versions unchanged and document it.”** No dependency edit or audit suppression was performed. This scope decision is not a risk waiver or a passing gate. A future authorized patch and validation are required before this review can approve.

The earlier [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) was withdrawn on2026-10-23 because it is not practically exploitable. It no longer appears in this refresh. Its earlier six-entry audit output remains accurately preserved above; withdrawal, rather than a local dependency patch, changed that result. The mandatory clean-audit gate and final owner manual acceptance remain open; no merge approval, CI pass or completed specification is claimed.
