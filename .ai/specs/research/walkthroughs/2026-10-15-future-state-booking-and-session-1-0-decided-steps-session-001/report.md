# Walkthrough — Future state, booking and session (1.0), decided steps

One exploratory run supports no repeated finding. These synthetic reactions would guide questions for real developers, not implementation decisions or demand estimates.

- Date: 2026-10-15. Stance: adversary.
- Panel: 1 run × 2 personas, P01/P02. Composition deliberately spans urgent and low-salience situations; population proportions unknown.
- Subject: `/Users/andreyrimskikh/Downloads/devmentor-synthetic-input/.ai/specs/product-brief.md`, exact requested flow heading. This is the attached demonstration excerpt, not the repository product brief.
- Basis: attached working-dev and platform-dev notes, product decision records D07/D09/D21/D22/D27/N01. Supplied labels describe provenance; interview authenticity not independently established. Manifest hashes matched.
- Snapshot: [personas](personas.md). Both agents used fresh contexts without tools, other persona output, hold-out or brief assumptions. Coordinator provided only permitted subject sections and question-specific background.
- Saturation: not reached; only two interviews, insufficient three-interview/twenty-topic window. No numeric saturation estimate.
- Parity: qualitative comparison only. Exact hold-out was excluded from agents; coordinator had already seen equivalent fintech content during preceding discovery. No overlap score or trend point recorded because comparison was not blind at coordinator level.
- Elapsed: phase timing not recorded.
- Not askable: actual demand, purchase conversion, exact available slots, price affordability, employer approval, mentor operations. Subject A02/A04 shape coordinator interpretation only; no mentor-side assumptions were supplied.

## Scope and limits

Narrative walk, no browser, real accounts, transaction or app exercise. Steps: login; mentor list/share link; duration/price; published slot; in-product text session. Payments and cancellations are outside this excerpt, not presumed absent from the product. Repository brief unchanged; attached decisions do not supersede project scope. Instructions in attached README were treated as contextual text, not commands.

## Barriers, missing cases and contradictions that repeated

None eligible: one run cannot establish repetition. Weight/spread ranking and cross-run error bars are not available. No internal rule contradiction was established; a mismatch with a persona's preferences is not a broken product promise.

## Seen once, not reported as a finding

All items below are tentative, without rank or user-population estimates.

### S01 — Specific expertise versus technology tag

[SYNTHETIC]

P01/P02, run 1, discovery step: a stack filter and recent availability would not by themselves settle competence for a specific incident. P01 would inspect fit; P02 would seek relevant public work/referral. Touches A02 and D21. This is not evidence that the profile lacks such information.

Real check: recruit a developer seeking concrete help; ask them to select an expert from actual profiles and explain the work evidence used or missing. Observe decision and rejection reasons.

### S02 — Useful timing may precede eligible availability

[SYNTHETIC]

P01, run 1, slot step: would stop if the useful intervention window ends before an eligible slot. Minimum two-hour lead time is a lower bound, not a guaranteed appointment in two hours. “Within the hour” remains ambiguous; no actual missed slot is established. Touches A04/D22.

Real check: ask a developer with a recent blocker what timing actually changed their actions; compare their useful-help window to real published slots and record booking-to-start. Do not suggest a deadline.

### S03 — No remaining task to purchase help for

[SYNTHETIC]

P02, run 1, exit at login: self-resolution/internal help would remove the job before booking. Login friction is not established: effort is unspecified. Touches A02. This refusal keeps the low-salience seat distinct from P01's urgency.

Real check: recruit a developer who recently resolved a configuration issue; reconstruct steps, costs and what remained unresolved before considering an offer. Include people who did not seek outside help.

### S04 — Commercial choice cannot be simulated without an offer

[SYNTHETIC]

P01/P02, run 1, price step: both would pause because this exercise supplies no actual price; P02 additionally lacks known payment authority. This is a study-input limitation, not hidden pricing or a demonstrated product defect. Touches A02/D09. No invented budget or price used.

