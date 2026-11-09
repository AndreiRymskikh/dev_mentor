# Issue 36 catalog design

Goal: settle and review the public mentor catalog contract before implementation.
Source doc: .ai/specs/2026-11-08-mentor-catalog.md
Owner approved public access, published/current-role inclusion despite incomplete offers, newest-publication-first ordering with stable ID tie-breaker in chat. No open blocking policy question remains.
Plan: inspect existing contracts, write skeleton then full design, independent scope review, publish design-only PR; implement on a separate branch.
Progress: read issue/comments/PR guard, lessons, engineering contract, profile/offer/availability and navigation code, installed Next route/page docs. No existing implementation PR. Primary worktree has unrelated edits and remains untouched.
Validation: documentation inspection in progress; code checks not run (no production changes).

Outcome: independent fresh-context scope review approved one discovery capability, with no splitting findings. Manual paths/contracts/diff inspection passed. Mockup/current-app capture deferred: this checkout has no prepared test-env descriptor; actual production-browser screenshots are required on the implementation PR.

Implementation handoff: PR #41 delivers the catalog. Updated design to describe the scoped profile-404 return link and separately committed tooling security repair discovered by the mandatory audit gate. Runtime catalog contract is unchanged. Local full integration passed; final recovery follow-up pending targeted verification. Human review/QA and merge remain external gates.

Final outcome: implementation PR #41 is ready for review. Final targeted catalog verification passed including scoped 404 keyboard recovery; full local gate and audit/Storybook compatibility passed. Human review/QA and merge remain outstanding external gates. No code changes on this design branch.
