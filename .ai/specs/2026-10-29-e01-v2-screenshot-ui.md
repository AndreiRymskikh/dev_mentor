# E01 v2 — Screenshot-driven account and workspace UI

Date: 2026-10-29. Status: proposed; implementation not started.
Source: all ten owner-supplied PNGs in `.ai/docs/designs/e01/`.

## 📝 TLDR
Replace the current account-entry and role-home presentation with the E01 screenshot design, including sign-in, registration, email follow-up, role-aware workspaces, administrator users and session-expiry feedback. Keep the existing authentication, authorization and persistence contracts. The complete mentor home composes the separately delivered E02 prices/availability work; a matching static mock is not completion.

## Resolved assumptions (autonomous defaults)

| ID | Choice | Reason and boundary |
| --- | --- | --- |
| A1 | One E01 UI integration spec; independently deployable mentor-domain capabilities remain under existing E02 epic #6 and its specs. | Avoid a second pricing/availability implementation. E01's mentor-home slice is blocked until those dependencies exist. |
| A2 | Keep GitHub coming-soon feedback. | The October authentication spec explicitly defers OAuth. The screenshot's button changes placement/presentation, not provider scope. |
| A3 | Display developer as “mentee” and administrator as “operator”; preserve persisted role values and verified self-service mentor enrollment. | Screenshots cannot silently replace approved security contracts. Correct the operator screen's claim that users cannot assign themselves any role. |
| A4 | Keep `/admin` redirecting to `/admin/users`; add `/admin/workspace` for the operator landing screen. | Makes screenshot 07 reachable without breaking the protected redirect. |
| A5 | Keep `/account` as the authenticated landing URL and show the mentee “My sessions” first-home state there; mentor and operator homes have explicit navigation. | Avoid changing login return destinations or guessing a role-precedence policy for multi-role users. |
| A6 | No new session, notes, catalog, payout, booking or cancellation service. | Show navigation destinations as unavailable with an accessible explanation until their owning feature ships. Never link to a 404 or show a successful fake action. This means exact screenshot interaction parity is dependency-bound. |
| A7 | Preserve truthful security copy even when screenshot text differs. | Generic registration acceptance, byte-based password validation, verification without login, and current permission checks remain authoritative. |

These are reversible UI integration choices for review, not evidence that any new capability is implemented. No schema, auth weakening, money rule or product non-goal is defaulted into existence. There are no blocking design questions for the E01 UI slices; domain dependency decisions below block full mentor-home completion.

## 📝 Problem Statement and evidence

The owner explicitly requests a new E01 version implementing every supplied screen. Current source has working email/password flows in `packages/app/src/app/(auth)/`, a basic `/account`, `/mentor`, and a protected `/admin/users` table; these use different layout/copy and lack the unified screenshot workspace shell. The GitHub button currently reports coming soon. `/admin` redirects to users. Mentor profile publication exists, but prices, slots, booking occupancy and payout status are not implemented in the inspected checkout.

This spec defines the UI delta, not a replacement for the [authentication specification](2026-10-16-users-auth-application-primitives.md), [engineering standards](2026-09-01-engineering-standards.md), [product brief](product-brief.md), or [compatibility contract](../../BACKWARD_COMPATIBILITY.md). Existing issue #4 owns the older auth feature; #6 owns E02. Historical issue IDs in September specs refer to a different repository and are not local dependencies.

## Implementation audit — screens 05–09 requested again by the owner

Audit date: 2026-10-29; invoking checkout `a5fccae`. This is a source audit, not a claim of live authenticated browser QA. A working route or backend does not mean its reference screen is implemented.

