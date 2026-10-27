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
must merge after #9. After #9 squash-merges, merge the latest develop into this branch to advance the common base and reduce its PR diff to slice 2; do not force-push. Do not merge either PR
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

- [x] 2.1 Implement profile domain and validation.
- [x] 2.2 Implement persistence and migration.
- [x] 2.3 Implement services and HTTP contracts.
- [x] 2.4 Implement profile and public UI.
- [ ] 2.5 Verify and finalize profile PR.

## Implementation and verification checkpoint

Implemented all profile domain, migration, repository/service/DI, API callbacks, partial-form editing,
readiness, publish/unpublish, stable copyable link, public projection/view and mentor-home checklist.
Added generated shadcn checkbox/badge adapted to product tokens and existing cn; removed the CLI's
redundant cn dependency. No lockfile drift remains relative to the invitation prerequisite.

Passed: lint/typecheck,164 unit tests with100% statements/branches/functions/lines across136 production
files, Storybook typecheck/build, standard Turbopack production build, disposable profile migration
up/down and empty schema diff, real equal-name collision retry, ownership/current-role denial,
idempotence, serialization and public key-equality proofs. The native `--scenario=profiles` run passed
all database stages plus both invitation and profile HTTP/browser flows, including clipboard and
resource failure/recovery, public privacy, reserved me slug, republish/rename, and320px/desktop in both
themes. Inspected four screenshots; controls fit and public content uses the shared design system.

Review follow-ups since that browser run: clear a previous copy-success notice before a failed new
copy attempt, and separate neutral readiness labels from actionable field-error messages. Regression
assertions are added; lint/typecheck/100% unit coverage pass. A fresh production/browser pass remains
owed for this final copy/readiness wording revision. Publication observers are best effort, with
post-commit failure regression coverage. Parent invitation observer follow-up will be merged before
final validation. Full default integration/audit/review/independent high-risk QA are not yet claimed.
