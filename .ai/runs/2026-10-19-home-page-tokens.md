# Approved home-page design tokens

## Goal and scope

Create [tokens.css](../../packages/ui/src/tokens.css) and save the approved token table, contrast pairs and non-token decisions in [tokeny.md](../../lekcja-06/tokeny.md). Source: [approved home-page HTML](../../lekcja-06/ekran-bez-ds.html), informed by the [product brief](../specs/product-brief.md). The requested references file and existing token file were absent. User explicitly approved the proposal, accessibility corrections and dark palette before writing.

## Plan and acceptance

1. Preserve existing semantic background/foreground names; define raw, semantic and limited component layers.
2. Implement approved light/dark values, one spacing scale, mobile spacing and reduced-motion duration.
3. Save provenance, usage restrictions, contrast results and non-token decisions.
4. Verify CSS references, all approved color pairs, and repository validation. Do not integrate into application styles or change the standalone preview.

## Progress and decisions

- Created the CSS and documentation. No production TypeScript/TSX changed.
- Reused existing `--background` and `--foreground` names. Raw values remain inside the token file; theme overrides reference raw variables.
- Explicit root `data-theme` overrides OS preference; mobile spacing uses the approved scale through sums for 40px/20px gutters.
- Documented A1/E1/P1/P2 provenance honestly instead of inventing missing reference IDs.
- CSS parsed successfully with PostCSS; all variable references resolve. All 48 light/dark text and essential interface pairings passed calculated WCAG thresholds. Decorative borders and prohibited text/surface combinations are documented separately.
- Initial sandbox test run failed because localhost sockets were prohibited. Rerun with required permissions passed lint, typecheck and all 35 tests with 100% statements, branches, functions and lines.
- `npm audit` reports six high-severity dependency entries through the existing braces advisory GHSA-vfj7-8cjw-p6xm; it stops `npm run check` before build. No dependencies or thresholds changed.
- Standalone build failed first on Google Fonts network access; the escalated retry reached a Turbopack port-binding `Operation not permitted` failure in existing app CSS processing. Build is not verified. Browser/integration tests are not run: these files define dormant token values and documentation, with no UI integration.

## Changed files

- `packages/ui/src/tokens.css`
- `lekcja-06/tokeny.md`
- This repository-required run log.

## Outcome

Requested artifacts are saved. CSS parsing, token reference resolution, contrast checks, lint, typecheck and 100% unit coverage passed; diff whitespace checks passed. Full gate remains blocked by the existing audit advisory and build environment restriction. Existing app styles and home-page HTML are unchanged.
