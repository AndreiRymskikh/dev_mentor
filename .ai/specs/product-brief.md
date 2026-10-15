# DevMentor — product brief

- Date: 2026-10-15
- Mode: own; Owner: product owner in this session (name unspecified); Pass: full
- Evidence basis: seven interview notes, including contrary accounts; community export and self-selected survey from the same Discord, not independent demand samples. Founders' board exports describe intentions. Initial session reported no new agreements/payments; refresh includes a user report of at least one participating mentor, without supplied availability details or completed-payment evidence. Most consequential unknown: whether paid text help can be supplied when needed.
- Coverage: 21 claims — 19 sourced (interview 4, data 2, document 13, product 0, benchmark 0), 0 synthetic, 2 assumed; 2 entries on the collection plan
- Synthetic hypotheses outside Coverage: 3 (Seen once; no repeated findings)
- Definition of Ready signed by: no formal ticket-level gate configured; core flow clarified in D04, ready for proposed backlog review. Booking-change and completion mechanics remain proposals to settle in story/spec review, not approved defaults.
- Sources: linked below; research source provenance is supplied, not independently authenticated.

## Decision summary

The owner revised the first MVP through D02: site mentor list, mentor-entered availability and developer booking; text session, direct payment and support happen outside the site. Budget remains 25 hours; vault, subscriptions and MCP remain deferred.

Specific incidents support the problem, not recurring paid demand. The owner reports a participating mentor. D04 resolves mentor approval, developer control of own bookings, external support contacts and feedback after service. The next step is review of proposed backlog criteria; real availability and outcome records arise during use, not before drafting. Synthetic results remain exploratory questions from a different demonstration flow.

## Vision

Help developers obtain specific expert help; reusable knowledge revenue remains a later ambition. `[DOCUMENT]` [D02](research/decisions/D02-mvp-booking.md).

## Target group and stakeholders

- Chosen user: developer with a concrete technical problem; no narrower launch segment confirmed. `[DOCUMENT]` [D02](research/decisions/D02-mvp-booking.md).
- Payer is unresolved: one freelancer stated willingness to pay personally; one platform developer would only expense rare help. Neither account proves a purchase. `[INTERVIEW]` [freelancer](research/2026-09-02-interview-freelancer-react.md), [platform developer](research/2026-09-02-interview-platform-dev-solves-alone.md).
- Scope decider: current session owner; earlier protected constraints belong to founder A. At least one participating mentor is reported; support owner remains unspecified. See Q01/Q05.

## Problems, with evidence

- One working developer spent half a day and shipped a distrusted workaround after contradictory community replies. `[INTERVIEW]` [working developer](research/2026-08-20-interview-working-dev.md).
- One freelancer underestimated a migration by about a week of unpaid time; wanted a call for estimation and text for bugs. Text-only MVP therefore does not cover every reported task. `[INTERVIEW]` [freelancer](research/2026-09-02-interview-freelancer-react.md).
- Another developer solved an agent configuration issue alone and rejected a subscription; available internal help weakened external demand. `[INTERVIEW]` [platform developer](research/2026-09-02-interview-platform-dev-solves-alone.md).
- Discord notes report 109 help threads over 14 days, 23 unanswered; one moderator assigned resolution labels. This measures community help, not purchases. `[DATA]` [export provenance](research/2026-09-04-data-request-discord-help.md).
- Survey: 54 self-selected responses, three reporting prior paid help; hypothetical willingness to pay does not establish checkout conversion. `[DATA]` [survey](research/2026-09-04-survey-discord-willingness-to-pay.md).

## Product and how it stands out

- A site catalog and booking flow with externally delivered paid text help, bounded by D02. `[DOCUMENT]` [scope decision](research/decisions/D02-mvp-booking.md).
- Distinctiveness is unproven; current scope tests delivery and purchase, not competitive advantage.

| reference | what it does well | where it falls short for our users | checked on | link |
|---|---|---|---|---|

Fresh competitor comparison deferred: historical notes are not current verification and do not decide this scope.

## Goals and success criteria

