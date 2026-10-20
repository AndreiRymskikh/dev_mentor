# Stage 2 — batch 1 only

## Goal and authority

Implement Button, Link/text action, Input, Textarea, Label and FormField in packages/ui, with real-package Storybook manuals and tests. User explicitly requested this batch only and a review stop. [POSTEP](../../packages/ui/POSTEP.md) contains the approved Stage 0 plan and F01–F08 design decisions. Read the [engineering standards](../specs/2026-09-01-engineering-standards.md), lessons and installed source before changes. Existing Stage 1 working changes are preserved.

## Plan and acceptance

1. Inspect shadcn CLI registry changes before generation. Generate only needed approved base primitives through CLI; retain only allowlisted dependencies. Link and FormField compose the generated base rather than add another library.
2. Use approved tokens for shape, type, spacing, density and states; no new palette. Keep existing APIs and application routes unchanged. Add only batch-specific exports and styling.
3. Each of the six component pages has all 13 requested manual sections, meaningful states, real exported previews, variant/size guidance, frozen hover/focus using actual state declarations, narrow/long content and play interactions.
4. Add meaningful production unit tests for every success/default/failure/security/interaction branch, maintaining 100% per-file coverage. Run token guard, lint/typechecks, story tests in both themes, Storybook build and browser review at required widths; attempt the full repository gate and record blockers honestly.
5. Update POSTEP and stop. No batch 2, product screens, external support engine, remote push or publication.

## Progress

- Re-read prior handoff, lessons, source/config and approved tokens. Restated F03/F04/F07 control geometry and behavior before implementation.
- Started shadcn 4.22.1 dry-run for button/input/textarea/label; no primitives generated yet. Components configuration and UI-local aliases added without application changes.

## Outcome and verification — completed 2026-10-20

Same run continued after the date change. Batch 1 only is complete; stop for user review. [POSTEP](../../packages/ui/POSTEP.md) records the exact APIs, source decisions, commands, counts and remaining gates.

Delivered six token-based controls/compositions; CLI origin verified for Button/Input/Textarea/Label, native Link and FormField composition; six 13-section manuals, 35 stories and seven play functions. Only approved dependencies retained; unplanned cn removed after CLI generation. Existing API helpers, CrudForm/DataTable/feedback and application routes unchanged. No palette replacement, batch 2 work, product flow implementation, push or publication.

Passed: lint, workspace/tests typecheck, Storybook typecheck, zero token guard violations, four guard/contrast tests, all 44 unit tests with per-file 100% lines/statements/functions/branches, Storybook build and all 92 dual-theme interaction/a11y tests. Built browser checked all 15 manuals in both themes at 320/768/1440px (90 checks); verified live/frozen style parity, native anchor navigation, keyboard validation/focus, control dimensions, textarea resize, prose/field spacing isolation, all six manuals' 13 sections and the live review route. Light/dark screenshots inspected. Review server restarted to refresh its old index and left running locally on 127.0.0.1:6006.

Root npm check stops at the known six high-severity braces advisory entries. Separate app build still fails on the existing Turbopack CSS-worker port restriction, including permission-enabled execution. No application build/CI/integration pass claimed. Do not force dependency downgrades or expand this batch to fix unrelated blockers.

Verification fixes: semantic spacing configuration for tailwind-merge with regression assertion; prevent navigation only in the Vitest link harness and check real navigation in the built browser; wrap unbroken import paths in docs; scope docs prose margins to avoid overriding component feedback; synchronize manual browser checks with built play completion and CSS transitions. No production test exclusions, coverage thresholds or accessibility gates weakened.

