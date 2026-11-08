# D05 — Immediate booking and developer-confirmed completion

Date: 2026-11-08. Owner/confirmer: product owner in the issue #25 conversation. Status: accepted owner policy; technical contract remains subject to specification review.

Supersedes D04's mentor-approval requirement. External text service, payment and support remain unchanged. N02 remains active; this does not authorize public reviews.

- Booking is immediate: published mentor availability needs no additional mentor approval. Successful booking claims capacity atomically, preventing overlapping obligations.
- Either participant can cancel before developer-confirmed completion, including during or after the scheduled session. Require a reason, log the cancellation, and show it in private profile history to both participants and current administrators. Never publish reasons on the public mentor profile. Do not silently impose a before-start cutoff.
- Ask the developer to confirm completion. No mentor activity or attestation is required. Record an authenticated participant-authorized transition on the actual booking; a review client's completion boolean is insufficient. External payment remains unverified.
- Retain records for six months. The final contract must define the retention anchor and deletion effects.

Follow-up answers: rescheduling moves atomically to a free slot without approval, retaining the original if the move fails. Completion is the cancellation cutoff. Cancellation history/reasons are private to participants and current administrators. No public disclosure or reputation penalty is authorized. External support contact/owner remains a launch configuration input; no on-site dispute/refund engine is authorized.

Links: [D04](D04-booking-support-feedback.md), [contract](../../2026-11-08-booking-and-completion-contract.md), [#25](https://github.com/AndreiRymskikh/dev_mentor/issues/25), implementation [#37](https://github.com/AndreiRymskikh/dev_mentor/issues/37).
