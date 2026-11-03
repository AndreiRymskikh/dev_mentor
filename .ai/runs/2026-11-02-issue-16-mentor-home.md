# Issue 16 — mentor-home dependency triage

## Goal and references

Implement [issue #16](https://github.com/AndreiRymskikh/dev_mentor/issues/16), including initial and complete mentor-home states, under the [E01 specification](../specs/2026-10-29-e01-v2-screenshot-ui.md) and [E02 v2 specification](../specs/2026-10-29-e02-v2-screenshot-ui.md).

## Plan and progress

1. Read the issue, comments, shared lessons, pipeline configuration and implementation workflow — done.
2. Check claims, existing PRs and prerequisite implementation — done. No issue assignee or active claim; no open implementation PR referencing #16 found.
3. Implement and verify the UI only after the issue's explicit entry criteria hold — blocked.

## Evidence and decision

- Fetched origin successfully. Current source and origin/develop have mentor profile/details/onboarding APIs but no prices or availability services, repositories, entities or routes.
- Epic #6 still lists slices 3 (availability) and 4 (prices) as outstanding; its comments do not record their delivery or policy reconciliation.
- E01's mentor-home dependency contract explicitly requires those APIs, current E02 acceptance of money policy, and resolution of future-publication versus the screenshot's stricter lead boundary. It forbids duplicating E02 service/schema work inside this UI slice.
- The September prices specification records PLN and initial bounds; the later E01 contract still requires reconciliation in E02. Do not present the historical values as newly confirmed policy.
- Issue #16 excludes backend implementation and disabled substitute forms. Implementing a static shell would not satisfy its acceptance criteria.

## Outcome and verification

No production changes, claims, commits or PRs. Only this run log was added. Implementation remains blocked on E02 delivery and the recorded policy decisions. Required next work is E02 slices 3/4, followed by this UI slice.

Read-only verification: issue/epic bodies and comments, open PR search, relevant specifications, current source and refreshed remote tree. Runtime lint/typecheck/coverage/build/integration/audit were not run because production code was unchanged. Metadata diff checked with git diff --check.

## Backlog and plan revision — user follow-up

The user authorized creating the missing prerequisite issues and reevaluating implementation order. Applied `om-prepare-issue`; searched open/closed issues using availability/prices/slots/policy and checked open PRs. Existing epics and UI issues cover related work but no dedicated implementation stories cover the two remaining E02 slices. Verified the configured category, priority and risk labels exist.

Created:
- [#30 — policy reconciliation](https://github.com/AndreiRymskikh/dev_mentor/issues/30): owner-confirmed money authority, publication versus eligibility boundary, and checklist/readiness qualification; align contradictory active specs in a documentation-only PR. Recorded proposals remain unapproved.
- [#31 — availability](https://github.com/AndreiRymskikh/dev_mentor/issues/31): E02 slice 3, owning persistence/APIs, minimal working owner/public consumers, clock boundaries, isolation and concurrency verification. Depends on #30's time decisions.
- [#32 — prices/readiness](https://github.com/AndreiRymskikh/dev_mentor/issues/32): E02 slice 4, exact money, atomic saves, owner/public projections and integrated readiness. Depends on #30's money decision and #31.

Updated #6's slice checklist and appended the revised implementation plan to #6 and #16, preserving original text and scope. Order: #30 → #31 → #32 → #16. Money work can be prepared after its policy decision, but #32 cannot complete integrated readiness before #31. Each implementation slice retains its own PR/full validation/independent high-risk review and QA. #16 reuses the existing workspace shell and profile services, and owns the complete initial/partial/ready screenshot composition rather than rebuilding E02.

No production implementation or policy approval was performed. Runtime checks remain not run; metadata diff checked. The tracker writes returned successful issue snapshots. No new PR or commit was requested for this backlog revision.
