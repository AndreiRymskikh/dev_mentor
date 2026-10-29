# E01 v2 specification and related issues

Start: 2026-10-29. Goal: new screenshot-driven E01 spec and linked GitHub implementation issues, covering every PNG in `.ai/docs/designs/e01/`.

## Plan
1. Inspect all ten screenshots, current production source, prior specs, contracts and issue/PR overlap.
2. Draft skeleton, resolve reversible presentation choices, expand full traceability and implementation plan.
3. Obtain fresh-context scope review, incorporate fixes, publish durable PNG evidence, spec-only PR and bounded issues.
4. Validate file/link/screen coverage and remote issue references. Do not implement runtime code.

## Evidence and decisions
- Read lessons, engineering/auth/product/E02 specs, SDLC, compatibility and tracker/browser descriptors.
- Existing local GitHub issues: #4 auth and #6 E02; invitations/profile stories #7/#8 closed. No open PRs found. New work is E01 presentation, not duplicate auth/mentor persistence.
- User follow-up explicitly highlights 05–09. Added a source-audit table against invoking checkout `a5fccae`: 05/07/09 screenshot screens absent; 06 basic profile/onboarding and 08 functional users exist but screenshots are not fully implemented.
- Ten supplied PNGs published without modification on dedicated `qa-evidence-e01-v2` branch. Evidence is proposed design, not screenshots of working production.
- Preserve deferred OAuth, verified self-service mentor enrollment, role keys, `/admin` redirect and generic registration/security behavior. Add `/admin/workspace` for operator home.
- Prices/slots remain E02 dependencies; no duplicate domain services, policy default or fake production data.
- Fresh-context scope reviewer found completion-vs-exclusions contradiction, E02 policy ownership ambiguity and unnecessary expiry/mentor delivery coupling. All three corrected before publication.
- Shared test-environment descriptor absent; supplied mockups used as proposed visuals, no fresh live app evidence claimed.

## Deliverables and validation
Pending publication. Docs-only: runtime lint/build/tests/integration not required and not run for this run; prior colour-task results are not attributed to these documents. Validate markdown diff, paths, all ten screenshot references and tracker linkage.
