# E02 v2 implementation planning

Date: 2026-10-31. Outcome: analysis complete; existing backlog reused, no duplicate issues created. No implementation or policy approval performed.

## Goal and sources

Analyze [screens](../specs/2026-10-29-e02-v2-screenshot-ui.md), [content/reviews](../specs/2026-10-29-e02-v2-public-profile-and-reviews.md), and [payouts](../specs/2026-10-29-e02-v2-payouts.md); propose an executable delivery sequence and ensure future implementation has issues.

Read lessons, pipeline configuration, SDLC, compatibility contract and backlog/issue skill instructions. Inspected current mentor home and profile repository. GitHub search and direct issue reads confirmed existing open #19–#25 already cover the requested scope, with priority/category/risk labels and acceptance criteria. Reuse these instead of creating duplicates. Existing #13/#16 are also open; an open tracking issue alone does not prove its code is absent. Shared E01 composition exists locally and should be inspected/reused at implementation time.

## Findings and constraints

- The main spec is screen integration authority; companion specs own capability contracts. Do not implement the same backend twice.
- Invitation/profile services exist. `MentorProfileRepository.mutate` does not persist `record.displayName` to User, confirming that name editing requires an atomic persistence change, not only a field in the editor.
- Current `/mentor` has profile readiness/deadline and links, not the required price/availability composition.
- Existing public five-key DTO and stable slugs are protected. Optional public details need separate allowlisted reads; migrations must preserve saved content on rollback.
- G1 blocks public reviews pending N02 replacement, consent/identity/moderation/retention decisions and trusted completed engagements. #25 owns dependency design, not booking implementation.
- G2 blocks payout implementation pending payment-boundary/controller/liability/country/currency/capability/API/operations decisions. Payout eligibility does not prove a transfer was sent. Live enablement remains a separate explicit decision.
- #6 owns price/currency and availability-rule reconciliation. #16 owns both initial and completed mentor home. Disabled booking and absent reviews are partial delivery, not full screenshot04 completion.

## Proposed sequence and acceptance

1. **Dependency/design lane:** work #25 with product owner/maintainer; produce reviewed booking/completion specification and a linked implementation issue once the contract exists. Resolve G1/G2 in their owning #23/#24 and reconcile #6 price/slot rules. Do not invent missing decisions to mark tickets ready.
2. **Independent invitation slice #20:** reuse services, implement screenshot01 framing and account variants. Prove exact invitation continuation through registration/verification/login, original-session acceptance, safe invalid/mismatch states and actual configured deadline.
3. **Editor slice #21:** implement screenshot03 composition and optional account-wide name mutation in strict schema/service/repository transaction. Verify account/admin/public consumers, omitted-name preservation, rollback, live-role revocation, slug stability and clipboard success-to-failure recovery.
4. **Content slice #22, C1 then C2:** additive optional fields, bounded owner validation and separate owner/public detail endpoints first; then authoring and complete non-review public layout, accessible sample disclosure and real empty/error states. Preserve old public DTO/publication rules. Sequence editor changes to avoid overlapping authoring work. Can ship independently of G1/G2; real offer and active booking CTA wait on #6 and the accepted booking implementation.
5. **Offer/home integration:** #6 delivers approved persisted prices/availability; existing #16 consumes them for screenshot02 and completed home. Verify 0/partial/3-step progress, UTC entry, real time, both forms, empty/list/share states and distinct first/reinvitation deadlines.
6. **Reviews #23, R1–R3:** after G1 and actual completion-source delivery, finalize engagement FK and author/moderator flows; implement unique review writes, published-only aggregate/list, consent/moderation/report/withdrawal and real public rows. Prove duplicate races, incomplete/wrong-user/self-review denial, hidden/withdrawn aggregates and privacy.
7. **Payouts #24, P1–P5:** after G2, finalize exact state precedence and test/live schema model; implement mappings/receipts and lazy bounded provider adapter, crash-safe provisioning, owner onboarding/return/refresh and signed raw-body webhook reconciliation; deliver all seven domain states on one route. Prove retry/duplicate/out-of-order/wrong-mode/signature/expired-link/revoked-role paths in test mode. Review non-destructive rollback/operator repair before separately approved live enablement. This lane can proceed independently of reviews after its own gate.
8. **Final milestone #19:** map all seven PNGs to issue/route/state/story and full-page production-built browser evidence. Include mobile 320/390, tablet/desktop, dark mode, lower-page sections and accessibility. Do not close the whole milestone while required capabilities are blocked or mocked.

## Verification and handoff

Each implementation slice requires meaningful 100% production unit coverage, lint, typecheck, build, audit and disposable PostgreSQL/browser integration; all four CI jobs must pass independently. Schema work requires up/down/schema parity and refusal to lose persisted data. High-risk work requires independent review/QA. Read installed Next documentation before route/layout edits.

This run checked spec paths, issue bodies/dependencies and selected source; no runtime/browser checks or implementation validation gates ran because only planning metadata changed. GitHub issue fetches confirmed #19–#25 open with the expected classification. Tracker bodies and labels were left unchanged. Existing issues already contain the requested scope and acceptance criteria. No new spec or implementation PR was opened.

Changed file: this run log. Next recommended implementation slice: #20 after bounded design review; dependency design #25 can progress alongside it.
