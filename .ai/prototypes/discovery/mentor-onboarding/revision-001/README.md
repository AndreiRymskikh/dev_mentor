# Mentor onboarding — revision 001

Date: 2026-10-20. Brief: [product brief](../../../../specs/product-brief.md). Flow: mentor onboarding. No prior revision; no panel report supplied or imported. No synthetic findings are treated as requirements.

## Approved simulation boundary

Actor: a fictitious verified developer already signed in. Start at account; activate mentor membership, complete a profile, add the first availability slot, finish at mentor home. User approved this exact boundary and marked assumptions in conversation. Success means in-memory profile and slot exist, not a published listing, completed booking or production account.

Screens: account, profile, availability, mentor home, access denied, unknown destination. Each form has empty validation, saving, simulated failure, retained-input retry and success. Back links, browser history and Reset are included. Existing developer access remains after activation. Booking, publication, authentication, actual email, real payment/session/support destinations are excluded.

## Preserved source decisions

- BRIEF D02: catalog/manual calendar; payment, text sessions and support external. Owner: session product owner; active; owner-approved superseding decision required.
- BRIEF D03: mentor manages availability through profile calendar; feedback is an outcome signal, not proof of payment. Owner: session product owner; active; owner approves superseding record.
- BRIEF D04: bookings need mentor approval; developer controls own reservation; support is contact information; feedback follows service. Owner: session product owner; active; owner approves superseding row. No booking is created here.
- BRIEF R01: 25/50-minute sessions. Founder A owns changes through owner-approved superseding row. R02: no session content published without mentee approval, both founders must approve replacement; active. No session content is collected.
- BRIEF N01: text, no video; Founder A must supersede. N02: public work rather than public ratings; Founder A must supersede. Both active.
- [AUTH](../../../../specs/2026-10-16-users-auth-application-primitives.md), Confirmed decisions: developer baseline, multiple roles, self-enrollment as mentor; no self-service administrator. Remaining implementation in AUTH is proposed, not implemented.

## Assumptions retained after simulation approval

| ID | Assumption / reason | How to validate |
| --- | --- | --- |
| A01 | [ASSUMPTION] Start with verified developer; exclude authentication to focus onboarding | Confirm real entry points with account-flow specification |
| A02 | [ASSUMPTION] Profile requires display name, technical focus, help description; public-work URL optional. No pricing/publication gate invented | Review minimum profile fields with mentor and owner |
| A03 | [ASSUMPTION] One date/time plus 25/50-minute duration is sufficient for first-slot rehearsal; fixed Europe/Warsaw, no recurring/calendar-sync behavior | Review timezone, future-date, overlap and slot lifecycle rules before implementation |
| A04 | [ASSUMPTION] Completion is profile plus one saved slot; it does not publish a profile or assert mentor readiness | Owner/mentor test the sequence and decide publication requirements separately |
| A05 | [ASSUMPTION] Local save delay and fail-once controls model loading/retry; permissions can be removed mid-flow | Validate real failure/authorization contracts when implemented |

All typed records must be fictitious. No credentials, storage, cookies, external resources or network operations. No actual publication, bookings, payments or support actions. Approval confirms this simulation, not demand, usability, Definition of Ready or production readiness.

## Screen / state map and reproducible checks

| Start / action | Expected result | Basis |
| --- | --- | --- |
| Account → Activate mentor access | Profile; roles include developer and mentor | AUTH, A01 |
| Empty profile submit, then correction | Inline error with first invalid field focused; corrected data accepted | A02 |
| Invalid public-work URL → correction | Safe URL validation, no external navigation | N02, A02 |
| Fail once → Save profile → retry | Failure retains values; retry opens availability | A05 |
| Empty availability → correction | Required date/time errors; 25/50 choices only | R01, A03 |
| Save availability | Loading then mentor home shows saved profile/slot | A03–A05 |
| Home → edit profile/availability → back/forward | Correct screens and retained input | A04 |
| Simulate access removed → protected link | Denied, safe return to account | AUTH, A05 |
| Unknown fragment → account | Useful recovery | A05 |
| Reset during or after saving | Initial developer account; inputs/errors/outcome cleared, no delayed stale save | A05 |
| Keyboard + 320px viewport | Reachable controls, visible focus, heading focus, no horizontal overflow | Accessibility constraint |

## Open and reset

Open `index.html` directly as a local file. Use Reset simulation to clear all in-memory data; reload also clears state. Test states controls set a fail-once save or remove access. Browser entry, error/recovery and completion evidence belongs in `evidence/`.

## Run record and verification

Goal: build only this new revision. Plan: preserve source decisions, construct neutral offline flow, inspect static safety, exercise named browser-provider operations, record evidence and hash inventory. Application, brief, design system and previous artifacts remain unchanged. All run records are kept here to respect the skill's revision-only write boundary.

Static review passed: unique IDs, associated labels, internal fragment destinations, local-only resources, both forms prevent submission, no storage/network APIs, and JavaScript syntax checked with Node. Inspected all screen guards, validation, fail-once retry, retained in-memory data and Reset's cancellation of pending saves. This inspection is not an observed browser interaction.

Browser verification: **not-run**. The configured agent-browser executable exists. Opening the local file failed because its socket directory `~/.agent-browser` was not writable inside the sandbox. The required escalated launch was rejected; no alternate provider, server or installation was used. No browser session opened, so there was no session to close and no screenshots were produced. Keyboard, focus movement, responsive layout, history, saving transitions and runtime error/recovery checks remain unverified. The browser checklist above is pending, not passed.

Outcome: one new self-contained revision created; no previous files or application sources modified. Changed files: index.html, README.md and prototype.json in this revision. The evidence directory is empty because browser access was denied. Production lint/build/unit/integration checks not run: this is standalone discovery HTML, not application implementation.
