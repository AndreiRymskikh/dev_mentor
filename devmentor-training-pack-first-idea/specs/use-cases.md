# DevMentor — Use Cases

## UC01 — Find a mentor

Actor: Student or anonymous visitor

Preconditions: none

Main flow:
1. User opens mentor discovery.
2. Enters a technology/problem keyword.
3. Sets optional price, rating and availability filters.
4. System validates query parameters.
5. System displays matching mentors with current next availability.
6. User opens a mentor profile.

Acceptance criteria:
- query state is reflected in the URL;
- invalid filters fall back safely or return a validation error;
- each result shows rate, rating and next availability;
- empty results show a recovery action.

## UC02 — Favorite a mentor

Actor: Authenticated student

Main flow:
1. Student clicks Favorite on a result/profile.
2. API derives student ID from auth principal.
3. Favorite is persisted idempotently.
4. UI updates state.

Security:
- client cannot favorite on behalf of another user.

## UC03 — Message a mentor before booking

Actor: Authenticated student

Main flow:
1. Student clicks Send message.
2. Existing conversation is reused or a new conversation is created.
3. Student sends text.
4. Message is persisted with authenticated sender ID.
5. `messages.message.sent` event is emitted.

## UC04 — Book a session

Actor: Authenticated student

Preconditions:
- mentor exists and is active;
- selected slot is visible as available.

Main flow:
1. Student chooses 25 or 50 minutes.
2. Student chooses a free slot.
3. Student provides short agenda and optional GitHub URL.
4. Server revalidates payload and authenticated actor.
5. Server opens DB transaction.
6. Server locks/checks selected slot.
7. Server creates pending booking and reserves slot.
8. Checkout session is created via `PaymentGateway`.
9. User completes mock/test payment.
10. Payment confirmation transitions booking to `confirmed` exactly once.
11. `payments.payment.completed` and `bookings.booking.created` events are emitted.

Critical acceptance criteria:
- two students racing for one slot cannot both succeed;
- booking price is calculated server-side from mentor rate + duration;
- client-provided price is ignored;
- no booking can be created for a slot owned by another mentor;
- failed payment does not produce a confirmed booking.

## UC05 — Reschedule a session

Actor: Booking student

Preconditions:
- booking is confirmed;
- >= 12 hours remain;
- new slot belongs to same mentor and is free.

Main flow:
1. Student chooses Reschedule.
2. System displays free mentor slots.
3. Student selects new slot.
4. Server checks ownership and policy.
5. Transaction releases old slot and reserves new slot.
6. Booking timestamps are updated.
7. Event `bookings.booking.rescheduled` is emitted.

Failures:
- less than 12 hours remain → policy error;
- slot was taken moments earlier → `BOOKING_SLOT_UNAVAILABLE`;
- booking belongs to another user → 404/forbidden-safe response.

## UC06 — Cancel a session

Actor: Booking student

Main flow:
1. Student clicks Cancel.
2. Confirm dialog explains policy.
3. Server validates ownership and state.
4. Booking becomes `cancelled`.
5. Reserved slot is released when policy allows.
6. Event is emitted.

MVP note: refund accounting is not implemented.

## UC07 — Mentor publishes availability

Actor: Authenticated mentor

Main flow:
1. Mentor opens Availability.
2. Selects one or more ranges/slots.
3. Server derives mentor ID from principal.
4. Zod validates start/end timestamps.
5. Server rejects invalid/overlapping ranges where necessary.
6. Slots become visible in discovery/profile booking UI.

## UC08 — Mentor edits profile

Actor: Authenticated mentor

Main flow:
1. Mentor opens profile editor.
2. `CrudForm` loads current profile.
3. Mentor edits headline, rate, bio, skills, links.
4. Shared Zod schema validates data.
5. API updates only authenticated mentor's profile.
6. Public profile reflects change.

## UC09 — Student leaves a review

Actor: Student with completed session

Rules:
- review can be created only after a completed session;
- one review per booking;
- rating 1..5;
- mentor ID is derived through the booking, not trusted from payload.

## UC10 — View dashboards

Student dashboard:
- next confirmed session;
- upcoming sessions;
- favorites;
- recent conversations.

Mentor dashboard:
- next/today sessions;
- weekly booked minutes;
- estimated gross earnings;
- unread conversations;
- profile completeness.

## UC11 — Automatic MCP tool exposure (stretch)

Actor: Authenticated MCP client

Main flow:
1. API endpoint is registered with OpenAPI-like metadata.
2. MCP registry scans endpoints explicitly marked as MCP-safe.
3. A tool schema is generated from Zod/OpenAPI metadata.
4. Tool invocation calls the same service method as HTTP.
5. Existing authentication, validation and ownership rules still apply.

Safety:
- login/register/webhooks are never exposed;
- mutations require explicit opt-in;
- MCP is not a privileged bypass.
