# Verify the built design-system manual

## Problem and evidence

During [Stage 1](../runs/2026-10-19-storybook-foundations.md), development story tests passed while the static documentation still exposed integration faults:

- CSS minification changed a six-digit white color to shorthand; the contrast calculator returned NaN because it assumed six-digit hex.
- Story decorators applied themes to canvases, but a documentation page also needed a theme-aware DocsContainer to set the document root.
- The manager bundler did not implement Vite's CSS `?raw` import: it returned an empty object, and the manager caught the resulting exception and retained default branding.
- MSW's strict unhandled-frame strategy initially blocked ordinary navigation. API strictness must distinguish API calls from static/navigation requests.

## Prevention

Test the production build, not just development stories: enumerate every built documentation page in both themes and required widths, assert all contrast rows are measured and passing, and collect console errors as well as uncaught exceptions. Exercise the actual toolbar switch, body portals, reduced-motion media changes and manager branding. Normalize valid CSS forms such as shorthand hex and equivalent zero-duration units in verification code. Consult the installed package API rather than assuming an older addon integration.

Keep these checks reusable in [the built-page verifier](../../packages/ui/scripts/verify-storybook.mjs) and [contrast regression tests](../../packages/ui/scripts/contrast.test.mjs). Storybook's manager and preview have different build pipelines; managerHead can read the canonical token file at build time, while manager code consumes semantic computed properties. Do not duplicate palette literals to solve a bundler issue.

## Batch 1 extensions

The [batch 1 run](../runs/2026-10-19-storybook-batch-one.md) found that documentation prose styles can still leak into real controls even inside Unstyled. Scope prose margins to direct documentation children, and assert computed field spacing. Long unbroken package import paths also need wrapping at 320px. Compare frozen state styles with live hover/focus after transitions finish; coordinate manual checks with the built story's own play function.

Keep real anchor navigation in exported components. If navigation closes the Vitest frame, prevent it only in the story harness and test native navigation independently against the built UI. Configure class merging with the project's semantic spacing names rather than assuming the merger recognizes them; regression coverage lives in [UI primitive tests](../../packages/ui/tests/primitives.test.tsx).
