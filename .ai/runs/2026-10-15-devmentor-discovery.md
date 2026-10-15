# DevMentor discovery

- Started: 2026-10-15.
- Goal: discover DevMentor in own mode using `.ai/specs/research` and prepare a confirmed product brief.
- Skill: `om-discover`; interactive session, maximum three substantive rounds before an explicitly agreed extension.
- Context: `.ai/lessons.md`, repository instructions, README, `.ai/agentic.config.json`, supplied research and N01/N02 decisions. Existing research is untracked and must be preserved.
- Relevant specifications: [engineering standards](../specs/2026-09-01-engineering-standards.md); [monorepo migration](../specs/2026-10-14-monorepo-migration.md). These constrain implementation, not demand.

## Plan and acceptance

1. Read source material and identify the decision the session should support.
2. Ask focused questions about consequential gaps; preserve evidence limits and confirmed constraints.
3. Draft the English brief, check source fidelity, and obtain the skill-required independent skeptical review.
4. Present concrete scope and unresolved risks for human confirmation before saving `../specs/product-brief.md`.
5. Verify documentation paths and diff. No implementation, tracker mutation, commit or publication.

Acceptance: traceable claims, attributed decisions, explicit uncertainty and next test; brief saved only after confirmation.

## Progress and findings

- Loaded the skill and conversation guidance; research contains seven interviews, community data and survey, founders' board exports, historical benchmark notes, mentor prospect list, and two active decisions.
- N01 requires text sessions; N02 excludes ratings/reviews and uses public work as a trust signal.
- Workshop frames the smallest product earning for mentors without a call and a 25-hour build allowance; board also proposes vault subscriptions, MCP, async answers and marketplace sessions. These are proposed scope and beliefs, not demonstrated demand.
- Community survey reports willingness to pay, not completed purchases; the Discord extract does not establish paid demand. Mentor prospects are not committed supply.
- Opening round will establish which decision is needed now before selecting dependent questions.

## Validation and outcome

- No production files changed. Code checks not run: discovery documentation only.
- Brief not written; confirmation and independent review remain pending.
- Changed files: this run log only; existing research preserved.

## Scope confirmation

- User selected deciding the first MVP; confirmed 25 hours and no developments since the September research in payments or mentor agreements.
- Clarified target as “developer with problem”; this alone did not answer vault inclusion.
- User then explicitly accepted the proposed mentor-link paid text-help flow, manual matching/scheduling/support and deferral of vault/subscriptions/MCP/catalog.
- Saved [D01](../specs/research/decisions/D01-first-mvp.md), attributing the choice to the current session owner without claiming they are founder A.
- Draft prepared in `/tmp`, not yet saved as product-brief.md. Payment/exception rules, mentor commitments and experiment evaluation remain blocking; scope consent does not approve invented operations.
- Independent skeptical review dispatched under the skill's explicit delegation requirement.
- Draft link check: all relative source targets exist. Coverage counted programmatically: 18 tagged canonical lines, 15 sourced and 3 assumed; zero synthetic.
- Tracker not consulted: current decision rests on supplied research and direct session choices; no tracker claims are made. Historical competitor notes treated as historical, with no current competitor assertions or new web research.

## Final outcome

- Independent fresh-context skeptic opened the draft and cited material: no actionable critical/warning findings. Review upheld the incomplete readiness verdict and conservative evidence claims.
- Saved [product brief](../specs/product-brief.md), relying on the user's explicit prior confirmation of the exact D01 scope. Added no operational policies or assumed approvals; Q01–Q03 remain open. No further substantive interview round added.
- Brief supports scope alignment and resolving experiment operations, not implementation-ready backlog work. Two collection requests remain, with owners/timing explicitly unassigned.
- Product discovery pipeline is not enabled; setup was not run.
- Documentation checks: all brief source links exist; coverage arithmetic checked. No production changes; lint/typecheck/unit coverage/audit/build/browser tests not run (documentation-only).
- Changed files: this log, D01 decision record, product brief. Original research preserved. No tracker mutation, commit or publication.
- Next useful offered action: resolve manual operations and payment/exception rules before implementation planning; no companion skill authorized.

## Refresh — 2026-10-15, after backlog readiness stop

