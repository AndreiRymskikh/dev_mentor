# Public mentor catalog

## TLDR
Developers currently encounter disabled discovery controls in their workspace. Add a public, bounded catalog linking existing published mentor profiles; incomplete offers remain visible with truthful status. Issue: #36.

## Decisions accepted by the owner
Public access; published verified users with current mentor membership are included even without complete prices/availability; newest publication first, with stable user ID descending to break ties. Confirmed in the implementation chat on 2026-11-08. No blocking questions remain.

## Problem and scope
The account Find a mentor CTA and workspace Browse mentors navigation have no working destination. Deliver one discovery capability: persisted listing, public offer summaries, profile navigation and the two entry points. Exclude booking, payment, rankings, reviews, filters and new mentor administration.

## Proposed direction
Use `/mentors` and public read-only `/api/mentors`; existing `/m/[slug]` remains authoritative for profile visibility. Reuse core offer projection/policy and UI resource, table and feedback components. The page is client-loaded so genuine empty and unavailable states differ, with retry.

## Architecture and public contract
A new db MentorCatalogRepository performs one parameterized SQL projection through the existing MikroORM request manager: join verified users/current mentor roles and published profiles, select only catalog fields, and a lateral indexed first eligible active slot. SQL limits to page size + 1; there are no per-card service/database calls. Reuse `publicOffer` from the existing prices service with the current price policy and the same two-hour eligibility lead. A new explicit scoped MentorCatalogService owns validation and allowlisted DTOs. No entity or migration changes and no new runtime dependency. The required audit gate may need independently committed, verified transitive tooling security overrides; those do not alter the catalog contract.

`GET /api/mentors?limit=12&after=<cursor>` uses apiHandler, the standard envelope and no-store. Limit is integer 1–24 (default 12); unknown/duplicate parameters and malformed cursors produce 422. Cursor is `publication-UTC-instant|UUID`; preserve PostgreSQL microseconds in this key, validate strict UTC datetime and canonicalize the UUID. Ordering is `(published_at DESC,user_id DESC)` and continuation uses a strict tuple inequality, independent of whether the anchor still exists. Return `{items:[{slug,displayName,bio,stackTags,offer}],nextCursor,serverNow,refreshAt}`. Each offer is the existing public projection; exclude user IDs, emails, deadlines, private records and unvalidated saved prices. The cursor's UUID is solely a pagination key (already an opaque public identifier), never an authorization credential.

Publication, verification and role status are checked in the single statement's snapshot. No shared/CDN cache. Existing profiles enforce visibility independently when followed; already delivered public text cannot be recalled. New publications during traversal appear after restarting; republishing can reorder a profile. Pagination is a live list, not a frozen cross-request snapshot.

## UI/UX
Use the existing public page theme, brand and sign-in/workspace navigation. A single-column DataTable renders one self-contained mentor summary per row (no horizontal multi-column card data on mobile); retain its accessible table semantics. Each summary has name/profile link, bio, vocabulary tag labels, 25/50-minute prices when valid, explicit missing-price text and eligible-availability status. “View profile” is the only mentor action; explain that booking is not available. Reuse feedback components for loading/error/retry/empty states. Next and Back to first page are real encoded links so browser history works; no invented page count. Focus the results heading after a new page/retry completes. Refresh via the existing availability hook at the earliest offer boundary, after visibility restoration and at a bounded periodic interval to remove revoked/unpublished profiles on an open page. Clear stale results while refreshing or on failure. A returned empty continuation offers restart, rather than claiming no mentors exist globally.

The catalog itself works anonymously. Workspace Browse mentors and account Find a mentor both target `/mentors`; update account placeholder copy to describe discovery without promising sessions. Enable the existing public profile Mentors navigation for return navigation. Inaccessible profiles retain 404 behavior and add a scoped, keyboard-accessible Browse mentors return link.

## Failure and compatibility
Unavailable database or invalid price policy returns a retriable 503, never an empty successful catalog or guessed money. Stale/removed/past slots cannot count as eligible. Time refresh uses serverNow and subtracts request latency through the existing hook. Reads do not mutate profile/availability state. No cookies/auth/CSRF changes, no change to existing profile or offer response contracts. Rollback removes the additive routes and restores the navigation; no persisted changes require rollback. No new public booking promise.

## Research and review
[GitHub pagination guidance](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api) supports bounded responses and explicit next-page navigation; [WordPress REST pagination](https://developer.wordpress.org/rest-api/using-the-rest-api/pagination/) demonstrates bounded default/per-request sizes. Adopt bounded continuation, omit total counts/advanced discovery controls that this slice does not need. This research informs mechanics, not owner eligibility policies.

## Decisions in play
D02 site discovery; D03 mentor-entered availability; D04 external help/payment boundaries; D05 booking is a separate implementation. Existing publication consent remains authoritative. Owner-confirmed policies above extend E01's previously disabled catalog controls.

## Phasing and Implementation Plan
Phase 1 — persistence and public contract
1. Implement bounded projection, validated cursor, offer projection and explicit DI; unit-test defaults, failures, validation and public fields; prove eligibility/pagination with disposable PostgreSQL.
2. Add the no-store public API and route tests.
Phase 2 — discovery flow
3. Add public catalog UI with responsive summaries, loading/empty/error/retry, continuation and refresh; wire account/workspace/public navigation; unit-test each changed production path.
Phase 3 — verification and delivery
4. Run lint, typecheck, full 100% coverage, audit, build and full disposable integration; add catalog browser/HTTP checks, keyboard/navigation and light/dark narrow/wide screenshots. Review implementation and fix findings; publish ready implementation PR referencing the design PR and closing #36. Required CI results are reported separately.

## Implementation status
Implemented on [PR #41](https://github.com/AndreiRymskikh/dev_mentor/pull/41); local full-suite verification passed, with the scoped unavailable-profile recovery follow-up under final targeted verification. Merge, independent code approval and manual QA remain separate gates; keep this spec active until delivery is accepted.