- Chosen outcome signal: developer feedback after the paid help (D03); developer can leave it after the mentor provides the service (D04); audience and format remain unspecified, with no public profile ratings feature inferred. Feedback does not by itself prove payment. `[DOCUMENT]` [D03](research/decisions/D03-availability-and-feedback.md).
- Constraints: 25 hours confirmed; D02 selects off-site payment, so no site payment-provider integration is in Now. The workshop Stripe-only integration restriction is not a requirement to integrate Stripe. `[DOCUMENT]` [D02](research/decisions/D02-mvp-booking.md), [workshop](research/2026-08-26-workshop-export.md).
- What must not get worse: consent and trust constraints in R02/N01/N02.

## Scope

- **Now:** D02 catalog, availability entered by mentors through their profile calendar (D03), and developer booking; mentor approval, developer management of own reservations, support contact information and post-service feedback follow D04.
- **Later:** vault, subscriptions and MCP; external calendar synchronization is outside the chosen manual-slot approach.
- **Not doing:** see N01/N02; no on-site payment or session chat in D02.

## Domain glossary

| Term | Meaning | Owned by | Visible to |
|---|---|---|---|
| Session | Scheduled text help in an agreed external channel; R01/D02 | Mentor and developer | Participants |
| Vault | Mentor knowledge collection; deferred | Mentor | Access model deferred |

## Key flows

- Current state: see Problems; search/read → ask community → wait or work around.
- Agreed future flow: site mentor list → mentor profile/price → reserve free time from mentor-entered calendar → mentor approval → externally arranged payment/text session → developer feedback after service (D03/D04). Mentor approval is required; the developer can change their own reservation. Service precedes feedback. Payment stays external and the site displays support contacts (D04). D02 supersedes the old D01 sequence; it makes no instant-help promise.

## Business rules

| Id | Rule | Applies to | Source | Status | Review by | Required path to change | Owner | Supersedes |
|---|---|---|---|---|---|---|---|---|
| R01 | Session duration 25 or 50 minutes | Sessions | `[DOCUMENT]` [workshop](research/2026-08-26-workshop-export.md) | active | Unknown | Owner-approved superseding row | Founder A | none |
| R02 | No session content published without mentee approval | Publication | `[DOCUMENT]` [workshop](research/2026-08-26-workshop-export.md) | active | Unknown | Both founders approve replacement | Both founders | none |

## Non-goals

| Id | We are not building | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|
| N01 | Video calls; sessions are text | Recorded constraint | Founder A | active | Unknown | Founder A supersedes | `[DOCUMENT]` [N01](research/decisions/N01-no-video.md) | none |
| N02 | Ratings/reviews profiles; show public work instead | Recorded trust choice | Founder A | active | Unknown | Founder A supersedes | `[DOCUMENT]` [N02](research/decisions/N02-no-ratings.md) | none |

## Decisions

| Id | Date | Decision | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|---|
| D01 | 2026-10-15 | Original narrow MVP; retained constraints in record | Accepted agent recommendation | Session owner | superseded in part by D02 | Initial test; date unset | Owner supersedes | `[DOCUMENT]` [D01](research/decisions/D01-first-mvp.md) | none |
| D02 | 2026-10-15 | Catalog/manual calendar; external session/payment/support | Explicit user choices; manual slots/external channel adopted from agent proposal | Session owner | active | Before implementation planning | Owner supersedes | `[DOCUMENT]` [D02](research/decisions/D02-mvp-booking.md) | D01 in part |
| D03 | 2026-10-15 | Profile calendar availability; developer feedback as outcome | Direct user clarification | Session owner | active | Before detailed acceptance criteria | Owner supersedes | `[DOCUMENT]` [D03](research/decisions/D03-availability-and-feedback.md) | none |
| D04 | 2026-10-15 | Mentor approval; own booking changes; support contacts; post-service feedback | Direct answers to Q02–Q05 | Session owner | active | Backlog criteria review | Owner supersedes | `[DOCUMENT]` [D04](research/decisions/D04-booking-support-feedback.md) | none |