- User explicitly invoked `om-discover --refresh`, authorizing a new interactive pass to resolve Q01–Q03 and incorporate relevant one-run hypotheses conservatively.
- Re-read current brief, decisions, lessons and synthetic report. Attached demonstration decisions (catalog, two-hour lead time, in-product chat) are not project decisions. Its assumption IDs must not be imported as project IDs.
- Proposed refresh plan: resolve manual operator/supply, session delivery and commercial/evaluation rules in at most three substantive rounds; draft changes preserving ids, get independent skeptical review and confirm before writing updated brief.
- No refresh decisions recorded yet. Current implementation blockers remain open. No code validation run for this documentation phase.

### Refresh rounds 1–2

- User clarified developer chooses mentor; at least one mentor has confirmed participation/availability (self-report; schedule details not supplied).
- User chose an external text channel agreed by participants. Explained channel as the place for session messages; no particular provider selected.
- User explicitly chose a mentor list on the site, session scheduled in mentor calendar, calendar displaying free time. This supersedes D01's catalog deferral; vault/subscription/MCP deferrals remain unchanged.
- Calendar ownership/storage/synchronization, payment flow and support responsibility are not implied by these choices. Final allowed substantive round will resolve the most consequential dependencies; remaining unknowns stay blockers without inventing defaults.

### Refresh round 3 and draft

- Confirmed manual slot entry in DevMentor, direct off-site payment to mentor and off-site support for no-shows/disputes. These do not identify the support operator or approve a policy.
- Wrote [D02](../specs/research/decisions/D02-mvp-booking.md) from explicit user decisions; annotated D01's partial supersession without deleting history.
- Draft refresh prepared in `/tmp/devmentor-refresh-draft.md`, not yet replacing product brief. Preserves Q01–Q03 history, carries unsettled calendar/access/lifecycle and support details as Q04/Q05.
- Three relevant Seen once synthetic questions proposed as H01–H03; not repeated findings, evidence or imported demonstration rules. No two-hour lead time, demo login or in-product chat adopted.
- Counted draft coverage: 19 canonical claims,16 sourced,3 assumed; three synthetic hypotheses separately excluded from legacy Coverage. Two collection requests remain.
- Full three-round substantive interview budget consumed; further substantive questions require explicit extension. Draft confirmation is limited to approving the recorded changes and visible incomplete readiness, not answering open policy questions.
- Independent skeptic dispatched; source/path checks and confirmation pending. Tracker not inspected in this pass; no tracker-resolved assumptions claimed.

### Refresh review result

- Independent skeptic found no critical fidelity/scope errors; upheld incomplete implementation readiness. Clarified header readiness wording as suggested.
- Coverage precision checked programmatically against canonical tagged-line rules, not independent-source counts; all draft relative source links resolve.
- Awaiting confirmation of the concrete refresh (including three tentative synthetic hypotheses and unresolved dependencies). Existing product brief is still unchanged. Confirmed decision records D01/D02 are saved.

### Refresh saved

- User explicitly approved replacing the brief: “меняй brief”. Saved reviewed `/tmp/devmentor-refresh-draft.md` to [product brief](../specs/product-brief.md).
- D02 scope and three tentative Seen once hypotheses recorded; no additional policy decisions inferred. Q02–Q05 remain unresolved, implementation backlog readiness withheld.
- Source links and `git diff --check` passed. Production lint/typecheck/tests/coverage/audit/build not run: documentation-only changes.
- Refresh complete; no tracker mutations, commit, publication, or companion execution. Two collection requests remain; owners/timing not invented.

### Post-refresh clarification

- User clarified availability is set by the mentor through their profile calendar; outcome is developer feedback. Saved D03 and applied these explicit clarifications to brief, flow, goal and collection plan.
- Corrected collection wording: real slots and post-session feedback are runtime/post-launch material, not prerequisites for drafting the feature. Unresolved booking/access/support policies remain separate.
- Feedback visibility/format/location remain unspecified; no public profile reviews inferred and N02 retained. Feedback does not establish payment evidence.
- Source links and coverage counts checked; documentation-only, production tests not run.

### Booking/support/feedback clarification and backlog draft

- User explicitly requires mentor approval, developer creation/changes of own bookings, only external-support contact information and developer feedback after mentor service.
- Saved D04 and updated current brief/Q02–Q05. Core flow can be drafted without requiring future runtime data. Technical lifecycle details remain explicitly proposed acceptance criteria, not invented confirmed decisions.
- Corrected earlier overbroad support/payment/evaluation blockers: on-site enforcement is outside chosen scope, and future success measurements do not prevent drafting specified booking behavior.
- Repaired separated Decisions table rows. Source links checked. No tracker mutation; backlog dry run stays in response only. Production tests not run (documentation only).
