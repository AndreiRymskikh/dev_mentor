## 📸 UI QA evidence — PASS (automated scope)

Verified PR #27 at `2727c231bdf287ec2aeb70910c755586890a6577` using a fresh production build, disposable PostgreSQL 18, SMTP/HTTPS fixtures and the repository's agent-browser runner. Entire `npm run test:integration` exited 0 and cleaned up its resources. No developer database or existing development server was used.

| Priority | Scenario | Expected and observed |
| --- | --- | --- |
| P1 | Invitation → login → register → email verification → login | Returned to the exact invitation; accepted as the newly verified matching account. PASS |
| P1 | Matching-account acceptance | One-time acceptance; original persisted session ID retained, live mentor role available. PASS |
| P1 | Anonymous/wrong identity; expired/revoked/used invitation | 401/403 denial and generic 404 behavior; wrong-account UI has no Accept control. PASS |
| P1 | Publication window and optional enrollment | Configured 9-day deadline persisted and matched onboarding; self-service remained available with null initial deadline. PASS |
| P2 | 1440/768/390/320px invitation layouts | Automated no-document-overflow assertions passed; desktop/light and 320px/dark full-page captures visually inspected with complete footer and wrapped long fixture email. PASS |
| P2 | Invitation states in Storybook | 16 light/dark checks passed, including pending, retry, denied and invalid presentations. PASS |
| P1 | Shared authentication/administration regression | Full browser suite passed verification/reset replay, session revocation, current role checks, anonymous/non-admin denial, loading/error/retry, duplicate submission and keyboard checks. PASS |
| P1 | Database outage and installer | Fail-closed private UI/API behavior, same-process recovery, safe installer reuse and resource cleanup passed. PASS |

Limits: invitation-specific password-reset/resend round trips, storage denial and 30-minute expiry were not separately clicked through in this production run; continuation validation/storage failures have unit coverage, and reset/resend have standalone integration coverage. Acceptance retry is covered by component/story tests, not a newly injected production acceptance failure. This automated evidence does not grant the independent human QA approval required for risk-high changes. Mandatory dependency audit still fails; see the [review](https://github.com/AndreiRymskikh/dev_mentor/pull/27#issuecomment-6542770894). No source changes or merge.

![Signed-out invitation — desktop/light](https://raw.githubusercontent.com/AndreiRymskikh/dev_mentor/qa-evidence-pr27-review-20261031/pr27/invitation-signed-out-desktop.png)
![Matching invitation — 320px/dark](https://raw.githubusercontent.com/AndreiRymskikh/dev_mentor/qa-evidence-pr27-review-20261031/pr27/invitation-dark-mobile.png)
