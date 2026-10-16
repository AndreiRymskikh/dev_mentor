# Users/authentication and application primitives specification

## Goal
Specify issue #4 and reusable backend/frontend foundations justified by the backlog and approved product roadmap.

## Plan and progress
1. Read lessons, spec-writing skill/setup, configuration, product brief, protected contracts and existing helper entry points. Completed.
2. Read issue #4, all tracker issues and open PRs. Completed: #4 is the only open issue; #1 is closed; no open PRs. Distinguish product roadmap from filed backlog.
3. Write [skeleton](../specs/2026-10-16-users-auth-application-primitives.md) and surface scope/auth decisions. Completed; initial Q1–Q3 gate recorded; see the subsequent revision below for the current questions.
4. After answers: research, detailed design and traceability, entities/graph, phases and meaningful verification; independent scope review. Pending.

## Decisions and limits
User explicitly requests reusable server/frontend abstractions as part of specification. No production implementation or tracker mutation performed. Do not infer deferred features are approved now.

## Changed files and validation
- Skeleton specification linked above.
- This run log.
Read back and check diff/links before handoff. No lint, typecheck, coverage, build, integration or audit run: documentation skeleton only. Final specification remains unfinished pending direction answers.

## Review requested by owner
Reviewed the skeleton and both run logs against existing auth/container/UI helpers. Findings: the skeleton does not identify the required singular-to-multiple-role contract migration; Q3 bundles unrelated security/product decisions and adds email delivery/recovery scope; foundations-first separation risks a speculative framework despite concrete-consumer guidance. The issue log's partial-spec rationale is a workflow limitation, not a complete feature design. No mutually exclusive finalized designs found: the artifact is a skeleton and the other files are historical run logs. No production changes or executable checks performed.

## Accepted review recommendations — 2026-10-16
Owner accepted the recommendations and reconfirmed multiple roles per user. Revised the skeleton to use one users/authentication feature spec with primitives delivered through working feature slices; limit concrete abstraction scope to the agreed MVP; explicitly require singular-to-multiple-role migration, membership guards and privilege freshness; split the bundled security baseline into five independent decisions. Clarified the issue log is historical, not design authority. Remaining questions concern mentor enrollment, first-admin bootstrap, email verification, password recovery and account linking. Detailed design remains gated on those answers.

Validation: reviewed the three changed documents and checked whitespace and local Markdown links. No production code changed; lint/typecheck/coverage/build/integration/audit were not run.

## Detailed specification completed
Owner answered: mentor self-enrollment; operator-only initial administrator; email verification and password recovery included; account linking deferred. Replaced the skeleton gate with confirmed decisions and completed traceability, request/transaction lifecycle, entity diagram, sessions/roles, email tokens, rate limiting, GitHub, API/UI contracts, migrations/rollback and phased acceptance. Read installed Next route-handler/cookie documentation and researched primary MikroORM, GitHub and Better Auth documentation (linked in spec).

Fresh-context scope reviewer found three dependencies: registration needed limits/baseline roles earlier; GitHub verification needed explicit persistence; bootstrap required public auth before admin navigation. Corrected all three. Also aligned response status/cookie support with credentials delivery and serialized session creation against reset. No production changes, tracker updates or PR. Spec stays in active specs pending implementation.

Verification: Markdown links and whitespace checked; full executable validation not run because this is documentation only. Live SMTP/GitHub and implementation security verification remain future acceptance work. Mermaid is the authoritative model; optional interactive graph omitted because the small static graph is sufficient.