| Reference | Actual current source | Verdict | Work explicitly required |
| --- | --- | --- | --- |
| 05-mentee-first-home | `(auth)/account/page.tsx` renders “Your account”, name, raw roles, enrollment, admin/mentor links and logout. `(auth)/layout.tsx` wraps it in the auth card. No “My sessions” first-home or workspace sidebar/top bar was found. | Screenshot screen not implemented. | Implement mentee workspace shell and first-home/availability states, identity, role-aware navigation and first-session CTA; preserve enrollment and authorization. S01 + S03. |
| 06-mentor-home | `mentor/page.tsx` renders a basic “Your mentor home”, onboarding deadline, profile readiness checklist and edit/account links. Source has no mentor-price or availability-slot service/entity/route. | Partial underlying profile/onboarding functionality; full screenshot screen not implemented. | Implement every screenshot section, including price/availability forms, times table, three-step progress and share panel; wire actual E02 services rather than canned values. S01 + S04, dependency #6. |
| 07-operator-home | `admin/page.tsx` calls `adminAccess` then redirects to `/admin/users`; no operator workspace landing route/card was found. | Screenshot screen not implemented. | Add protected `/admin/workspace` landing with access explanation and View users action; preserve `/admin` compatibility. S03. |
| 08-operator-users | `admin/users/users-list.tsx` implements real search, pagination, verified status and role editing, with Name/Email/Verified/Roles. Admin layout is only a wrapping div. | Functional administrator listing exists; screenshot screen only partially implemented. | Apply workspace shell and reference table layout; add truthful payout-availability cell and display role labels, retaining existing controls/security. S03. |
| 09-session-expired | `session.service.ts`/JWT enforce expiry, but the inspected app/tests contain no `session-expired` reason or “Your session has expired” UI. Login currently shows the generic auth form. | Session expiration backend exists; screenshot recovery screen not implemented. | Add reason-specific warning, unauthorized-client private-content cleanup and safe sign-in recovery, plus the mobile variant 10. S05. |

The implementation issues must carry these verdicts. They must not close because auth, profile publication, administrator listing or the new colour palette already exists. Each is done only when its new presentation and specified interactions are implemented and tested.

## 📝 Proposed Solution and scope

Deliver a shared public auth frame and authenticated workspace frame, then migrate existing route consumers in bounded UI slices. Add deterministic Storybook states for the screens, and prove the same behavior in production browser integration using isolated fixtures.

Included: all ten reference images; semantic status colours; responsive composition; additive role navigation; sign-out and expired-session recovery; protected operator landing and real users; all mentor-home sections when their E02 dependencies are ready.

Excluded: OAuth, role renaming/migration, changing mentor enrollment, on-site payment/Stripe, private notes/chat, actual session booking/cancellation, catalog implementation, new email delivery rules, ratings/reviews and video. Existing password recovery, verification resend, administrator role editing, search and pagination remain reachable even though the PNGs omit them.

## 📝 UI/UX — complete screenshot traceability

The filenames are exact and stable. Reference URLs point to the published evidence branch, not to an implementer's local checkout. Inputs contain illustrative fixture data only. No production page hardcodes these identities.

