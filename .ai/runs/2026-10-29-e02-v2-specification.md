# E02 v2 screenshot specification and issues

Start: 2026-10-29. Goal: audit all seven E02 screenshot screens and publish a new implementation specification and nonduplicative related issues.

## Plan and source evidence
- Read current lessons, existing specifications, SDLC/compatibility, tracker/browser config and all seven full PNGs.
- Source audit at invoking checkout `19a59ba`: invitation/workspace/editor/public profile partially exist; payout setup/enabled/restricted screens and backing provider capability absent.
- Existing issues #6 E02 domain and #16 mentor-home delivery overlap. Closed #7/#8 are working base features, not full new screenshot delivery. No open PRs found at preflight.
- Owner replied: “Propose live implementation; flag approval gates” for ratings/reviews and Connect. Main spec includes every screenshot, with separate companion capability designs; protected product policy is not silently changed.
- Published seven unchanged reference PNGs on dedicated `qa-evidence-e02-v2` branch. These are proposed-design evidence, not working-app captures.
- Main spec drafted skeleton first. Full specs explicitly distinguish source inspection, production-built isolated fixtures, Stripe sandbox and separately authorized live rollout.
- Fresh-context scope reviewer found ambiguous booking completion, companion ownership, rejected gates, test/live evidence and cross-epic obligations. Addressed all five before publication.

## Decisions and delivery
- Reuse optional invitation/self-service mentor policy, current roles/session and stable slugs.
- Add first-workspace screenshot as requirement on existing #16, not a duplicate home issue.
- Propose live public content/reviews and payouts. G1/G2 keep the spec PR draft and dependent issues not ready until recorded policy/eligibility/privacy/provider decisions.
- Separate documentation dependency ticket must resolve booking/completion contract before live review/offer completion; no fake booking model or reviews.
- No runtime source, secret settings, database or provider accounts changed.

## Validation
Pending publication/readback. Docs-only: no lint/build/unit/integration/CI or live-provider testing claimed. Validate all seven PNG names, local Markdown paths, staged diff, issue relationships and guarded labels. Shared test-environment descriptor absent; supplied images are authoritative proposed visuals, no fresh current-app screenshots generated.
