# Issue #25 booking/completion design

Goal: deliver the design dependency requested by [#25](https://github.com/AndreiRymskikh/dev_mentor/issues/25), preserving D02–D04 and linking existing implementation owner #37.

Plan: inspect issue ownership and existing work; read product decisions and E02 consumers; prepare skeleton and resolve critical owner choices; then research, complete contracts, review and publish design evidence. No runtime implementation within this issue.

Progress: fetched live issue (open, unassigned, no claim/comments), authenticated identity and open PR inventory (none). Read lessons, configuration, engineering standards, booking backlog and implementation plan, D02–D04 and relevant E02 sections. Existing unrelated source/docs/test changes preserved. #37 already owns booking implementation; do not file a duplicate.

Artifact: [discovery skeleton](../specs/2026-11-08-booking-and-completion-contract.md). Open owner choices: pending capacity, reschedule/cancel behavior, trusted completion and operational privacy/retention inputs. Recommendations are unaccepted proposals. Detailed design is pending the om-spec-writing Open Questions gate and the active D04 acceptance requirement.

Changed files: this run log and the new skeleton only. Validation: checked new relative links and diff whitespace. Production lint/typecheck/coverage/build/integration/audit not run (documentation skeleton only); no CI or completed-design claim. No tracker mutation, claim, commit or PR yet. Outcome: design discovery started; await owner answers before dependent design and code.

## Owner correction — 2026-11-08

Recorded explicit owner answers in D05 and marked D04 partially superseded: no mentor approval, cancellation by either side at any time with required reason/log/profile event, developer-only completion confirmation, six-month retention. Updated skeleton accordingly. Asked targeted follow-ups about cancellation visibility, rescheduling and post-completion cancellation; these remain pending, not defaulted. No runtime code or tracker mutations. Detailed design remains gated on these lifecycle/privacy choices.

## Contract drafted after follow-up answers

Owner confirmed private participant/admin history, immediate atomic rescheduling and cancellation only before developer-confirmed completion, including during/after scheduled service. Updated D05, D04 status, product brief and E02 consumer amendments. Completed the proposed contract with routes/DTOs, authorization/transitions, interval/user locking, immutable terms, retry identity, private audit, six-month retention mechanics and phased verification. Cal.com FAQ and PostgreSQL18 range documentation informed discoverability/interval alternatives; no provider integration added. Technical proposals and real external handoff/support configuration requirements remain visible for review. Shared test-env descriptor absent; per om-auto-write-spec mockup rules, visuals skipped. No runtime checks or CI claimed. Publishing uses an isolated managed worktree; unrelated primary-worktree changes preserved.

Independent fresh-context scope/security review found one P2: replay lookup could occur after mutable slot/price/time eligibility, defeating reconciliation after a successful transition. Clarified authorized retained-command lookup before all fresh-transition checks, documented unique-key-race reconciliation, and added required verification cases. Scope was judged cohesive; re-review requested after correction. This is design review, not runtime validation.

Re-review identified a second P2: concurrent identical retries could both miss the first lookup, and the waiter could fail capacity/version checks after waiting for the winner. Required a second authorized command lookup after participant locks, before all fresh-transition checks, and added that exact concurrency scenario to acceptance. The first sequential-retry issue was confirmed resolved.

Final independent design verdict: approve, with no remaining actionable findings after both P2 corrections. Relative Markdown link validation passed for all eight isolated changed documents and git diff whitespace passed. No production TypeScript changed; lint/typecheck/unit coverage/build/audit/integration not run, no runtime/CI claim. Design is ready for maintainer review; issue #25 stays open pending acceptance, #37 remains the runtime owner. Source changes and prior metadata in the primary checkout were not included in the isolated branch. Publish and handback evidence follows in the final report.

## Publication and handback

Opened ready-for-review [PR #39](https://github.com/AndreiRymskikh/dev_mentor/pull/39) against configured default develop through om-auto-write-spec/om-open-pr. Verified its eight changed files are documentation only and its guarded label set is review/documentation/skip-qa/priority-medium/risk-low. Updated #25 with contract/decision/owner links, aligned #37 title/acceptance and #38 actions with D05, and restored #25's original unassigned state with in-progress removed. #25 remains open for maintainer acceptance. No merge or runtime implementation performed. GitHub CI was running at publication; final CI results are not asserted in this log. Primary checkout's pre-existing source/test/docs changes were preserved. Managed design worktree is archived after publication; PR and local contract remain reviewable.
