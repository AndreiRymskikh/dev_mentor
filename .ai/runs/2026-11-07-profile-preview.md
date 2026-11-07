# Representative profile preview

Goal: implement owner-approved name hierarchy, spaced mentoring description, titled technologies/topics badges and optional work link; share presentation with visitors.

Specs: [profile](../specs/implemented/2026-09-08-mentor-page.md), [public content](../specs/2026-10-29-e02-v2-public-profile-and-reviews.md).

Plan: share core profile presentation between preview/public hero; add explicit token-based styles (existing utility-only preview lacks layout in compiled routes); hide empty sections; test semantics/escaping/defaults and production browser layout in both themes/mobile; run mandatory checks.

Risk: public hero typography must not override shared preview rules; optional public details and offer remain separate. Preview reflects saved core profile fields only, clearly labelled.

Progress: shared MentorPageView now renders a prominent name, About my mentoring section with preserved paragraphs, Technologies and topics badge list and optional Explore my work link. Owner preview identifies saved details. Public hero reuses the view while retaining its identity marker, optional content and offer; duplicate biography removed. Explicit shared CSS provides the layout on both routes.

Changed files: shared mentor view/controls CSS; owner editor markup/styles; public profile markup/styles; unit and production browser regression checks; implemented profile spec and lessons index.

Validation: lint, workspace/test typecheck, production build passed. All 224 unit tests passed; 100% statements, branches, functions and lines across the covered tree. Targeted profiles integration passed against owned disposable PostgreSQL/HTTPS/browser, including computed preview gaps/font hierarchy/flex badges, shared public content, empty-link publication, optional details and responsive light/dark screenshots. Visually inspected desktop and 320px dark preview plus light desktop public page. Diff whitespace passed. Coverage/build/integration used elevated access for localhost/runtime requirements.

Audit: not repeated because dependencies are unchanged since the completed audit earlier in this session, which reported 16 existing moderate tooling vulnerabilities (see [validation run](2026-11-07-profile-validation.md)). No clean audit or GitHub CI is claimed.

Outcome: requested presentation implemented and verified locally. No commit or PR requested/created.
