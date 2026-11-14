# My sessions participant workspace

Date: 2026-11-11. Status: proposed extension for issue #38.

## TLDR
Signed-in participants will see their persisted bookings at /account with upcoming/history pages. Reuse #37 private details for every mutation.

## Resolved assumptions (autonomous defaults)
- Q1: combined participant list at /account, each row labelled “You are the developer” or “You are the mentor”. The existing endpoint already scopes both roles; no role selector or new endpoint is required. Current membership does not erase obligations.
- Q2: preserve accepted #25 ordering: upcoming is booked with end after serverNow; history is terminal or end at/before serverNow, including actionable unconfirmed bookings. No new lifecycle state.


## Problem Statement
The account screen links to discovery but cannot list a participant’s bookings. #37 now supplies participant-scoped bounded reads and private actions.

## Decisions in play
Reuse D02–D05, R01/R02, N01/N02 and the [booking contract](2026-11-08-booking-and-completion-contract.md). No approval, payment verification, on-site chat/support or public feedback. No independent capability is bundled.

## Architecture and API Contracts
Keep account session resolution, workspace, sign-out, enrollment and role navigation. A colocated client list uses protectedRequest, useApiResource, ResourcePanel, DataTable, BookingTime and shared feedback/buttons/links. Read GET /api/bookings?view=upcoming|history&limit=25&after=<returned cursor>. No actor query, core/db change, migration or new DTO. Private no-store endpoint already enforces participant scope and expiry. Admin membership does not confer participant-list access to unrelated bookings.

## UI/UX
Upcoming/History are labelled buttons with pressed state. Show counterpart, participant-relative role, start/end with viewer IANA zone plus UTC, selected duration, agreed currency/price and status. Label completed as developer-confirmed service; payment remains unverified. Booked rows ending by serverNow say Awaiting your confirmation / Awaiting developer confirmation. All other booked rows say Booked. Terminal cancelled rows say Cancelled.
Each row links to the existing private detail at /account/bookings/[id], labelled View booking. Text hints for current allowedActions explain that cancellation, rescheduling and confirmation happen on detail. No cached role-based mutation controls. Detail re-reads current authority and retains its existing required cancellation reason, reschedule review, completion dialog and rejected-transition context. Cancellation history/reasons remain on private detail, not list responses.
Successful zero-result reads show “No sessions yet” only in Upcoming page one, qualified “No upcoming sessions”; history says “No session history”. A continuation page with zero results says “No more sessions”. Link genuine empty views to /mentors. Do not imply an empty upcoming view proves no history. Loading/error/unauthorized never render empty success or stale booking rows. Session-expiry handling remains the existing PrivateContent flow.
Next uses exactly the returned cursor, replacing rather than appending rows. First page and Refresh restart the selected view; changing view resets its cursor. The list automatically re-reads page one on tab visibility, every60 seconds and the nearest visible booked end boundary, measured against response serverNow rather than the device clock. Test skewed device clocks. Returning from detail remounts/refreshes authoritative rows. No optimistic inserts or accumulated duplicate pages. During refresh focus remains on stable controls; when a focused row is replaced restore its detail link if present, otherwise the list heading. Do not steal focus moved elsewhere while loading.
Use a labelled horizontal table scroll region with readable minimum width, keyboard scrolling, bounded page size and wrapping inside cells. Keep account shell responsive at320px and light/dark token colors. No cancellation draft lives inside automatic list refresh boundaries.

## Edge Cases & Failure Scenarios
Aborted old responses cannot overwrite a different view/cursor. Dependency failure offers Retry and hides prior records. Unknown/missing/unowned detail IDs remain indistinguishable404; no identifier grants read/mutation rights. Page membership may change as time passes or another participant changes a booking; refreshing restarts and re-evaluates. No snapshot-total guarantee. Support guidance remains authoritative on private detail; global copy states payment and text session are external. Expired records are hidden even if purge is delayed.

## Research
[Cal.com FAQ](https://cal.com/faq) documents managing cancellation/rescheduling from account bookings. Adopt the discoverable list-to-detail journey; skip calendars, workflows and approval state. DevMentor lifecycle remains D05.

## Risks & Impact Review
Primary risk is misleading stale/empty data or lost keyboard focus during refresh. Use isolated requests, truthful state gates and focus restoration. No public contract, stored data, migration or auth change; rollback restores prior account UI while retaining bookings. Existing list ordering and detail action APIs are reused unchanged. Runtime evidence is required separately from this document.

## Phasing
One participant workspace capability; design review precedes implementation.

## Implementation Plan
- [ ] Step1: review this extension and publish a design-only PR referencing #38.
- [ ] Step2: account list with bounded cursor pages, honest states, participant labels and existing detail links.
- [ ] Step3: unit coverage for every path, including delayed/failed/stale reads, expiry, pagination, role/state labels and focus.
- [ ] Step4: disposable PostgreSQL/production-browser checks for private scoping, booking creation/list/detail/action/return, responsive themes and no duplicate rows; full configured gate, code review and PR evidence.

## Evidence limits
No runtime checks or visual captures yet. No shared test-env descriptor is committed; implementation uses repository-native disposable integration infrastructure. No new entity diagram is needed.

## Design review — 2026-11-11
Fresh-context reviewer approved scope, lifecycle and privacy; low-severity server-clock timer clarification applied. No runtime verification claimed.