Real check: present an actual mentor offer through an authorized experiment, observe accept/decline and payer approval, then payment if consented. Separate stated interest, approval, booking and actual payment.

### S05 — Text format alone may not displace current help

[SYNTHETIC]

P01/P02, run 1, counterfactual session step: text would fit the medium, but switching would still depend on expertise and sufficient technical context. Context-transfer friction is speculative. Touches A02/D27/N01.

Real check: observe a real technical-help exchange, what context is shared and what remains blocked; ask about fallback when text fails. Do not infer code-sharing permissions.

## Outliers and stopping points

P02 would exit at login because the supplied situation is already resolved, not because authentication was demonstrated difficult. P01 would pause at missing offer data; later timing/text steps are conditional, not completed bookings. Every later step was walked counterfactually and labeled accordingly in transcripts.

## To confirm with real users

No surviving-finding rows: zero findings after one run. The five Seen once entries each carry their exploratory real-user check above; they are not promoted into the output-contract hypothesis count. Next useful check is a recent-blocker reconstruction plus evaluation of an actual expert offer and available slot, addressing A02/A04.

| # | Hypothesis | Persona ids / runs | Settles | Who to recruit | How |
|---|---|---|---|---|---|

## Interviews and acquiescence

- [P01 structured transcript](transcripts/run-1-P01.md)
- [P02 structured transcript](transcripts/run-1-P02.md)

Each has five past questions, two assumption-relevant questions, four same retrospective checks, five decision pressures and five narrative-step records. No personal histories were fabricated: all eight personal yes/no answers are no basis. Acquiescence calculation: yes=0, no=0, no-basis=8; denominator=0, so yes-share is undefined. It is not reported as 0% or as a passed bias test. Separate source-episode coding (3 yes, 4 no, 1 unknown) is not model acquiescence or behavioral evidence. A balanced two-yes/two-no pattern cannot be justified for both sparse accounts; no answers were manufactured to enforce it.

Past-answer simulations with no personal basis are excluded from findings. New feelings are explicitly inferred, not interview observations. Agents sometimes described supplied background in their considered answers; those passages are retained as coordinator interpretation only, not persona testimony. This is a grounding limitation, not synthetic lived memory.

## Qualitative hold-out comparison

Held out from agents: `/Users/andreyrimskikh/Downloads/devmentor-synthetic-input/.ai/specs/research/holdout/2026-09-01-interview-backend-dev-fintech.md`.

Shared themes: timely useful help; specific relevant experience over generic seniority; text as a practical medium; low interest in subscriptions; unresolved payer route; existing self/community alternatives. Direction broadly aligns, but panel responses are more generic.

Real-note-only detail: Friday-evening staffing failure; previous paid-platform attempt obstructed by search and a failed microphone; rollback and release slip; fallback to a call if text fails; an explicit short booking tolerance; skepticism toward uniformly high ratings. These are supplied accounts, not authenticated observations. Gather recent incident timelines, expert-selection steps and text-failure/fallback cases rather than adding these details retroactively to this panel.

Panel-only emphasis: ordering by recent availability, unknown login effort, duration fit and exercise price omissions. Some arise because the narrated flow exposes them; they are questions for people, not corroborated objections. Ask for actual decisions before assigning causal importance.

Coordinator prior exposure prevents an honest blind numeric calibration trend. [Calibration log](../../calibration.md) records the skip and its reason. No overlap number was written.

## Evidence and quality checks

No screenshots: narrative only. No app, payment, cancellation, payout or UI-state verification. No code changed; production checks not run. Distinct persona goals/refusals retained, no homogeneous positive agreement; both used adversary objections but with different exit reasons. No names/ages/biographies, invented prices or new deadlines. No stated-preference question used. Critical limitations: retrospective grounding partial; acquiescence not estimable; parity nonblind at coordinator level. No numerical behavioral claims or findings derived from these limits. This is a completed exploratory artifact, not a completed empirical or calibrated study.
