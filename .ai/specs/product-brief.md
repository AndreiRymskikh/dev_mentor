# DevMentor — product brief

- Date: 2026-10-15
- Mode: own; Owner: product owner in this session (name unspecified); Pass: full
- Evidence basis: seven interview notes, including contrary accounts; community export and self-selected survey from the same Discord, not independent demand samples. Founders' board exports describe intentions. No new payments or mentor agreements reported in this session. Most consequential unknown: whether paid text help can be supplied when needed.
- Coverage: 18 claims — 15 sourced (interview 4, data 2, document 9, product 0, benchmark 0), 0 synthetic, 3 assumed; 2 entries on the collection plan
- Synthetic hypotheses outside Coverage: 0
- Definition of Ready signed by: not signed; ready for resolving experiment operations, not implementation planning.
- Sources: linked below; research source provenance is supplied, not independently authenticated.

## Decision summary

The session owner accepted the narrow first MVP in D01, within 25 hours. It serves a developer with a specific problem, using a mentor link and manual operations rather than a catalog. Scope excludes the knowledge subscription for now.

The interview evidence supports specific costly incidents, not proven recurring paid demand. Q01–Q03 block executable delivery: committed supply, response timing and payment/exception handling. The next proposed action is to settle those operations and test a real paid session; operator, timing and evaluation criteria remain open.

## Vision

Help developers obtain specific expert help; reusable knowledge revenue remains a later ambition. `[DOCUMENT]` [D01](research/decisions/D01-first-mvp.md).

## Target group and stakeholders

- Chosen user: developer with a concrete technical problem; no narrower launch segment confirmed. `[DOCUMENT]` [D01](research/decisions/D01-first-mvp.md).
- Payer is unresolved: one freelancer stated willingness to pay personally; one platform developer would only expense rare help. Neither account proves a purchase. `[INTERVIEW]` [freelancer](research/2026-09-02-interview-freelancer-react.md), [platform developer](research/2026-09-02-interview-platform-dev-solves-alone.md).
- Scope decider: current session owner; earlier protected constraints belong to founder A. Operator and participating mentors remain unassigned. See D01 and Q01.

## Problems, with evidence

- One working developer spent half a day and shipped a distrusted workaround after contradictory community replies. `[INTERVIEW]` [working developer](research/2026-08-20-interview-working-dev.md).
- One freelancer underestimated a migration by about a week of unpaid time; wanted a call for estimation and text for bugs. Text-only MVP therefore does not cover every reported task. `[INTERVIEW]` [freelancer](research/2026-09-02-interview-freelancer-react.md).
- Another developer solved an agent configuration issue alone and rejected a subscription; available internal help weakened external demand. `[INTERVIEW]` [platform developer](research/2026-09-02-interview-platform-dev-solves-alone.md).
- Discord notes report 109 help threads over 14 days, 23 unanswered; one moderator assigned resolution labels. This measures community help, not purchases. `[DATA]` [export provenance](research/2026-09-04-data-request-discord-help.md).
- Survey: 54 self-selected responses, three reporting prior paid help; hypothetical willingness to pay does not establish checkout conversion. `[DATA]` [survey](research/2026-09-04-survey-discord-willingness-to-pay.md).

## Product and how it stands out

- A manually supported paid text-help experiment, bounded by D01. `[DOCUMENT]` [scope decision](research/decisions/D01-first-mvp.md).
- Distinctiveness is unproven; current scope tests delivery and purchase, not competitive advantage.

| reference | what it does well | where it falls short for our users | checked on | link |
|---|---|---|---|---|

Fresh competitor comparison deferred: historical notes are not current verification and do not decide this scope.

## Goals and success criteria

- Proposed check: observe actual payment, delivered help and the developer's reported outcome; conversion target, observation window and evaluator remain unset. `[ASSUMPTION]` Agent proposal, linked to A01.
- Constraints: 25 hours confirmed; Stripe-only integration inherited from workshop, current feasibility unresolved. `[DOCUMENT]` [D01](research/decisions/D01-first-mvp.md), [workshop](research/2026-08-26-workshop-export.md).
- What must not get worse: consent and trust constraints in R02/N01/N02.

## Scope

- **Now:** D01 flow, with manual mentor selection, scheduling and support permitted; delivery remains blocked by Q01–Q03.
- **Later:** vault, subscriptions, MCP and general catalog (D01).
- **Not doing:** N01/N02.

## Domain glossary

| Term | Meaning | Owned by | Visible to |
|---|---|---|---|
| Session | Scheduled text help; R01 | Mentor and developer | Participants |
| Vault | Mentor knowledge collection; deferred | Mentor | Access model deferred |

## Key flows

- Current state: see Problems; search/read → ask community → wait or work around.
- Agreed future flow: mentor link → experience and price → problem description → mentor confirmation → payment → text session (D01). Selection, scheduling and support may be manual; no instant-response promise agreed.

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
| D01 | 2026-10-15 | Narrow MVP; full flow and deferrals in record | Accepted agent recommendation over immediate vault inclusion; isolate paid help | Session owner | active | Initial test; date unset | Owner supersedes | `[DOCUMENT]` [D01](research/decisions/D01-first-mvp.md) | none |

## Riskiest assumptions

| Id | Assumption | Importance | Evidence today | If false | Smallest test | Owner | By when | Result |
|---|---|---|---|---|---|---|---|---|
| A01 | Developers will buy timely text help `[ASSUMPTION]` Agent interpretation of interviews | high | Stated preferences; no new payments | Revise offer/segment | Offer real priced help; observe payment and outcome, not stated intent | Unassigned | Before expansion; date unset | untested |
| A02 | Mentor supply and manual operations fit need and budget `[ASSUMPTION]` Feasibility unmeasured | high | Prospect list, no new agreements | Reduce scope or change timing | Obtain mentor commitment and rehearse complete flow, record effort and response delay | Unassigned | Before delivery commitment | untested |

## Kill criteria

Not agreed. Experiment owner must decide what outcomes prompt revision and when; no invented thresholds. See Q03.

## Hypotheses to test

No synthetic walkthrough performed.

## Open questions

| Id | Question | Blocking | Who can answer | Status |
|---|---|---|---|---|
| Q01 | Which mentors commit, who operates manual steps, and what response/availability can they deliver? | Yes: operable offer and implementation planning | Scope owner and prospective mentors | open |
| Q02 | What are the price, payment setup, text channel, cancellation/refund/no-show rules and required launch terms? | Yes: paid-session implementation and launch | Scope owner, operator, relevant provider/adviser | open |
| Q03 | Who owns the test, which outcomes trigger revision, and when is it reviewed? | Yes: experiment evaluation | Scope owner | open |

## Definition of Ready addendum (own)

Real accounts support specific problems and users. D01 approves scope, not operating details or assumption results. Not ready for an implementation backlog. Product discovery checks are not configured in the pipeline; do not infer readiness from Coverage.

## Collection plan

1. Obtain mentor availability/participation commitments and a manual-flow rehearsal record for A02/Q01. Collector unassigned; needed before implementation planning.
2. Record an actual priced offer, payment/delivery outcome and developer feedback for A01. Collector and date unassigned; execute only after Q01–Q03 are resolved. No claim that this experiment is already authorized or run.
