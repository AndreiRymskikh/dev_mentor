# DevMentor — Product Scope

## Product idea

DevMentor is a self-service marketplace where developers find experienced mentors, check availability, message them, book a 25- or 50-minute session, pay, manage upcoming sessions and leave reviews. Mentors manage their public profile, technologies, rate, availability, bookings and conversations.

It is inspired by current Preply marketplace patterns, but adapted to developer mentoring and deliberately simplified for a 25-hour AI coding course.

## Primary personas

### Student / developer

Goal: quickly find the right expert for a specific coding problem and book a session at a suitable time and price.

Typical intent:
- "I need a senior TypeScript developer today after 18:00."
- "I want someone experienced with AI agents and Next.js."
- "I want to discuss a GitHub PR before tomorrow's release."

### Mentor

Goal: present expertise, publish available hours, convert interested developers into paid sessions and manage upcoming work.

Typical intent:
- "I have three free slots this week."
- "I want to raise my rate."
- "I need to see what the student wants to discuss before the meeting."

## Product principles

1. Self-service first: users should complete the main journey without admin help.
2. Marketplace before backoffice: the public/student experience is the hero.
3. One strong vertical flow: search → profile → book → pay → manage session.
4. Enough complexity to teach real architecture, but no enterprise platform mechanics.
5. Every important UI pattern should be reusable.

# Screen inventory

## Public and student screens

### S01 — Landing / mentor discovery

Primary goal: start searching immediately.

Functions:
- hero search: "What do you need help with?"
- technology quick filters: React, TypeScript, AI Agents, Python, PostgreSQL, Kubernetes
- featured mentor cards
- next available time
- hourly price
- rating + review count
- CTA: View profile
- CTA: Book session
- login/register entry points

Training value:
- shared `MentorCard`
- public API read
- loading/empty/error states
- responsive cards

### S02 — Search results

Primary goal: compare mentors.

Functions inspired by Preply search:
- keyword / technology / specialty
- price range
- availability / day and time
- minimum rating
- mentor level/tag (Staff Engineer, Tech Lead, OSS Maintainer etc.)
- sort: Recommended, Rating, Price low/high, Soonest available
- favorites
- pagination
- mentor cards with summary, tags, rate, rating, next availability

Training value:
- URL-backed filters
- Zod query parsing
- reusable filter bar
- list API
- TanStack Query

### S03 — Mentor profile

Primary goal: decide whether to book.

Functions inspired by Preply tutor profiles:
- avatar
- headline
- biography
- technologies / specialties
- years of experience
- languages
- optional intro video/link
- hourly rate
- rating and reviews
- badges
- availability preview
- favorite/unfavorite
- Send message
- Book trial / Book session
- review list

DevMentor-specific:
- GitHub profile link
- sample topics: architecture review, debugging, career mentoring, PR review

Training value:
- detail page
- composed UI sections
- authenticated mutation from public-ish page

### S04 — Login / registration

Primary goal: authenticate with minimum friction.

Functions:
- email + password login
- registration: name, email, password, account type (Student / Mentor)
- generic login error
- return user to interrupted booking/message flow

Security:
- bcrypt password hash
- signed JWT in HttpOnly cookie
- no auth token in localStorage
- no sensitive JWT claims

Training value:
- teach simple but defensible auth
- server guards
- form validation

### S05 — Booking flow

Primary goal: choose a free slot and confirm session details.

Functions:
- mentor summary
- timezone display
- 25 / 50 minute duration
- calendar/day picker
- available time slots
- topic / short agenda
- optional GitHub PR/repository URL
- price summary
- Continue to checkout

Business rules:
- authenticated students only
- slot must still be available at commit time
- transaction prevents double-booking
- all timestamps persisted in UTC

Training value:
- non-CRUD workflow
- concurrency/race-condition example
- domain service

### S06 — Checkout / payment

Primary goal: pay for the booking.

Functions:
- mentor/session summary
- price
- mock card/test payment UI or external checkout handoff
- payment state: waiting / successful / failed
- booking confirmation

Simplification:
- one-off payment only in MVP
- no marketplace payout engine
- no 28-day subscription logic

Stretch:
- lesson packages/subscriptions
- Stripe adapter

### S07 — Student dashboard

Primary goal: answer "what's next?"