| Screen | Reference and intended route/state | Required implementation and verification | Slice |
| --- | --- | --- | --- |
| E01-01 | [01-sign-in.png](https://raw.githubusercontent.com/AndreiRymskikh/dev_mentor/qa-evidence-e01-v2/e01/01-sign-in.png), `/login` | Brand above centred white card; “Welcome back”; intro; outlined GitHub button above email divider; email/password; full-width blue sign-in; create-account and home links; footer. Preserve recovery/resend affordances. Verify credentials, errors, pending, retry and GitHub explanation. | S02 |
| E01-02 | [02-create-account.png](https://raw.githubusercontent.com/AndreiRymskikh/dev_mentor/qa-evidence-e01-v2/e01/02-create-account.png), `/register` | Matching frame; display name/email/password, required markers, GitHub placement, password help, full-width action and sign-in/home links. Explain actual 12–72 UTF-8-byte rule rather than falsely equating it to character count. Generic 202 transitions to E01-03. | S02 |
| E01-03 | [03-check-your-inbox.png](https://raw.githubusercontent.com/AndreiRymskikh/dev_mentor/qa-evidence-e01-v2/e01/03-check-your-inbox.png), accepted-registration view at `/register` | Focus “Check your inbox”; replace password form; explain verification before private access; change-email/new-link action and back-to-sign-in. Submitted email may be echoed from volatile local form state only; copy must say “If this address can be registered…” and never assert account creation or mail delivery. Refresh has a useful generic state or returns to registration. | S02 |
| E01-04 | [04-email-verified.png](https://raw.githubusercontent.com/AndreiRymskikh/dev_mentor/qa-evidence-e01-v2/e01/04-email-verified.png), successful `/verify-email` action | “Your email is verified”, green semantic confirmation, “Open my workspace”, sign-in link. Verification never issues a session: workspace follows existing `/account` authorization and asks unauthenticated users to sign in. Include invalid/expired/used-token, resend, pending and network-error states. | S02 |
| E01-05 | [05-mentee-first-home.png](https://raw.githubusercontent.com/AndreiRymskikh/dev_mentor/qa-evidence-e01-v2/e01/05-mentee-first-home.png), `/account` first-home | Sidebar, top bar/sign-out, signed-in identity, “My sessions” and centred first-session empty card. An actual zero-session result is required before claiming “No sessions yet” once sessions ship; current release must state that sessions are not available yet rather than masquerading as an authoritative query. Find/browse mentor CTA is honestly unavailable until a catalog route exists. Existing mentor enrollment stays accessible. | S03 |
| E01-06 | [06-mentor-home.png](https://raw.githubusercontent.com/AndreiRymskikh/dev_mentor/qa-evidence-e01-v2/e01/06-mentor-home.png), `/mentor` | Entire page: heading/edit profile; three-step progress/checklist; 25/50-minute price form with approved bounds; UTC-labelled available-time form; available-times table and row actions; share-ready panel, payout affordance and public-profile link. Load real owner profile/prices/slots; never hardcode “3 of 3”. See dependency rules below. | S04 |
| E01-07 | [07-operator-home.png](https://raw.githubusercontent.com/AndreiRymskikh/dev_mentor/qa-evidence-e01-v2/e01/07-operator-home.png), new `/admin/workspace` | Operator heading, access-information card/icon and full-width “View users” link. Apply the same current administrator guard as `/admin/users`. Explain administrator-only admin grants and optional/self-service mentor access truthfully. | S03 |
| E01-08 | [08-operator-users.png](https://raw.githubusercontent.com/AndreiRymskikh/dev_mentor/qa-evidence-e01-v2/e01/08-operator-users.png), `/admin/users` | Shared shell and white contained table with Name/Email/Payout setup/Roles. Reuse real bounded users DTO; map role labels only in presentation. Retain verified/search/pagination/role-management behavior through accessible secondary controls. Show “Not a mentor” from current membership; for mentors without a payout integration show “Not available”, not a fabricated setup result. | S03 |
| E01-09 | [09-session-expired.png](https://raw.githubusercontent.com/AndreiRymskikh/dev_mentor/qa-evidence-e01-v2/e01/09-session-expired.png), `/login?reason=session-expired` | Warning above GitHub action: “Your session has expired” / “Sign in again to continue.” A display-only reason cannot authorize access. Protected client 401 clears private UI and routes here; 403 remains denial and 503 stays retryable. Do not persist/prepopulate screenshot credentials. | S05 |
| E01-10 | [10-sign-in-mobile.png](https://raw.githubusercontent.com/AndreiRymskikh/dev_mentor/qa-evidence-e01-v2/e01/10-sign-in-mobile.png), narrow E01-09 | Same state at the reference's 390px width; 20px outer gutters, wrapped intro/warning, stacked fields, full-width action and reachable footer. Verify at 320px as well, keyboard/focus, zoom and password-manager autofill. | S05 |

### Layout and colour contract

Light reference palette: background `#f7f7f7`, card/sidebar `#ffffff`, foreground `#171717`, secondary text `#5c5c5c`, primary `#335cff`, selected/support `#ecf0ff`, decorative border `#ebebeb`. Use semantic tokens from `packages/ui/src/tokens.css`; do not scatter literal colours into consumers. The preceding colour-theme change is a prerequisite and must be present on the implementation base, not assumed merged.

Add semantic success background/text and warning background/text for E01-04/09. Sampled success is `#e3f7ec` / `#0b4627`; warning background is `#fff3eb`; sample its foreground from E01-09 and validate contrast. If a destructive action is introduced with S04, add an accessible semantic danger pair based on the reference; colour alone never signals removal or errors. Define and test dark counterparts, since screenshots specify only light mode. Keep control/focus contrast at least 3:1, body text at least 4.5:1; subtle screenshot borders are decorative rather than the only field identifier.

At 1440px, auth cards are approximately 520px wide with 40px inner padding; adapt height to content, not fixed screenshot coordinates. Workspace sidebar is approximately 272px, top bar 80px, with a 48px content gutter. Mentor form cards sit side by side at desktop and stack on narrow screens. Radius/spacing changes need semantic tokens rather than page-specific arbitrary utilities. Match screenshot hierarchy, spacing, icons and content alignment; retain the approved font family. Sidebar collapse must preserve access to every permitted item, have a labelled keyboard-operable trigger, close with Escape and restore focus. No document overflow at 320/390/768/1440px; a users table may have a labelled local scroll region.

### Navigation and roles

All users have the developer/mentee workspace. Mentor membership adds mentor home/profile and future mentor-only destinations. Administrator membership adds operator home/users. Multi-role navigation is additive and ordered as in screenshots; no role switcher removes other memberships. Pages resolve current roles server-side; UI visibility is never authorization. Keep account/enrollment access available from the identity area without forcing it into the main screenshot navigation.

Existing `/mentor/profile`, `/m/[slug]` and invitation continuation remain valid. For missing catalog, sessions, private notes and payouts routes, keep the relevant design affordance visibly unavailable with a reason and a Storybook future-state example. A dependency may later enable it; do not implement a fake backend, send users to a 404, or link to a guessed URL. The bounded E01 UI milestone accepts only the explicitly proposed unavailable states above; it must not be described as complete sessions, catalog, notes or payouts functionality. These later capabilities are separate work. The E02-backed prices/slots remain a required dependency for S04, not an accepted static substitute.

### Mentor-home dependency contract

Use [E02 epic #6](https://github.com/AndreiRymskikh/dev_mentor/issues/6), [mentor prices](2026-09-08-mentor-prices.md), [availability](2026-09-08-availability-slots.md) and [E02 design handoff](2026-09-09-e02-design-handoff.md). E01 S04 owns layout/composition; E02 owns persistence, validation, ownership and API contracts. Do not open duplicate E02 tickets or duplicate these services inside the UI.

- Prices: both 25/50-minute values save together, integer minor units internally, no floating-point rounding, bounded PLN policy as accepted by E02. Existing #6 still lists currency/bounds reconciliation as a prerequisite: confirm current policy in that work before activating the form; this spec does not resolve that discrepancy by fiat. Missing/failed policy fails closed. Show errors per field, preserve entries on failure and prevent duplicate saves.
- Slots: UTC is explicitly labelled when following this screenshot; never parse a `datetime-local` value as the machine zone while labelling it UTC. Use the owning availability service's actual clock and accepted lead boundary; “demo clock” is Storybook fixture copy only. The September slot spec allows future publication and evaluates public eligibility at two hours; the PNG's publication hint is stricter. Reconcile that in E02 before enabling the production form; do not silently alter publication policy here.
- Booked rows/cancellation: E03 owns occupancy/cancellation. Show booked/cancellation states in Storybook only until the owning feature exists; production never infers occupancy from a bare slot or allows deleting a booked slot. Existing backend refusal is authoritative when that dependency ships.
- Progress: complete profile publication, both valid saved prices and qualifying published availability are computed from authoritative DTOs according to the owning services, not optimistically from a clicked button. Keep invitation deadline behavior and timezone-aware display from implemented E02.
- Share readiness/public link follows actual published slug; draft/no-price/no-slot/error states remain explicit. Payout settings stay unavailable while off-site payment policy is active; no Stripe setup is added.

## 📝 Architecture, data model and API contracts

Reuse `PageShell`, backend panels/fields/forms/tables/feedback and existing controls from standalone `packages/ui`. Add only shared auth/workspace presentation with actual route consumers; app passes serializable current identity, navigation and callbacks. App client components import pure validators; UI imports neither core nor db. Keep server authorization and request scopes in app/core, disposed in `finally`.

Primary files: `packages/app/src/app/(auth)/{layout.tsx,auth-form.tsx,action-form.tsx,auth.css}`, `(auth)/account/{page.tsx,logout-button.tsx,mentor-button.tsx}`, `packages/app/src/app/admin/{layout.tsx,admin-access.tsx,page.tsx,users/users-list.tsx}`, `packages/app/src/app/mentor/page.tsx`, and shared `packages/ui/src/` plus `.storybook/`. New `/admin/workspace/page.tsx` reuses `adminAccess`. Inspect installed Next documentation before route/layout changes; this spec prescribes no unverified framework API.

No E01 schema/entity/migration, role enum or auth response change. Reuse existing registration/login/verification/session/logout/admin/mentor APIs and standard envelopes. S04 consumes E02 contracts after they are implemented. The users table must not widen its DTO with raw payout/provider secrets. A future real payout column requires the owning feature's explicitly reviewed projection.

Expired-login reason is presentation-only and contains no email/token. Preserve invitation-only allowlisted `returnTo`; do not generalize redirects to arbitrary paths in this UI work. A revoked/expired protected client session removes private table/form content before redirect; abort obsolete loads and observe rejected cancellation promises. A private navigation link stays unavailable until authorized data resolves. Keep auth and database-backed pages dynamic/no-store as currently required.

## 📝 Edge Cases & Failure Scenarios

- Generic accepted registration for new/duplicate addresses must look the same and keep the established timing/delivery behavior. Resend/change email cannot become an account-existence oracle.
- Expired/used/invalid verification tokens expose safe feedback, no session issuance and a recoverable resend path. Never retain fragments in logs, analytics, URLs used for evidence or local storage.
- Invalid credentials, unverified email and rate limits retain generic safe messages; pending form cannot resubmit; server field errors focus the first invalid input. Password reset/recovery remains functional.
- Expiry while reading/saving, membership removal, stale list requests and failed logout are distinct from ordinary network failures. Logout success revokes session; failure is not presented as signed out. Browser Back after logout cannot restore authorized visible UI.
- Long names/emails, all role combinations, no users, zero sessions, no published profile, partial setup, initial load, refresh, error/retry and narrow table overflow have named stories/tests.
- No persisted fixture email/password, false completion counts, simulated production payouts or canned booked records. Forbidden/unavailable UI has a reason, not an enabled inert button.

## 📝 Risks, compatibility and rollback

Auth/session consumers, role-aware navigation and shared UI exports require `risk-high` implementation classification, independent review and browser denial-path evidence under SDLC. This docs PR itself is low-risk. Preserve HTTP envelopes, cookie attributes, 24-hour absolute session lifetime, verified-user gate, role checks, CSRF, anti-enumeration, last-admin invariant, search/pagination and safe return URLs.

`/admin` keeps its protected redirect; `/admin/workspace` is additive. `/account` changes presentation but keeps its URL/current-session requirement and enrollment functionality. Update consumers/tests together for any shared UI export; retain compatibility aliases if migration cannot be atomic. Roll back UI consumers and presentation tokens without dropping auth/profile data or E02 migrations. Existing specifications remain active for their unaffected behavior; this one supersedes only E01 visual presentation in the September handoff, not its E02 domain scope or the October security contract.

## 📝 Decisions in play

Product decisions D02–D04 retain external sessions/payments/support and approved booking ownership/approval. N01/N02 still exclude video and public profile ratings. The screenshot's payouts/booked/cancellation hints do not supersede them. Any later direction change requires the owner path recorded in the [product brief](product-brief.md). This task is evidence of a UI implementation request, not evidence of paid demand.

## Research and alternatives

[GitHub's email verification guidance](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/verifying-your-email-address) uses explicit resend and post-verification confirmation; retain these clear recovery states while keeping DevMentor's generic acceptance and session gate. [GitLab's account documentation](https://docs.gitlab.com/user/profile/) separates account navigation and documents session behavior; the transferable design lesson is clear account access and expiry feedback. Do not import its configurable/remember-me session machinery into the existing fixed-session contract.

A literal static recreation loses real state/security; a new auth backend duplicates approved working services; bundling E02/E03/Stripe expands scope and conflicts with current decisions. Shared UI integration with explicit dependencies is the bounded alternative.

## ✅ Acceptance criteria

- AC01: Every E01 filename has a mapped route/state, owner slice, deterministic story and browser evidence. No PNG, including the lower half of mentor home or mobile expiry screen, is omitted.
- AC02: E01-01–04 use the shared auth frame and match the reference hierarchy; real registration/login/verification work with current security and recovery contracts.
- AC03: E01-05/07/08 share the responsive workspace frame, additive current-role navigation, truthful state, identity and working logout. `/admin` redirect/authorization and administrator operations remain compatible.
- AC04: E01-06 contains all reference sections connected to real E02 data; progress, price/slot failures and publication links are truthful. S04 remains incomplete until dependencies and E02 policy discrepancies are settled.
- AC05: E01-09/10 render actual expired-session recovery safely, including stale-content removal, keyboard use, long content and no document overflow at 320/390px.
- AC06: Storybook covers light/dark, default/empty/loading/error/forbidden/pending/unavailable and multi-role states. Production build checks actual tokens, contrast, local fonts and manager/canvas themes.
- AC07: Meaningful tests cover changed production TypeScript/TSX at 100% lines/statements/functions/branches; lint/typecheck/build/audit/disposable PostgreSQL+browser integration and all four PR CI jobs pass. No exclusions or weakened thresholds.
- AC08: Retained features omitted by screenshots remain usable; no fictitious state, dead navigation, token/credential leak or accidental role/OAuth/payment policy change.

## 📋 Phasing and Implementation Plan

Every slice includes its own meaningful tests and leaves the app working. Checkboxes represent implementation, not specification-writing completion.

### S01 — Shared frames and semantic feedback
- [ ] Step 1: confirm the shared screenshot palette exists on the base; add contrast-tested success/warning (and danger only with a real destructive consumer) tokens and dark equivalents.
- [ ] Step 2: add the smallest auth/workspace presentation primitives, semantic layout tokens and responsive navigation used by actual consumers; preserve exports and migrate one route in the same change.
- [ ] Step 3: add frame/status stories and keyboard/mobile tests; validate production CSS and contrast.

### S02 — Authentication and verification screens (depends on S01)
- [ ] Step 4: migrate sign-in/register, GitHub explanation placement and recovery links; retain schemas/security.
- [ ] Step 5: implement accepted-registration and verified-email presentations, token failure/retry/resend and focus transitions without creating a session.
- [ ] Step 6: add deterministic E01-01–04 stories and real disposable email/HTTP/browser flow tests.

### S03 — Mentee/operator homes and administrator users (depends on S01)
- [ ] Step 7: migrate `/account` with truthful session availability, additive role navigation and retained enrollment; add protected `/admin/workspace` without changing `/admin`.
- [ ] Step 8: migrate real users table, retain role management/search/pagination and allowlisted DTO; distinguish absent payout integration.
- [ ] Step 9: test anonymous/non-admin/admin/multi-role/revoked access and logout; publish E01-05/07/08 stories and browser screenshots.

### S04 — Complete mentor-home UI (depends on S01 and owning E02 services)
- [ ] Step 10: verify S04 entry criteria: the E02 owner has recorded the accepted price policy/publication boundary in #6 and delivered tested owner API/DTO contracts. If absent, keep S04 blocked; consume these contracts without making domain policy decisions or implementing parallel services.
- [ ] Step 11: compose all E01-06 sections, field failures/retries, live readiness and public link; keep absent payouts/booked/cancellation capabilities explicit.
- [ ] Step 12: prove owner isolation, no optimistic false completion, correct UTC conversion, all lower-page content and desktop/narrow behavior; remain blocked if required backing capabilities are absent.

### S05 — Expiry/mobile (depends on S01–S03; independently shippable before S04)
- [ ] Step 13: add safe expired-session transition, reason-specific warning and private-content cleanup; preserve 403/503 and safe invitation continuation.
- [ ] Step 14: implement E01-10 responsive match and complete screen state stories; include auth helpers and password-manager/keyboard checks.
- [ ] Step 15: capture E01-09/10 desktop/narrow comparisons and run slice-local gates; expiry/mobile can finish independently of mentor services.

### Final integration milestone — all slices delivered
- [ ] Step 16: after S01–S05, capture all ten 1440px/390px reference states plus 320/768px and dark-mode checks; run required gates/CI and record dependency gaps. E01 UI is complete only when every screen's bounded acceptance is met, including real prices/slots in S04. Explicit unavailable catalog/notes/payouts affordances remain documented deferred capabilities and cannot be claimed implemented.

## Review and delivery status

Fresh-context scope review completed: clarified bounded UI completion versus deferred capabilities, made E02 approval/contracts S04 entry criteria, and separated independently shippable expiry/mobile work from final whole-E01 sign-off. No implementation, unit execution, browser QA or CI is claimed by this specification. Source inspection and screenshot inventory are design evidence only. Original PNGs are proposed-design evidence, not current-app screenshots. The configured shared test environment descriptor is absent, so fresh current-app screenshots and generated mockups were not produced; provided PNGs are the authoritative proposed visuals. Related issues and PR links are recorded after publication.

## Related implementation issues

Design-only specification PR: [#11](https://github.com/AndreiRymskikh/dev_mentor/pull/11). The spec PR does not close implementation work.

- [#12 — E01 v2: Implement all screenshot-defined account and workspace screens](https://github.com/AndreiRymskikh/dev_mentor/issues/12)
- [#13 — E01v2-S01: Shared auth/workspace frames and semantic feedback colours](https://github.com/AndreiRymskikh/dev_mentor/issues/13)
- [#14 — E01v2-S02: Implement sign-in, registration, inbox and verified-email screens](https://github.com/AndreiRymskikh/dev_mentor/issues/14)
- [#15 — E01v2-S03: Implement mentee home, operator home and screenshot users screen](https://github.com/AndreiRymskikh/dev_mentor/issues/15)
- [#16 — E01v2-S04: Implement the complete mentor-home screen using E02 services](https://github.com/AndreiRymskikh/dev_mentor/issues/16)
- [#17 — E01v2-S05: Implement expired-session recovery and mobile sign-in screens](https://github.com/AndreiRymskikh/dev_mentor/issues/17)

S01 is #13; S02 is #14; S03 is #15; S04 is #16; S05 is #17. The parent #12 owns final all-screen sign-off. Existing #4/#6 remain linked dependencies and were not edited or closed.
