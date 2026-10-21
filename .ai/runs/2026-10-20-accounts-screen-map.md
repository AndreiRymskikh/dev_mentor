# Accounts and roles screen map

Date: 2026-10-20. Goal: map the user-supplied Epic 01 flow and save a reviewable documentation artifact.

## Sources and plan

Read [brief](../specs/product-brief.md), [personas](../specs/research/personas.md), [newer proposed auth specification](../specs/2026-10-16-users-auth-application-primitives.md), [lessons](../lessons.md), and [UI progress](../../packages/ui/POSTEP.md); inspect actual UI files. Inventory screens, transitions, states, access rules and available primitives; distinguish requirements from proposals; verify local links and diff.

## Progress and decisions

- Requested backlog and 2026-09-04 accounts specification are absent. Use the newer AUTH document with explicit status, without inventing backlog criteria.
- User explicitly supplies Epic 01 scope. Map local screen IDs separately from story IDs; flag operator/administrator terminology and role-home route proposals.
- Include password recovery as an adjacent dependency, not an expanded epic commitment. Keep support external and product exclusions intact.
- Save [screen map](../../lekcja-07/mapa-ekranow.md). No application/UI implementation or Storybook stage advancement.

## Changed files

- `lekcja-07/mapa-ekranow.md`
- `.ai/runs/2026-10-20-accounts-screen-map.md`

## Validation and outcome

Validated all 26 local Markdown links across both documents; all targets exist. Reviewed the documentation for source/proposal separation and scope boundaries. `git diff --check` passed. Production tests, lint, build, browser and account-flow tests not run: documentation-only task, no implemented account screens changed.
