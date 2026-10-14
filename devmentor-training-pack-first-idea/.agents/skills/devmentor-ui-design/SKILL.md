---
name: devmentor-ui-design
description: Design or implement DevMentor public, student, and mentor UI while enforcing the project design system, reusable components, UX states, responsive behavior, and shared data-access patterns.
---

# DevMentor UI Design Skill

Use this skill whenever creating or changing a DevMentor screen, mockup, form, table, card, calendar, dashboard, message view, booking flow, or other user-visible experience.

## Goal

Produce a coherent marketplace/self-service UI without inventing one-off components or styling per page. The agent should first compose from the project design system, then add the smallest page-specific layer needed.

## Before designing

State these five things in working notes:

1. Primary actor: anonymous / student / mentor.
2. Primary goal: one sentence.
3. Main decision/action on the screen.
4. Success state.
5. Closest existing shared pattern/component.

Read:
- `AGENTS.md` → UI and Design System rules;
- `docs/product-scope.md` → relevant screen;
- relevant file under `specs/`;
- existing shared UI components before creating anything new.

## Design language

DevMentor should feel:
- developer-oriented but not terminal-themed;
- trustworthy and calm;
- marketplace-first;
- dense enough for professionals, but visually simple;
- modern SaaS, not an admin template.

Use:
- off-white/light neutral page background;
- white surfaces;
- one strong brand/accent token;
- dark neutral primary text;
- subdued supporting text;
- semantic success/warning/error tokens;
- medium radii and restrained shadows;
- clear spacing rhythm.

Never embed literal color values in feature components. Tokens belong in the global design layer.

## Required reusable components

Before writing page-specific UI, check for and use these:

- `AppShell`
- `PublicHeader`
- `PageHeader`
- `Button`, `IconButton`
- `Input`, `Select`, `Textarea`, `Checkbox`
- `FormField`
- `Card`
- `Badge`
- `Avatar`
- `Tabs`
- `Modal`, `Drawer`, `ConfirmDialog`
- `DataTable`
- `CrudForm`
- `LoadingMessage`
- `ErrorMessage`
- `EmptyState`
- `MentorCard`
- `Rating`
- `PriceDisplay`
- `TechnologyTag`
- `TimeSlotPicker`
- `SessionCard`
- `ConversationList`
- `MessageThread`

If a design needs a component that could appear on two screens, promote it to shared UI immediately.

## Screen composition patterns

### Marketplace search

Use:
- compact search/filter header;
- filters above or beside results depending on width;
- repeatable `MentorCard` list;
- visible applied filters;
- URL-backed query state;
- strong next-action CTA.

Do not build a bespoke mentor card on search, favorites and dashboard separately.

### Detail/profile

Use:
- one dominant identity/header area;
- main information column;
- sticky/obvious booking summary on wide screens;
- inline availability preview;
- review section lower in hierarchy.

### Booking

Use a clear step sequence:
1. duration;
2. date/time;
3. agenda/context;
4. summary/checkout.

Always display timezone near time selection.

### Management list

Use `DataTable` when rows need sorting/actions/comparison.
Use cards when the primary content is chronological or task-oriented, such as upcoming sessions.

### Standard CRUD edit

Use `CrudForm`; do not reproduce label/error/footer logic.

### Dashboard

Start with the user's next task, not KPIs. KPIs are secondary.
Student: next session first.
Mentor: next/today sessions first.

## UX state matrix

Every applicable screen must cover:

- initial loading;
- empty state;
- field validation;
- API/server error;
- network retry where safe;
- disabled/pending mutation;
- successful mutation;
- unauthenticated state;
- resource no longer available;
- narrow/mobile layout.

Booking/reschedule additionally covers:
- slot taken between selection and confirmation;
- timezone clarity;
- duplicate submit prevention.

## Error handling

Use shared error components. Preserve user input when possible.

Examples:
- Search failure → `ErrorMessage` + Retry.
- Form validation → field errors.
- Booking conflict → focused error next to time selection + refresh available slots.
- Auth expiration → standard session-expired handling, not a bespoke page alert.

Do not use `window.alert` or `window.confirm`.

## Accessibility

- Semantic headings in order.
- Labels for every form control.
- Visible keyboard focus.
- Icon-only actions require accessible names/tooltips.
- Dialog focus is trapped and returned on close.
- Error/success changes are announced where appropriate.
- Touch targets remain practical on mobile.
- Do not rely on color alone for state.

## Responsive behavior

Design narrow first.

At small widths:
- search filters collapse into a drawer;
- mentor cards stack content/actions;
- booking summary moves below picker or into sticky bottom CTA;
- tables may switch to compact cards only if DataTable cannot remain usable;
- dashboard columns stack in priority order.

Never create a second mobile-only implementation of business logic.

## Mockup workflow

When producing HTML mockups:

1. Use the same design tokens and component vocabulary as production.
2. Make navigation between all key screens clickable.
3. Use realistic seeded content.
4. Include at least one error/empty state in the mockup switcher.
5. Do not optimize for pixel-perfect Preply duplication; copy interaction patterns and information architecture, not branding.
6. Record discovered UX changes back into the relevant product/spec document.

## Completion checklist

Before finishing a UI task verify:

- [ ] Existing reusable component was used where applicable.
- [ ] No raw fetch.
- [ ] No `any`.
- [ ] No hardcoded feature colors.
- [ ] Loading/empty/error/success states exist.
- [ ] Narrow layout works.
- [ ] Keyboard interactions work.
- [ ] Server remains the authorization boundary.
- [ ] Relevant Playwright path is added/updated for critical journeys.
