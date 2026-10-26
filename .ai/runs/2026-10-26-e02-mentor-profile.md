# E02 slice 2: mentor profile and share link

Status: in-progress
Source doc: .ai/specs/2026-09-08-mentor-page.md
Tracking epic: #6; story: #8; depends on invitation PR #9.
Original run: .ai/runs/2026-10-26-e02-invitations.md

## Goal, scope and decisions

Mentors can save partial profiles, publish complete profiles, unpublish and republish at an immutable
public share link. Both owner-approved enrollment paths work. Reuse the installed Storybook controls,
generic forms and feedback. No ratings, availability, prices, booking, payments or OAuth.

The branch includes PR #9's prerequisite commits so it builds independently; it targets develop and
must merge after #9. Its diff naturally reduces to slice 2 after #9 merges. Do not merge either PR
without independent review and QA. Existing roles and persisted sessions remain authoritative.

## Plan and risks

1. Add tested vocabulary, readiness, slug generation and strict partial-profile validation.
2. Add entity widening/migration, current-owner persistence and collision-safe publish transactions.
3. Add explicit owner/public services and API callbacks, typed DI and safe allowlisted projections.
4. Add reusable form/resource feedback, owner editing/publish/share and public page with browser proof.
5. Run lint/typecheck, 100% unit coverage, build, disposable DB/browser integration, audit and review;
   publish evidence/status. Keep failing gates visible and never self-sign high-risk QA.

Risks: publication uniqueness under concurrency; lazy profile creation for existing self-service
mentors; public privacy; shared form compatibility; schema rollback. Empty URL/bio values represent
incomplete drafts. Published updates must not leave an incomplete public profile: reject those edits
with the same field errors, retaining saved data. Slugs are generated once and remain unchanged.

## Verification

Not run for slice 2 yet. Prerequisite slice 1 has 100% unit coverage and focused DB/HTTP/browser proof;
its local standard Turbopack build is restricted while Webpack/CI standard build passed.

## Progress

- [ ] 2.1 Implement profile domain and validation.
- [ ] 2.2 Implement persistence and migration.
- [ ] 2.3 Implement services and HTTP contracts.
- [ ] 2.4 Implement profile and public UI.
- [ ] 2.5 Verify and finalize profile PR.