Functions:
- next session hero card
- Join meeting / meeting link placeholder
- upcoming sessions
- past sessions
- favorite mentors
- recent messages
- quick CTA: Find another mentor

Training value:
- dashboard composition
- multiple API queries
- empty states

### S08 — My sessions

Primary goal: self-service booking management.

Functions inspired by Preply "My lessons":
- upcoming / past / cancelled tabs
- session card/list
- reschedule
- cancel
- view mentor
- open conversation
- add meeting/topic notes
- leave review after completed session

Business rules:
- reschedule only >= 12 hours before start
- target slot must be available
- only booking student or booking mentor can see the session

Training value:
- state machine
- explicit actions instead of CRUD
- confirmation dialog

### S09 — Reschedule modal/page

Primary goal: change time without support.

Functions:
- current time
- mentor calendar
- selectable free slots
- timezone
- confirm new time
- policy warning

Training value:
- reuse `TimeSlotPicker`
- server-side policy checks
- conflict handling

### S10 — Messages

Primary goal: allow student/mentor conversation before and after booking.

Functions inspired by Preply messaging:
- conversation list
- unread indicator
- message thread
- send text message
- mentor/student summary
- contextual CTA to book session
- contextual CTA to view booked session

Simplification:
- polling or query refresh is enough for MVP
- SSE/event push is stretch
- no attachments in MVP

Training value:
- non-CRUD action
- ownership checks
- event emission

### S11 — Favorites

Primary goal: short-list mentors.

Functions:
- saved mentor grid/list
- availability and current price
- remove favorite
- book directly

Training value:
- simple CRUD/factory use case

### S12 — Student settings

Functions:
- name
- timezone
- preferred technologies
- password change
- sign out

Training value:
- `CrudForm`-style profile edit
- account security

## Mentor screens

### M01 — Mentor dashboard

Primary goal: run the mentoring business today.

Functions:
- today's sessions
- next session
- weekly booked hours
- estimated earnings (simple derived value)
- unanswered conversations
- profile completion
- quick CTA: Edit availability

### M02 — Availability

Primary goal: publish bookable time.

Functions:
- week calendar
- add available range
- remove available range
- timezone
- upcoming generated/open slots
- warning when slot overlaps an existing booking

MVP simplification:
- explicit slots or simple ranges for next 30 days
- no full recurrence-rule engine

Training value:
- calendar UI
- date/time correctness
- validation

### M03 — Mentor sessions

Functions:
- upcoming / completed / cancelled
- student summary
- topic
- GitHub link supplied by student
- open conversation
- meeting link placeholder
- mark completed (optional; can also auto-complete by time in demo data)

### M04 — Edit mentor profile

Functions:
- headline
- bio
- hourly rate
- technologies
- specialties
- experience
- languages
- avatar URL/upload placeholder
- GitHub URL
- intro video URL
- preview profile

Training value:
- ideal `CrudForm` lesson
- Zod shared validation

### M05 — Mentor students

Functions:
- students with previous/upcoming session
- last session
- next session
- number of sessions
- open conversation

Stretch; useful for parallel-agent lesson, not critical to core journey.

### M06 — Reviews

Functions:
- aggregate rating
- review list
- reply to review (stretch)

# Feature catalogue

## MVP — must exist by developed repo state

- registration/login/logout
- student/mentor user type
- mentor profiles
- technology/specialty taxonomy
- search + filters
- favorites
- availability
- booking
- reschedule/cancel
- mock payment
- student dashboard
- mentor dashboard
- sessions lists
- messages
- reviews
- reusable UI primitives and patterns
- migrations + seed data
- typed API + shared error envelope
- integration tests for critical business rules
- Playwright critical journey

## Stretch / wow features

- AI session brief from agenda + GitHub URL
- automatic MCP exposure from API metadata
- real Stripe adapter
- realtime messages with SSE
- recurring availability rules
- subscriptions / lesson packs
- email notifications

## Explicitly not in scope

- RBAC/ACL
- admin permissions matrix
- organizations/tenants
- module/plugin runtime
- Plugin/module runtime and auto-discovered DI registration (explicit Awilix dependency injection is in scope)
- queues/workers
- custom encryption
- video calling implementation
- production marketplace payouts
- tax/VAT/accounting
- dispute/refund engine
- complex recommendation algorithm
