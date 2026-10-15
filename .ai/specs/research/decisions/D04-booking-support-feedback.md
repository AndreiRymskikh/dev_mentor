# D04 — Booking approval, developer changes, support contact and feedback eligibility

- Date: 2026-10-15.
- Owner/confirmer: product owner in this session (name unspecified).
- Source: direct response to Q02/Q04/Q05/Q03 in the backlog conversation.
- Decisions: booking requires mentor approval. Developer reserves slots and can edit/change their own reservation. Site displays how to contact external support (WhatsApp, email or another configured channel; provider not fixed). Developer can leave feedback after the mentor has provided the service.
- Status: active.
- Supersedes: none; clarifies D02/D03. Mentor acceptance from original D01 is explicitly restored under the revised flow, not silently inferred.
- Scope boundaries: payment remains external. Support is contact information, not an on-site ticketing or refund engine. Feedback is post-service; public profile reviews/ratings are not authorized by this clarification and N02 remains active.
- Review: when proposed booking/feedback acceptance criteria are reviewed; date unset.
- Change path: owner approves a superseding row.
- Implementation proposals, not additional confirmed product decisions: pending/approved status names; reapproval after a changed slot; trusted service-completion marker; timezone display; cancellation mechanics; identity provider. Include consequential details as proposals in dry-run acceptance criteria. Enforce existing repository ownership/security requirements and prevent overlapping confirmed bookings.
- Readiness: the clarified core flow can be drafted as a proposed backlog. Acceptance review must settle reservation-change/reapproval and service-completion mechanics before those stories are implemented. Real slots, payment history and future feedback are not prerequisites for drafting.
