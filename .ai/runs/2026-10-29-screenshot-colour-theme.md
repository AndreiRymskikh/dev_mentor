# Screenshot colour theme

## Goal and references
Match the shared app/Storybook colour palette to the owner-provided [E01](../docs/designs/e01/) and [E02](../docs/designs/e02/) PNGs. Related context: [design handoff](../specs/2026-09-09-e02-design-handoff.md). This run changes the colour foundation, not the handoff's remaining feature scope.

## Plan and acceptance
- Sample screenshots and identify shared colours.
- Update canonical semantic tokens, preserving layout and component APIs; document provenance and dark-theme interpretation.
- Add palette regression checks; verify token guard, contrast, Storybook production pages and project checks.
- Acceptance: neutral page/card/text palette and blue actions in Storybook and shared app CSS; both themes pass existing contrast checks.

## Evidence and decisions
- Sampled all 17 PNGs: page #f7f7f7, card #ffffff, foreground #171717, muted #5c5c5c, primary #335cff, subtle border #ebebeb and selected fill #ecf0ff recur.
- Screenshots provide light mode only; dark mode will use neutral surfaces and accessible blue actions.
- Preserve accessible essential control borders; screenshot #ebebeb is suitable for decorative dividers, but cannot meet the existing 3:1 essential-control contrast contract.
- Shared tokens already drive app, preview and manager; no duplicated palette or component implementation needed.

## Progress
- Inspection and screenshot sampling complete.
- Implemented shared neutral/blue light and dark palettes, updated Storybook colour guidance, and added screenshot-palette/contrast/OS-theme regression tests.

## Changed files
- `packages/ui/src/tokens.css`: canonical colour values and provenance.
- `packages/ui/.storybook/docs/color.mdx`: reference palette and accessibility guidance.
- `packages/ui/scripts/palette.test.mjs`: sampled semantic values, 24 contrast pairs in both themes, automatic/explicit dark parity.

## Validation
- Passed token guard and all 6 foundation tests.
- Passed lint, workspace/test typechecking and Storybook typechecking.
- Passed 131 unit tests; 100% statements/branches/functions/lines (97 fully covered files).
- Passed Storybook production build and built-page verifier: 15 documentation pages × 2 themes × 3 widths = 90 checks, plus real toolbar/theme and control interaction checks. Visually inspected generated manager and light button screenshots.
- Initial sandbox runs could not bind localhost; reran coverage and browser verification with granted access and both passed.
- `npm run check` stops at audit: existing high-severity `undici` advisories. Dependencies were not changed for this colour task.
- Passed app production build separately. The sandboxed build stalled at compilation; stopped only this run's owned build processes and retried with granted access, which passed.
- PostgreSQL integration suite not run: no business logic or persistence changed; affected UI verified through built Storybook.
- Screenshot input directories remain untouched and untracked as supplied by the owner.

## Outcome
Complete locally: shared app and Storybook colour foundation matches the reference direction, with accessible control borders and a neutral/blue dark adaptation. No commit or PR requested. Audit finding remains outside this colour-only change.

