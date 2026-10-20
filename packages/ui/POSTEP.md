# DevMentor design system — progress and operating plan

Date: 2026-10-19. Current stage: **2 — batch 1 complete and verified; stopped for user review. Batch 2 not started.**

This file is the Stage 0 deliverable and run record. The user explicitly requested saving only this file in Stage 0; no separate run log, dependency installation, token/component edits or app changes are made at this stage. Read this file first in a new session. Follow stages 0–5 in order; stop after every stage and after each Stage 2 batch. A proposal below is not an approved product decision.

## Stage checklist

- [x] 0: inspect materials and repository; produce inventory and approval proposal.
- [x] 1: foundations, Storybook setup and token guard (verification limits below).
- [ ] 2: base components, in batches of approximately six; stop after each batch.
- [ ] 3: product components, patterns and screen state maps.
- [ ] 4: operating-manual pages and agent guide.
- [ ] 5: built-page/browser/accessibility verification and report; prepare, do not run, fresh-session agent test.

## Sources and authority

- **TASK**: attached design-system request in this conversation, stages 0–5 and rules 1–12. Product UI and documentation are English. shadcn/ui on Radix is explicitly selected.
- **A1/E1/P1/P2**: source IDs already defined in [approved token decisions](../../lekcja-06/tokeny.md). A1 is the accepted [home page](../../lekcja-06/ekran-bez-ds.html); E1 existing app token names; P1 accessibility corrections; P2 approved dark palette. These are not invented visual-reference IDs.
- **BRIEF**: [current product brief](../../.ai/specs/product-brief.md), including R01/R02 and active D02–D04/N01/N02. [Decision records](../../.ai/specs/research/decisions/) take precedence over old board aspirations; D01 is partly superseded.
- **AUTH**: [users/authentication specification](../../.ai/specs/2026-10-16-users-auth-application-primitives.md). Confirmed requirements are distinguished from its proposed implementation; no authentication feature is implemented by documenting it.
- **ENG**: [engineering standards](../../.ai/specs/2026-09-01-engineering-standards.md), [migration plan](../../.ai/specs/2026-10-14-monorepo-migration.md), [installer specification](../../.ai/specs/2026-10-15-idempotent-installer.md), and [lessons](../../.ai/lessons.md).
- **RESEARCH**: [research directory](../../.ai/specs/research/): interviews, historical competitor checks and board exports, Discord/survey evidence notes, mentor-list note, source manifest, personas, calibration and exploratory walkthrough. Historical benchmarks are not current competitor verification. Board claims, hypothetical spending and synthetic reactions are not proof of demand or authority to add features. Do not copy raw research identities or statistics into fictional story fixtures.
- **WCAG/APG**: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/); cite the specific criterion/pattern beside each documentation rule.
- **SB**: [Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon), [accessibility tests](https://storybook.js.org/docs/writing-tests/accessibility-testing), [themes](https://storybook.js.org/docs/essentials/themes), [manager configuration](https://storybook.js.org/docs/configure/user-interface/features-and-behavior). Exact installed APIs must be verified in Stage 1.

Missing: `lekcja-06/referencje.md`, `.ai/specs/backlog.md`, audit report (explicitly none). No reference Keep/Instead/negative IDs or authoritative epic IDs can be reconstructed honestly. The research manifest describes historical files/decisions not all present today; do not infer missing records.

## 1. Accepted decisions in ten lines

Character words here describe the accepted visual artifact, not an undiscovered brand strategy. No independent negative-reference IDs exist.

1. **Calm:** warm page surface, restrained contrast hierarchy; dark mode approved separately. [A1, P2]
2. **Practical:** a concrete technical problem and next action lead the screen. [A1, BRIEF D02]
3. **Human:** direct expert help; no invented usage counts, testimonials or guarantees. [A1, TASK rule 7]
4. **Technical:** code has its own mono role and inverse surface; not every screen is a terminal. [A1, token component roles]
5. **Restrained:** dark green primary action, green emphasis, no decorative color proliferation. [A1, tokeny.md]
6. **Structured:** one spacing scale; 8px related content, 24px groups/panel padding, 64px sections / 48px mobile. [approved tokeny.md]
7. **Soft, not pill-shaped everywhere:** controls 8px radius, panels 12px, code panel 16px as an exception. [approved tokeny.md]
8. **Accessible:** approved darker accent/muted/focus values replace failing pairs; decorative borders do not identify controls. [P1, WCAG 1.4.3/1.4.11]
9. **Trust through work:** public work replaces rating scores; text sessions replace video; payments/support are external. [N01, N02, D02–D04]
10. **Anti-character:** avoid generic AI decoration, excessive pills/nested cards, hype and false urgency. [TASK Stage 4; proposed interpretation for tone]. Resolved by Q1 approval: preserve the accepted home page; avoid repeating its three-card process layout on new screens.

## 2. Repository inventory

| Area | Observed state | Consequence |
|---|---|---|
| Package manager | npm workspaces; root package-lock.json; Node requirement >=24 | Keep npm and lockfile; no package-manager migration |
| Framework | installed Next 16.4.0, React/React DOM 19.3.0 | Do not upgrade; UI remains framework-independent |
| Styling | installed Tailwind 4.3.3; app globals use Tailwind import/source and inline theme | Use Tailwind 4 Vite integration for isolated UI preview, not app Turbopack configuration |
| TypeScript/tests | TypeScript 5.9.3; Vitest 5.0.4; mandatory per-file 100% source coverage | Preserve root thresholds; add independent Storybook browser test config |
| Tokens | src/tokens.css, approved light/dark raw/semantic/component layers | Retain values/names; no existing token deletion or replacement |
| Fonts | tokens prefer Inter then system sans; system mono stack; app separately fetches Geist/Geist Mono | Local bundled font proposal below; do not edit app layout |
| Existing UI | PageShell; CrudForm; DataTable; EmptyState; ErrorMessage; LoadingMessage | Document/reuse; styling and behavior changes require approval |
| Exports | root exports PageShell; backend wildcard exposes helper index files | Propose additive styles/component/pattern exports in UI package |
| Existing Storybook | none; no .storybook directory | Start only after Stage 0 gate |
| Existing shadcn | no components.json or generated primitives | Configure CLI within UI package, Radix base explicitly selected |
| API | shared apiCall/apiCallOrThrow; standard envelope; app currently only health route | MSW for fictional UI scenario responses; no production domain endpoints |
| App UI | starter home, PageShell with zinc/black classes; app light/dark differs from approved tokens | Do not migrate app or rewrite home under this task |

Existing behavior gaps: CrudForm validates on submit, not blur; does not focus first error; hardcodes Save/Cancel; DataTable has generic empty feedback without filter-aware next actions; feedback helpers have minimal APIs; PageShell is centered and uses palette classes. Preserve helper contracts and tests. These are observations, not permission to rewrite them.

## 3. Stage 0 questions — all five approved 2026-10-19

The numbered questions below are retained as the historical proposal. The user approved all five, including F01–F08: use A1/tokeny.md, C1–C5 provisional groups, external support, compatible helper evolution and the Stage 4 AGENTS link. No answer remains pending for Stage 1.

1. **Missing visual references / conflict:** use A1 + tokeny.md as the authoritative visual reference instead of missing referencje.md? Proposal: retain the approved home page unchanged, but avoid repeating its three-card process layout on new screens. Is that the intended resolution of TASK's three-identical-card prohibition?
2. **Missing backlog / scope:** supply the intended backlog location, or approve provisional documentation groups below (not fabricated epics)? Proposal: keep invitations and dispute operations in “What is missing”; support is external contact only per D02/D04. Auth/admin-user screens are spec-derived, not implemented product capabilities. Does the task intend to supersede that boundary?
3. **Unspecified foundations:** approve proposal F below, or change its values: typography, bundled fonts, density, control dimensions, icons and state rules. Existing palette stays untouched; no error-red palette is assumed.
4. **Existing components:** approve additive token styling and accessible extensions of CrudForm/DataTable/feedback, and tokenizing PageShell while preserving public props/default behavior? Proposal: retain all exports and API helpers, no parallel form/table library, no removals. Keep UI-agnostic HTTP helpers outside the visual component catalog.
5. **Agent guide boundary:** Stage 4 requests an AGENTS.md link while TASK rule 11 otherwise limits external changes to configuration. Approve the narrow root AGENTS.md documentation link, with the guide itself at packages/ui/docs/design-system.md? All application pages remain untouched.

## 4. Foundations F — approved 2026-10-19

F01–F08 were explicitly approved by the user on 2026-10-19. Their provenance remains this approval, not invented reference IDs.

| ID | Proposal | Evidence and limits |
|---|---|---|
| F01 | Bundle Inter variable locally for sans; JetBrains Mono variable locally for code/numbers requiring monospace | Inter is first in A1's stack but not supplied; JetBrains Mono is a NEW proposal replacing reliance on platform-specific mono. No CDN. Font packages and licenses verified before install |
| F02 | Body 16px/1.75, label 14px/1.5, metadata 12px/1.5, section heading 32px/1.2, page heading 40px/1.2, marketing hero 64px/1.1 with mobile 48px. Normal weight 400, labels 600, headings 600. Numbers 14px with tabular numerals; code 14px/1.7. Body measure max 65ch | A1 supports the broad hierarchy; these role values are proposals, not approved tokens. Small marketing copy is not copied as the default app body size |
| F03 | Default control minimum height 48px; compact 40px only for dense administrative rows; icon actions 40px square; textarea minimum height 128px. Control inline padding 16px; gaps 8px; 8px radii. No smaller click target than 24px | Existing spacing/radius scale plus TASK/WCAG 2.5.8; density and dimensions need approval |
| F04 | Focus outline 2px, offset 4px using adjacent surface; error/selected indicators also use text/icon/border, never color alone. No fading opacity for disabled text: use verified muted text with explanation. Loading retains label and announces busy; selected gets explicit checked/selected state. Pressed uses primary hover color, no unapproved new hue | P1 + WCAG 1.4.1/1.4.3/1.4.11/2.4.7; geometry/state choices are proposals. Add state aliases only for actual consumers |
| F05 | Lucide outline icons, 16px inline and 24px standalone; labels for icon-only controls; decorative icons aria-hidden. No emoji icons | TASK anti-pattern list + WCAG 1.1.1/4.1.2; icon library and sizes are proposals |
| F06 | Content max width 1200px, approved page gutters; stacked narrow composition; verify 320/768/1440px. New compact admin rows only where data warrants them. Keep 650px existing spacing breakpoint | A1 width and approved spacing; exact responsive composition beyond home needs specification; no arbitrary responsive variants |
| F07 | Errors use existing foreground, alert icon and explicit corrective text; success requires server confirmation and explicit text. No toast initially: there is no sourced transient notification requirement. No new status colors until a concrete need and contrast approval | TASK forms/errors + existing palette; no red/amber invented from shadcn defaults |
| F08 | Retain approved 200ms interactions and reduced motion 0ms; no shimmer/pulsing skeleton by default; no decorative motion, no generic elevation | A1/P1 + TASK motion; skeleton behavior is proposed. Existing shadow stays code-panel-specific |

## 5. Technical plan — Stage 1 installed; later stages remain gated

- Location: `packages/ui`; config/docs/stories and test harness in `packages/ui/.storybook`; shared components in `src/components/ui`, concept components in `src/components/<plural-concept>`, generic patterns in `src/backend`. Keep app/core/db import boundaries.
- Version: **Storybook 10.6.2**, registry checked 2026-10-19. `@storybook/react-vite@10.6.2` declares React ^19 and TypeScript >=4.9; `@storybook/addon-vitest@10.6.2` declares Vitest ^5 compatibility. Installed React 19.3.0 and Vitest 5.0.4 satisfy those declared ranges. This is metadata compatibility, not a successful install/build test. Pin Storybook family to matching versions; verify remaining peer dependencies before installation.
- Use React/Vite because shared UI imports no Next APIs. No Next-specific framework dependency or Next upgrade.
- Stage 1 dependency allowlist: `storybook`, `@storybook/react-vite`, `@storybook/addon-docs`, `@storybook/addon-a11y`, `@storybook/addon-vitest`, `@storybook/addon-themes` (matching 10.6.2); compatible `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`; `@vitest/browser`, `@vitest/runner`, `@vitest/browser-playwright` aligned with existing Vitest 5.0.4 if direct peers are required; `playwright`; `msw`, `msw-storybook-addon`; local font packages `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono` only if F01 approved. Existing React/react-dom/types, Tailwind, TypeScript and Vitest are reused. Use JSX tables so remark-gfm is unnecessary. Use installed parser tooling for the guard if available; do not add a dependency just to parse a small local format.
- Stage 2 dependency allowlist: `radix-ui` as Radix implementation if current shadcn CLI uses it, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`; shadcn CLI execution only, no unneeded generated dependencies. Inspect chosen registry items before generation; if CLI requires packages outside this list, report them for approval before retaining them. No date-picker, calendar, toast or form-framework dependency presumed.
- Scripts (UI-owned implementation; root convenience delegations only): `storybook`, `build-storybook`, `test:storybook`, `test:storybook:themes`, `check:tokens`; independent light/dark browser projects for all story tests, `a11y: { test: 'error' }`, fail CI on violations unless a narrowly documented approved exception exists. Preserve root unit coverage rules; stories/test harness live outside production src; changed production TS/TSX needs meaningful 100% coverage.
- Themes set `data-theme` on preview document.documentElement, including docs, so body portals inherit theme. Verify an overlay in each theme; manager theme is separate. All previews use actual package exports; only swatches/tables/layout measuring helpers may be docs-only.
- MDX previews use `Unstyled`; JSX tables avoid raw pipe rendering. Check every built documentation page, not just the index.
- DevMentor title/branding only in product-facing manager chrome; base origin in technical note. Disable onboarding/checklist and release notifications using exact supported installed configuration, and inspect built/dev chrome. Do not claim complete branding until inspected.
- Token file stays the sole raw-value source. Add per-semantic-token provenance comments, additive role tokens after F approval, and token-to-Tailwind v4 mappings in UI-owned stylesheet. Semantic classes only. No palette classes, arbitrary Tailwind values or literal visual values in components. CSS keywords/structural values such as grid/flex/auto are not design decisions; numeric visual dimensions get tokens. Breakpoints needing literal CSS syntax are named/documented in the canonical token file and checked by the guard policy.
- Guard scans first-party UI source, stories and documentation examples, reports exact file/line for colors outside tokens, Tailwind palette classes and arbitrary bracket values; extends to numeric visual values where safely parseable. Exclude dependencies/generated build output, not authored examples; document false-positive handling, never broad suppression. Existing PageShell will fail until approved migration. Export paths are additive; app import/integration is out of scope.
- No uploads, publication, remote push or PR. Later allowed external changes: root scripts/lockfile/config wiring; AGENTS link only if Q5 approved. Root tests may need test-harness configuration/wiring; keep source changes inside UI.

## 6. Component and screen-derived plan

The following is a proposal for approval, not an implemented backlog. Groups C1–C5 are local planning IDs, not claimed epic IDs. Replace them with real backlog IDs if supplied. D04 lifecycle details stay visibly unresolved rather than being invented by a demo. UI fixtures do not implement authorization or promise backend behavior.

### Base primitives and feedback — proposed batches

| Batch | Component | Concrete screen/consumer | Source |
|---|---|---|---|
| 1 | Button | Login submit; booking request | AUTH; D02/D04 |
| 1 | Link / text action | Password recovery; public-work links | AUTH; N02 |
| 1 | Input | Email/password; mentor name search (search filter itself proposed) | AUTH; BRIEF catalog |
| 1 | Textarea | Post-service feedback; problem description if accepted | D03/D04; problem field is proposed |
| 1 | Label | Auth and availability form labels | AUTH; TASK forms |
| 1 | FormField | Auth hint/error/required or optional | AUTH; TASK forms |
| 2 | Select | Admin list page size; proposed timezone selection | AUTH bounded pagination; timezone proposal |
| 2 | Checkbox | Admin mentor membership edit | AUTH |
| 2 | RadioGroup | 25/50-minute duration choice | BRIEF R01 |
| 2 | Switch | Availability publication if its save semantics are approved | D03, switch behavior is proposed |
| 2 | Panel | Mentor details and booking summary | D02; A1 |
| 2 | Badge | Account roles; booking approval wording pending | AUTH; D04 |
| 3 | Avatar | Mentor card/profile with fallback | D02; representation proposed |
| 3 | Alert | Auth/server error requiring corrective action | AUTH; TASK |
| 3 | Dialog | Admin role editing in context | AUTH; dialog presentation proposed |
| 3 | ConfirmationDialog | Revoke a role / change a booking; no user deletion | AUTH; D04; confirmation presentation proposed |
| 3 | Menu | Account logout and role-aware actions | AUTH |
| 3 | Popover | Optional slot detail context if approved | D03; presentation proposed |
| 4 | Tooltip | Optional nonessential action explanation | TASK minimum; APG Tooltip |
| 4 | Tabs | Own reservations vs requests only if screen organization approved | D04; presentation proposed |
| 4 | Skeleton | Catalog/profile pending state | TASK data states |
| 4 | LoadingIndicator | Existing LoadingMessage evolution, auth submission | AUTH; existing helper |
| 4 | EmptyState | Existing helper; catalog/list empty next steps | D02; TASK |
| 4 | ErrorState | Existing ErrorMessage evolution, list retry | Existing helper; TASK |
| 5 | Accordion | Home FAQ, accessible native disclosure where sufficient | A1; no extra Radix dependency required if native details is retained |

No toast in the initial plan (F07). IconButton is a documented Button size/label contract, not a duplicate independent component. Deferred menu/tooltip/popover/switch/tabs usage must be approved before generation; a requested generic minimum does not imply a settled domain interaction.

### Product compositions

| Group | Component | Required screen | Source / open boundary |
|---|---|---|---|
| C1 Discovery | MentorCard | Catalog | D02/N02; price/public-work trust, no ratings |
| C1 Discovery | MentorProfileSummary | Mentor detail | D02/N02 |
| C2 Availability | DurationPriceChoice | Mentor detail / booking | R01/D02; price fixtures fictional |
| C2 Availability | AvailabilityCalendar | Mentor detail / book a slot | D02/D03; timezone/grid keyboard model proposal |
| C2 Availability | AvailabilityEditor | Mentor profile calendar | D03; overlap/save semantics unresolved |
| C3 Bookings | BookingSummary | Request / own booking detail | D04; avoid invented payment confirmation |
| C3 Bookings | BookingStatus | Own reservations / mentor requests | D04; exact status names/lifecycle pending |
| C3 Bookings | BookingActions | Own booking change / mentor approval | D04; reapproval/cancel rules pending |
| C4 Support and feedback | SupportContact | Booking detail / support information | D04; configured external contact, no dispute engine |
| C4 Support and feedback | FeedbackForm | Post-service feedback | D03/D04; completion marker/audience/format pending |
| C5 Accounts and roles | AuthForm composition | Login/register/verification/forgot/reset | AUTH; compose fields and shared state, preserve CrudForm |
| C5 Accounts and roles | AccountRoleSummary | Account | AUTH; multi-role display/self-enroll |
| C5 Accounts and roles | RoleEditor | Admin users | AUTH; no user deletion/linking/editable permissions |

Each proposed product component needs loading, empty, error, partial, lots-of-data and long-content examples where meaningful; explain any inapplicable state. Do not manufacture a role-editor domain change merely to fill a story matrix.

### Patterns and fullscreen screen coverage

| Pattern | Screen consumer | State/behavior coverage |
|---|---|---|
| Form (extend existing CrudForm / composable field state) | Auth; feedback; availability | Blur/submit validation, first-error focus, input retained, duplicate prevention; MSW success/pending/field/server/offline |
| Filtered list (extend DataTable where tabular) | Admin users; proposed catalog filtering | Count, removable filters, no matches vs nothing yet, clear/create actions where authorized |
| Detail view | Mentor and own booking | Summary/action within first view at supported widths; missing-or-no-access; no unauthorized data |
| Confirmation | Role revocation; booking changes if approved | Name object, cancel, verb/object confirmation, pending/failure; user deletion explicitly excluded by AUTH |
| Availability selection | Profile calendar | Slot selection, no slots, stale/unavailable slot, keyboard/timezone behavior pending decisions |
| Booking request and approval | Developer request / mentor requests | Mentor approval explicitly required; no invented confirmation from external payment |
| External handoff and support | Booking detail | Text-channel/payment/support boundaries, no chat/checkout/dispute engine |
| Account access and recovery | Auth/account/admin | Generic enumeration-safe messages; expired/used token, provider fail/collision, rate limit, denied access; no account linking |

Fullscreen story candidates: English home; catalog; mentor detail; mentor availability editor; booking request; own reservation list/detail/change; mentor request list/detail; support information; feedback; login; register; verify email; forgot password; reset password; account roles; admin users/role edit; denied/not-found. Not all are settled specifications. Detailed booking and operator stories remain blocked until Q2 and lifecycle decisions. Keep actual app /admin 404 contract unchanged until real auth implementation lands.

## 7. Proposed menu and sizing

```text
Design system
  Start here: how to build a screen
  Components
  How to choose
  Usage and accessibility
  Content
  What to avoid
  What is missing
  Contributing
  Technical notes
  Discovery [C1; provisional]
  Availability [C2; provisional]
  Bookings [C3; provisional]
  Support and feedback [C4; provisional]
  Accounts and roles [C5; provisional]
Foundations
  Color
  Typography
  Spacing and layout
  Shape and depth
  Motion
  Icons
  Themes
  Responsive layout
Primitives
  [25 entries from base table; 13-section documentation each]
Product
  Discovery / ...
  Availability / ...
  Bookings / ...
  Support and feedback / ...
  Accounts and roles / ...
Patterns
  Form
  Filtered list
  Detail view
  Confirmation
  Availability selection
  Booking request and approval
  External handoff and support
  Account access and recovery
```

Estimate, conditional on scope approval: **approximately 68 documentation pages and 340–400 story exports**, including roughly 150 primitive examples, 78 product-state examples, 40 pattern examples, 60 screen-state examples and foundation examples. Theme test reruns are not counted as additional story exports. At least one meaningful play interaction per interactive component/pattern; exact count reported from files in Stage 5, not claimed now. Existing DataTable/CrudForm are documented under Patterns; API helpers get a technical note, not visual previews.

Each primitive page has all 13 requested sections, real component previews, playground, variant/size guidance, state matrix sharing actual declarations, long/narrow content and interaction tests. Each flow page links screen states to stories and original source decisions. Every rule needs a reference/decision/WCAG/APG source; unsourced rules remain proposals on What is missing.

## 8. Preserve / change / remove decisions requested

| Item | Preserve | Proposed change needing approval | Remove |
|---|---|---|---|
| Approved CSS tokens | All current names, raw values, palette and both themes | Per-token source comments; additive typography/density/state/layout/geometry aliases after F approval; UI Tailwind bridge | Nothing |
| tokeny.md / home HTML | Entire approved artifacts | None in this task | Nothing |
| PageShell | Export and children contract | Token styling; preserve layout unless a screen consumer justifies an additive API | Nothing |
| CrudForm | Public props/defaults, schema validation, duplicate guard, callbacks | Add composable field styling, blur validation, first-error focus and optional labels/hints without breaking defaults | Nothing |
| DataTable | Columns/rows/actions/pagination contract | Token styling; additive accessible caption and contextual empty/filter feedback where accepted | Nothing |
| Feedback helpers | Existing exports/default messages/retry/status semantics | Shared real visual primitives, explicit next steps where available | Nothing |
| API helpers | Every contract and implementation | Documentation only | Nothing |
| App source/global theme | Entire existing application | No screen migration; only scripts/config wiring outside UI | Nothing |
| Stories / dependencies | None currently | Add only approved plan items; inspect every CLI manifest diff | Nothing |

Approval of the Stage 0 plan does not silently resolve product lifecycle questions or waive 100% coverage. Approved F proposals will be recorded here with decision date before Stage 1 writes. Do not turn the proposed component list into mandatory dead scaffolding where the associated screen remains blocked.

## 9. Checks and limits

Performed: read attached instructions; inspected local materials, source tree, current components/API helpers, manifests/exports, installed versions, Tailwind/global theme, token documentation and CSS, root test and lint configuration. Checked current Storybook registry version and relevant React/Vitest peer ranges with read-only npm queries; consulted primary Storybook documentation. Confirmed absent references/backlog/Storybook config. Existing git status was clean at Stage 0 start.

Stage 0 changes documentation only. No installs, CLI generation, production code changes, browser execution, accessibility execution, builds, lint/typecheck, unit/integration tests or contrast recalculation were performed in this stage. Existing token documentation records measured pairs; Stage 1 must independently remeasure actual values before writing changes. Prior runs reported a braces audit issue and build sandbox/port constraints; those are historical risks, not current check results.

Only POSTEP.md is saved. Before handoff: validate this Markdown's relative links, whitespace and resulting git status. No separate run log by explicit Stage 0 instruction.

## 10. Next step and future agent test

Stage 1 is complete with the verification evidence below. Wait for explicit **“continue”** before starting Stage 2. Before its first batch, restate approved shape, density and states with F01–F08/A1/P1 sources. Implement only batch 1 (Button, Link/text action, Input, Textarea, Label, FormField), then stop again. No additional dependencies or domain lifecycle assumptions are authorized implicitly.

The fresh-session agent test is intentionally not selected or run in Stage 0: Stage 5 must choose a real backlog screen not already in Storybook after backlog reconciliation. Record its standalone task, source IDs, expected component composition and evaluation checklist here without supplying private answers. Readiness cannot be declared until the user runs that independent session and all guessing points are documented or added to What is missing.

## Stage 1 execution — 2026-10-19

All Q1–Q5 and F01–F08 approved explicitly. A1 plus tokeny.md are visual authority. Preserve the approved home page; do not repeat the three-card process pattern on new screens. C1–C5 are approved provisional documentation groups, not claimed backlog epics. Support stays external; invitations/dispute operations stay on What is missing. Existing APIs must remain compatible. Root AGENTS.md guide link approved for Stage 4; not implemented early. Stage 1 only is authorized in this turn.

Plan: configure isolated React/Vite Storybook, local fonts, measured foundation docs and UI Tailwind bridge; add root theme controls and strict dual-theme a11y tests; add a tested token guard and verify build/docs. No Stage 2 primitive generation or product screens. Before-save calculation of actual existing CSS passed all 48 pairs; no color values are changed or added.

## Stage 1 result and handoff

Completed 2026-10-19. Stage 2 has not started.

### Delivered

- React/Vite Storybook **10.6.2**, UI-owned configuration, additive root scripts and CSS exports. React 19.3.0, Next 16.4.0, Vitest 5.0.4 and their application contracts are preserved.
- Approved raw/semantic/component tokens extended with F01–F08 typography, sizing, geometry and layout roles; every semantic definition has a source comment. Existing palette values and theme decisions remain intact. No new status palette or toast.
- Opt-in Tailwind v4 bridge in src/styles.css; bundled Inter Variable and JetBrains Mono Variable, with OFL license texts copied into static documentation. No design-system CDN fonts.
- **Eight Foundations documentation pages** (Color, Typography, Spacing and layout, Shape and depth, Motion, Icons, Themes, Responsive layout) plus **Technical notes**: **9 MDX pages, 11 story exports, 11 play functions**. These are foundations and real-package integration probes, not Stage 2 component documentation. Helpers are documentation-only; the composition probe uses exported PageShell and LoadingMessage, and the API probe uses exported apiCall.
- Document-root theme controls for stories and docs, a body-portal probe, strict a11y errors, and independent light/dark test projects. API mocks use MSW 3 and the installed addon's CSF3 loader; unmatched API calls fail while assets/navigation may pass through.
- Purpose-based PageShell classes replace its previous zinc/black classes without changing its public props or structure. Other existing components and API implementations are unchanged.
- DevMentor manager branding, onboarding flags disabled and core release notifications disabled. This installed version hardcodes the browser-title suffix, so a scoped title observer replaces it while retaining the page name. The native vendor About link is hidden; base provenance lives in Technical notes. Manager CSS variables are read from the canonical token file through managerHead because the manager bundler does not support Vite's raw CSS imports.
- Tested token guard covers authored src, .storybook and docs (including Markdown). It rejects literal colors, palette utilities, arbitrary Tailwind values and raw-token consumption; reports file/line; only the canonical src/tokens.css is exempt. Generated build/worker and dependencies are outside authored-source scanning. Four Node harness tests cover both forbidden examples and semantic consumption, scanning boundaries and minified contrast handling.
- Reusable built-page verifier: npm run verify:storybook; add --dev when invoking its script directly to check the running local manager as well. Root npm scripts include all Stage 1 commands.

### Verified

| Check | Actual result |
|---|---|
| Before-save contrast | 48/48 actual light/dark token pairs passed; no color changes |
| Storybook production build | Passed; fonts and licenses emitted locally |
| Storybook lint/typecheck | Passed |
| Root lint/typecheck | Passed |
| Token guard | Passed; zero authored-source violations |
| Checker/contrast harness | 4/4 Node tests passed |
| Storybook interaction + accessibility | 22/22 tests passed, 11 stories in both themes; strict a11y error mode, no reported violations |
| Built documentation browser verification | All 9 pages × 2 themes × 3 widths = 54 successful checks; real CSS values, no failing contrast rows, no horizontal page overflow, local fonts, JSX tables, no runtime/console errors |
| Additional browser behavior | Actual toolbar changes the root theme; body-portal keyboard open/close and theme inheritance passed; reduced-motion transition and live token table resolve to zero |
| Branding | Built and dev manager show DevMentor; navigation titles use DevMentor; dev onboarding absent; configuration disables release notifications |
| Visual review | Inspected light/dark color pages and manager screenshots; remaining component/UI visual review belongs to later stages |
| Root unit coverage | 35/35 tests; 100% statements, branches, functions and lines; thresholds unchanged |
| npm audit | Failed: six pre-existing high-severity entries through braces GHSA-vfj7-8cjw-p6xm. No forced dependency downgrade or suppression |
| Root application build | Attempted separately after audit stopped the root gate; existing Turbopack CSS worker port binding fails with Operation not permitted even in escalated execution. Application build is not verified |
| PostgreSQL/app integration | Not run: no domain/persistence/route changes; application build remains blocked |
| Remote push/publication | Not performed |

Evidence (ignored, locally reproducible): .storybook/test-results/built-docs-report.json (54 checks); story-tests.json (22 passed, zero failed); foundations-light.png; foundations-dark.png; manager.png; dev-manager.png. Local Storybook left running at http://127.0.0.1:6006/ for review. Use npm run storybook to start it again if it stops.

Production build verification found and fixed shorthand-color parsing (six-digit white becomes shorthand in built CSS); regression coverage is in scripts/contrast.test.mjs. Source/role values were never changed to conceal a failing pair. Vite reloads during initial dependency discovery were resolved by explicit pre-optimization and automatic installed-addon annotations; the final test run passed cleanly.

### Remaining scope and approval gates

- Full repository gate remains red from the existing audit finding and application build restriction. This report does not claim CI or application release readiness.
- Do not create product invitations/dispute engines; support remains external. No new product lifecycle defaults were approved by the foundation work.
- Exact booking statuses, changes/reapproval, cancellation, completion marker, timezone policy and feedback audience/format remain specification questions for Stage 3. Record them on What is missing rather than inventing behavior.
- Stage 2 primitive batches, Stage 3 compositions/screens, Stage 4 operating-manual/agent guide (including the approved root AGENTS link) and Stage 5 final independent-agent exercise remain outstanding.
- Next action: await user review and **“continue”**. Then Stage 2 batch 1 only, with its own verification and stop.

## Stage 2 batch 1 — in progress, 2026-10-19

User requested batch 1 only, verification and a review stop. F01–F08 remain authoritative. Keep 48px standard / 40px compact heights, 8px control radii, 16px horizontal padding, 8px related gaps, 2px focus / 4px offset. Retain label while busy, explain unavailable actions, no opacity-faded text or new status colors. First inspect CLI changes/dependencies, then generate only needed primitives. Link and FormField are compositions; no new feature screens or batch 2 components. Execution log: [batch-one run](../../.ai/runs/2026-10-19-storybook-batch-one.md).

## Stage 2 batch 1 — complete, 2026-10-20

Started 2026-10-19 and completed in the same run after the date changed. Scope: **Button, Link/text action, Input, Textarea, Label and FormField only**.

### Batch checklist

- [x] Batch 1: six approved components and their manuals/tests.
- [ ] Batch 2 and all subsequent batches: not started; await user instruction.

### Delivered and decisions

- Inspected shadcn **4.22.1** dry-run and source before generation. CLI generated only Button, Input, Textarea and Label; these were adapted to approved F01–F08/A1/P1/P2. The selected registry also requested an unplanned `cn` package: removed it immediately and used only approved `clsx`, `tailwind-merge`, `class-variance-authority` and `radix-ui` (plus existing Lucide). Direct dependencies were checked after CLI/npm operations. No CLI or animation framework was retained as a new dependency.
- Button: primary/text variants; default/compact/icon sizes; native button semantics with explicit default type=button, retained label and busy announcement, visible disabledReason, native toggle attributes. No destructive/secondary/ghost/oversized variants or asChild polymorphism added. Navigation has its own native Link.
- Link: meaningful native anchor, safe web/email/relative URLs, new-tab noopener/noreferrer merging. Executable URL schemes are rejected. Text action is Button variant=text. No disabled-link variant.
- Input/Textarea: native props, refs, controlled/uncontrolled values and constraints remain available. Input has standard/administrative compact density; Textarea has a 128px minimum and vertical resizing. Visible labels/feedback come from FormField.
- Label: CLI-generated Radix/native label, adapted to product type and spacing without disabled opacity.
- FormField: composition under src/backend/fields, not another form library. Generated or explicit IDs; visible Required/Optional; hint/error/disabled explanation IDs; error icon and alert. Its owner performs validation/submission and first-error focus. Existing CrudForm, DataTable and feedback APIs were not migrated or changed.
- All control geometry/type/spacing/color/motion is token-based. Added only full-size/opacity/invisible-border aliases needed by the controls; **no opaque palette values changed or added**. Primary controls use 48px height, administrative compact 40px, icon actions 40px square, radius 8px; focus 2px/4px offset. Compact input typography uses the approved label role so its actual height is 40px.
- Real and frozen hover/focus declarations reuse the same Tailwind custom utilities. Frozen bindings live only in Storybook CSS. Disabled text is not opacity-faded; errors have words plus an icon using the existing palette.
- Added additive component subpath exports and backend/fields export; React/Next/Vitest versions and existing exports remain intact. Root changes are test configuration/lockfile only, with unit tests stored inside the UI package.
- Each of the six manuals has all **13 required sections**, API/defaults, minimal and typical product snippets, good/bad code pairs, source citations, and real exported previews. Nonapplicable states are explained. Added **35 stories and 7 play functions**. Cumulative Storybook: **15 MDX pages, 46 stories, 18 play functions**. No product screen or batch 2 primitive was implemented.

### Verification evidence

| Check | Actual result |
|---|---|
| Root lint + workspace/test typecheck | Passed |
| Storybook typecheck | Passed |
| Token guard | Passed; zero violations |
| Guard/contrast Node harness | 4/4 passed |
| Unit coverage | 44/44 tests, all production files at 100% statements/branches/functions/lines (443 statements, 340 branches, 106 functions, 307 lines); thresholds/exclusions unchanged |
| Both-theme story interactions and accessibility | 92/92 tests passed, zero reported failures/violations; a11y error mode retained |
| Storybook production build | Passed |
| Built manual browser checks | 15 pages × 2 themes × 320/768/1440px = 90 passing checks; six manuals each have all 13 sections; no page overflow, broken MDX tables, runtime or console errors |
| Component browser checks | Live/frozen hover and focus match for Button, Link, Input and Textarea in both themes; native anchor navigation; keyboard invalid-submit focus and retained/corrected field value; approved button/input sizes; textarea minimum and vertical resize; documentation does not override field-helper margins |
| Visual review | Light/dark Button variants and input/textarea state screenshots reviewed; local dev component manual is available |
| Review server | Restarted owned Stage 1 server after its old index missed new entries; verified the new Button manual at http://127.0.0.1:6006/?path=/docs/primitives-button--docs |
| npm audit / full root gate | Existing six high-severity braces-chain findings remain; no forced downgrade or suppression |
| Application build | Attempted separately; existing Turbopack worker port binding still fails with Operation not permitted. Application build/CI not claimed passed |
| PostgreSQL/application integration | Not run: this batch adds shared controls and docs, without domain endpoints/persistence or application flow integration |
| Remote operations | No push, PR or publication |

Evidence is local and ignored: .storybook/test-results/batch-one-story-tests.json (92 passed); built-docs-report.json (90 checks plus frozen/live results); batch-one-light/dark.png; batch-one-input-light/dark.png; batch-one-textarea-light/dark.png; dev-manager.png. Reproduce with the existing scripts; `node packages/ui/scripts/verify-storybook.mjs --dev` checks the running local review server too.

### Corrections found during verification

- Configured tailwind-merge with the semantic spacing names, backed by a regression assertion; its default configuration did not merge those classes.
- Isolated anchor navigation inside the Vitest story harness so it does not close the runner frame; native navigation is separately exercised in the built browser. The exported Link retains native behavior.
- Wrapped long package import paths in documentation prose to eliminate 320px overflow.
- Scoped documentation paragraph margins to direct prose children so they cannot change spacing inside real FormField previews; browser assertion protects this boundary.
- Browser checks wait for the story's own play function before manually exercising its owner-supplied form state, and wait for actual transitions before comparing frozen/live styles.

### Stop and next step

**Stopped here for review.** Do not start batch 2 or Stage 3–5 without a new user instruction. Next planned batch remains Select, Checkbox, RadioGroup, Switch, Panel and Badge, with unresolved domain-specific presentation choices kept explicit. Existing lifecycle questions and Stage 4 AGENTS guide link remain outstanding in their proper stages. Full repository release readiness is still blocked by the recorded audit/build limitations.
