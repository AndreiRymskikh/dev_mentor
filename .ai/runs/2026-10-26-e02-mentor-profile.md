# E02 slice 2: mentor profile and share link

Status: complete
Source doc: .ai/specs/implemented/2026-09-08-mentor-page.md
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

Final combined source head: `9ef791e3649e76dfaf1706db3f8e0b719b8fa7f9`.
Lint/typecheck, 165 unit tests with 100% of all four coverage metrics across 136 production files,
standard Turbopack build and audit (zero vulnerabilities) pass locally. Storybook typecheck/build,
both-theme story tests (6) and built documentation verification (90 checks) pass.
All four GitHub CI jobs pass, including the full disposable PostgreSQL/browser suite:
https://github.com/AndreiRymskikh/dev_mentor/actions/runs/40496906955

Local full integration was attempted twice on the final combined source, including a clean build.
Both passed every database stage and timed out in the pre-existing SMTP HTTP registration stage,
before browser scenarios. This remains a local verification limitation; CI's full suite passed.
The focused invitation/profile run is recorded below separately. No timeout was increased or test weakened.

## Progress

- [x] 2.1 Implement profile domain and validation.
- [x] 2.2 Implement persistence and migration.
- [x] 2.3 Implement services and HTTP contracts.
- [x] 2.4 Implement profile and public UI.
- [x] 2.5 Verify and finalize profile PR.

## Implementation and verification checkpoint

Implemented all profile domain, migration, repository/service/DI, API callbacks, partial-form editing,
readiness, publish/unpublish, stable copyable link, public projection/view and mentor-home checklist.
Added generated shadcn checkbox/badge adapted to product tokens and existing cn; removed the CLI's
redundant cn dependency. No lockfile drift remains relative to the invitation prerequisite.

Passed: lint/typecheck, 164 unit tests with 100% statements/branches/functions/lines across 136 production
files, Storybook typecheck/build, standard Turbopack production build, disposable profile migration
up/down and empty schema diff, real equal-name collision retry, ownership/current-role denial,
idempotence, serialization and public key-equality proofs. The native `--scenario=profiles` run passed
all database stages plus both invitation and profile HTTP/browser flows, including clipboard and
resource failure/recovery, public privacy, reserved me slug, republish/rename, and 320px/desktop in both
themes. Inspected four screenshots; controls fit and public content uses the shared design system.

Final focused `npm run test:integration -- --scenario=profiles` passes on the combined source,
including both invitation/profile browser flows and every database stage. This reruns the copy/readiness
wording and five-field public repository projection. Fresh desktop/mobile screenshots in both themes
were inspected and published on PR #10's dedicated evidence branch. The unrelated local full SMTP
HTTP timeout above remains disclosed; the complete CI integration job passed.

## Public read-model review follow-up

Narrowed the repository's public read model to the same five safe fields needed by the service;
private user identity and publication metadata no longer cross that internal public-read boundary.
The service still explicitly constructs its outward DTO. Added key equality at the repository and
live database boundary, and removed redundant constructor-only calls from tests; the existing scoped
DI assertions exercise real default construction. Targeted profile unit tests and typecheck pass.

## Final review and handoff

Merged the final invitation prerequisite, including best-effort post-commit observers and environment-isolated default-setting tests. Public repository reads now carry exactly the safe five-field projection. The JSON callback wrapper owns authorization/CSRF once and retains the existing envelope; no speculative raw-Response contract was added. Author review found no remaining blocking code findings after these fixes. GitHub disallows author approval; independent review and high-risk QA remain required. Both PRs target develop; merge #9 first, then merge develop into #10 after a squash merge to refresh its common base. Neither PR was merged by this run.

Engine: om-auto-create-pr (steps: 5, --loop: no)
