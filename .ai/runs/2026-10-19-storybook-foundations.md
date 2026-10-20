# Stage 1 — DevMentor Storybook foundations

## Goal and authorization

Implement Stage 1 only of the user's staged design-system request. [POSTEP](../../packages/ui/POSTEP.md) holds the inventory and full approved plan. User approved Q1–Q5 and F01–F08 on 2026-10-19: approved home/tokens are references, support remains external, APIs preserved, agent guide link permitted at Stage 4. No primitive batch or product-screen implementation in this stage.

## Plan and progress

- Preserve approved colors and existing token names, add per-token provenance and approved font/type/geometry/layout aliases; bundle fonts locally; add an opt-in Tailwind v4 bridge.
- Configure isolated React/Vite Storybook 10.6.2, MSW, docs helpers and foundation pages, document-root theme switching and strict light/dark accessibility/interaction tests.
- Add tested token guard and verify actual built documentation in both themes at 320/768/1440px; run repository gate.
- Existing PageShell public API preserved; its existing palette classes become semantic classes. Other existing helper implementations and all application routes are untouched.
- The missing references/backlog are not invented; C1–C5 remain provisional groups; support stays external. Agent guide and root AGENTS link remain Stage 4 work.

## Decisions and evidence

- Before-save contrast check of actual CSS: all 48 approved color pairings pass. No colors added or changed.
- Storybook React/Vite and Vitest addon peer ranges checked against installed React 19.3.0 / Vitest 5.0.4. React DOM peer pinned to existing 19.3.0 to avoid npm selecting an incompatible newer React DOM.
- Registry has no runner 5.0.4; @vitest/runner 4.1.11 satisfies Storybook's declared peer range and is only an addon peer. Root Vitest stays 5.0.4.
- Installed MSW 3 uses onUnhandledFrame and the addon's CSF3 subpath. A trial MSW 2 pin produced incompatible duplicate types against Vitest's MSW 3; restored one shared MSW 3 version and used installed API documentation/types. No force or legacy-peer-deps used.
- Docs-only pages need a theme-aware DocsContainer: story decorators alone do not theme standalone documentation. Added that container and attached technical docs to real package-composition stories.
- CLI manifest checks after npm installs and MSW worker generation: only allowlisted direct dependencies retained. Generated worker and build output are excluded from authored lint/token scanning; no production coverage exclusions or threshold changes.

## Validation so far

- Storybook build passed; known nonfatal module-directive/chunk-size and local global-settings warnings.
- 22 Storybook tests passed (11 stories across both themes); a11y configured as error. Rerun required after docs-container change.
- Token checker, its three fixture tests, Storybook typecheck and lint passed.
- Root lint/typecheck and all 35 unit tests passed; 100% statements/branches/functions/lines.
- npm audit fails on six pre-existing high-severity entries from braces GHSA-vfj7-8cjw-p6xm. No forced downgrade/suppression.
- Root application build attempted independently; fails at existing Turbopack worker port binding (Operation not permitted), including escalated execution. Storybook build is separate and passed.
- Built-page verification is in progress; completion and visual inspection not yet claimed.

## Final outcome

Stage 1 delivered and stopped for review. Final evidence is recorded in [POSTEP](../../packages/ui/POSTEP.md): 9 MDX pages, 11 stories and 11 play functions; 22 passing light/dark interaction/a11y tests; 54 passing built-doc viewport/theme checks, toolbar switching, reduced motion, local fonts and manager branding. Four Node guard/contrast tests pass. Root lint/typecheck and 100% unit coverage pass. CSS minification shorthand parsing received a regression test; the manager now reads semantic CSS values supplied from the canonical token file through managerHead, with verified DevMentor titles and onboarding disabled. No contrast pairs fail; palette unchanged.

Full repository gate remains blocked by the existing braces audit finding and Turbopack environment restriction; no CI/application-release claim. No PostgreSQL/app integration run. Stage 2 is not started, and the Stage 4 AGENTS link remains intentionally deferred. Local-only Storybook is running on 127.0.0.1:6006 for user review. No remote push/publication.

Changed areas: packages/ui/.storybook (config, 9 docs, stories/helpers, generated MSW worker and bundled-font licenses); packages/ui/scripts (guard/tests/built verifier); UI token/styles/exports/scripts and PageShell semantic classes; root package scripts/lockfile, ESLint generated-output ignores and gitignore; POSTEP, this log and reusable Storybook verification lesson. No application route/source/config implementation changes.

