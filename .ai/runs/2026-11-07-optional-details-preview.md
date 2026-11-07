# Optional details in profile preview

Goal: show all saved optional content in the owner preview with public-page presentation.
Specs: [public content](../specs/2026-10-29-e02-v2-public-profile-and-reviews.md), [profile](../specs/implemented/2026-09-08-mentor-page.md).
Plan: extract shared app presentation and CSS; load owner details through existing protected API in an independent preview panel; reuse shared view publicly; cover empty/rich/loading/failure/retry and actual saved-detail return navigation, disclosure and mobile/theme layout; run mandatory checks.
Risks: keep optional loading/failure independent of core form; preserve public privacy and draft access; no duplicate sections or guessed content.
Progress: implementation started.

Implementation: extracted ProfileDetailsView and shared CSS for language/timezone, topics, escaped sample/disclosure and ordered steps. PublicProfile reuses it. Independent ProfileDetailsPreview loads authenticated owner details and offers loading/error/retry without replacing the core editor. Absent sections remain hidden.

Changed files: shared app view/CSS and owner preview loader, ProfileEditor, public page presentation/styles, unit/browser tests, specification and lessons. Earlier local details-validation/save-feedback changes preserved.

Validation: lint, workspace/test typecheck, production build passed. All 227 unit tests passed with 100% statements/branches/functions/lines across the covered tree. Targeted profiles integration passed with owned disposable PostgreSQL/HTTPS/browser: save details → return to editor → visible saved language/timezone/topics/sample/steps, safe code, native disclosure, 1440px/320px layouts in light/dark themes. Inspected dark desktop and light mobile screenshots. Diff whitespace passed. Dependencies unchanged; audit not repeated after the same-session result of 16 existing moderate tooling vulnerabilities. No clean audit or GitHub CI is claimed.

Outcome: saved optional details now appear in preview using the same markup/styles as visitors see. No commit or PR requested/created; no remaining implementation blocker.
