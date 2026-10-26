# E02 slices 1 and 2 implementation

Status: in-progress
Source doc: .ai/specs/2026-09-08-mentors-become-bookable.md
Story specs: .ai/specs/2026-09-08-invitations.md and .ai/specs/2026-09-08-mentor-page.md
Epic: #6; invitations: #7; profile/share link: #8.

## Goal and scope

Implement optional secure invitations, durable first-publication deadlines, owner profile editing/publication and stable public share links. Use current authentication, MikroORM, explicit Awilix and Storybook primitives.

Owner decisions, 2026-10-26: preserve verified self-service mentor enrollment and add optional invitations; track locally under #6 and create slice issues. External original #8/#15/#16 are provenance only. Slice 1 and 2 ship as separate PRs. Slots, prices, payments, ratings and OAuth remain outside scope.

## Architecture adaptation and risks

The source specs describe a different historical tree. Current roles are developer/mentor/administrator; sessions resolve persisted roles on every request and have no sessionVersion. Invitation acceptance must preserve the current session rather than introducing a second token/session system. No MentorProfile exists: introduce the floor, not fictional placeholder fields/seeds. Reuse current DB runtime and migration registry. Preserve self-service membership and make both enrollment paths reach profile creation. Raw invitation tokens must never enter logs. Schema and auth changes require independent review and QA.

## Implementation plan

### Phase 1: Optional invitations (#7)

1. Reconcile story/epic contracts with owner decisions, current auth and tracker IDs.
2. Add invitation/profile floor migration and persistence with identity/locking/uniqueness invariants.
3. Add validated services, operator command, typed DI and HTTP routes.
4. Add invitation continuation and mentor home/deadline using shared primitives.
5. Verify unit, database, HTTP and browser paths; full gate, PR review and QA evidence.

### Phase 2: Profile publishing (#8, separate PR)

6. Add vocabulary/readiness/slug utilities, profile migration and owner/public persistence.
7. Add owner services, route callbacks and explicit public projections.
8. Add draft/publish/share UI using Storybook primitives and generic form/resource feedback.
9. Verify ownership, projections, collisions, publish transitions and public browser flow; full gate, PR review and QA evidence.

## Verification

Not yet run: lint, typecheck, coverage, build, integration, audit, review and UI QA. Initial checkout clean; source specs are now committed on develop (38c99b0), superseding the earlier issue's durability blocker. GitHub connector cannot access this repository; authenticated gh works outside sandbox.

## Progress

- [ ] 1.1 Reconcile contracts and tracker mapping.
- [ ] 1.2 Implement invitation persistence.
- [ ] 1.3 Implement services, operator command and HTTP wiring.
- [ ] 1.4 Implement invitation and mentor deadline UI.
- [ ] 1.5 Verify and finalize invitation PR.
- [ ] 2.1 Implement profile domain and persistence.
- [ ] 2.2 Implement owner/public services and routes.
- [ ] 2.3 Implement profile editor and public page.
- [ ] 2.4 Verify and finalize profile PR.