## Riskiest assumptions

| Id | Assumption | Importance | Evidence today | If false | Smallest test | Owner | By when | Result |
|---|---|---|---|---|---|---|---|---|
| A01 | Developers will buy timely text help `[ASSUMPTION]` Agent interpretation of interviews | high | Stated preferences; no new payments | Revise offer/segment | Offer real priced help; observe payment and outcome, not stated intent | Unassigned | Before expansion; date unset | untested |
| A02 | Mentor supply and catalog/manual-calendar operations fit need and budget `[ASSUMPTION]` Feasibility unmeasured | high | Prospect list; owner reports at least one participating mentor, no schedule artifact | Reduce scope or change timing | Obtain mentor commitment and rehearse complete flow, record effort and response delay | Unassigned | Before delivery commitment | untested |

## Kill criteria

Product experiment stop/revision thresholds and review owner remain unset; deferred from drafting the booking flow. No demand or success threshold is inferred from feedback eligibility.

## Hypotheses to test

One adversary run of two personas walked the separate attached demonstration excerpt; no repeated findings or demand evidence. Source for all rows: [session report](research/walkthroughs/2026-10-15-future-state-booking-and-session-1-0-decided-steps-session-001/report.md). Its rule IDs and two-hour minimum are not project decisions. Prior coordinator exposure prevented numeric hold-out calibration.

- H01: Specific problem experience may matter beyond a generic technology label. `[SYNTHETIC]` Seen once S01; check with a developer choosing from actual profiles; relates to project A01.
- H02: An available appointment may fall outside the developer's useful-help window. `[SYNTHETIC]` Seen once S02; reconstruct a real incident and compare actual slots; relates to project A02, with no imported minimum lead time.
- H03: Text alone may not displace existing help without relevant expertise and adequate context. `[SYNTHETIC]` Seen once S05; observe a real text-help exchange and fallback needs; relates to project A01.

S03 reiterates an already represented low-salience alternative; S04 concerns absent exercise pricing, not a product defect. Neither adds a new project rule.

## Open questions

| Id | Question | Blocking | Who can answer | Status |
|---|---|---|---|---|
| Q01 | Which mentors commit, who operates manual steps, and what response/availability can they deliver? | Partially resolved: owner reports one or more; self-selection/calendar replace manual matching; details move to Q04/Q05 | Scope owner and mentor | participation reported; calendar ownership settled by D03 |
| Q02 | How is a reservation confirmed and changed? | No for drafting: mentor approval required, developer can change own reservation; reapproval/holds proposed in story review | Scope owner and technical maintainer | core resolved by D04; detailed lifecycle proposal pending |
| Q03 | When can developer feedback be left? | No: after mentor provides service; completion marker proposed in story review | Scope owner and technical maintainer | eligibility resolved by D04; experiment targets deferred |
| Q04 | Who controls slots and reservations? | No for drafting: mentor manages availability through profile, developer manages own reservations; timezones/concurrency follow technical design | Scope owner and technical maintainer | core resolved by D03/D04; technical proposals pending |
| Q05 | What support capability is in scope? | No: display configured external contact; no on-site dispute/refund engine | Scope owner | resolved by D04; actual contact configured before launch |

## Definition of Ready addendum (own)

Real accounts support specific problems and users. D02–D04 establish the core flow. Draft backlog criteria may now be reviewed without waiting for actual mentor slots or session outcomes. Proposed reservation/reapproval and service-completion mechanics require acceptance before implementation of dependent stories. Business demand remains untested; this is not product validation. Formal discovery pipeline readiness checks are not configured.

## Collection plan

1. After a build/prototype is available, rehearse profile calendar entry and the complete booking/external handoff for A02/Q04/Q05. Actual slots are supplied by mentors at runtime; obtaining them does not block drafting implementation tasks. Collector and date unassigned.
2. After real paid help, collect the developer’s feedback as the outcome signal (D03). Keep payment evidence separate if checking paid demand (A01). Collector, collection channel and date unassigned; this is later validation, not evidence already collected.
