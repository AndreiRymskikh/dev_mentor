# Backward compatibility

DevMentor is a private, unreleased npm-workspace application. These current contracts are protected against accidental changes, including between internal packages. Intentional breaking changes require an explicit specification, coordinated consumer updates, tests, and a migration note in the PR. No public semver/deprecation window is established yet.

| Surface | Protected behavior | Required change path |
| --- | --- | --- |
| Package exports | @devmentor/core HTTP/container/config entry points, db repository contracts, ui PageShell and backend API/forms/tables/feedback entry points; app → core → db and standalone UI | Update all consumers together; retain aliases when consumers cannot migrate atomically; typecheck and test the contract. |
| HTTP | GET /api/health is database-independent and returns the standard success envelope. Failures use ok:false and error.code/message/optional fieldErrors with appropriate status; unexpected failures never expose raw errors. | Document response/status changes and update client helpers, route and integration tests in the same change. |
| UI routes | Home content/assets remain available. /admin and /admin/users require current administrator membership; anonymous visitors redirect to login, non-admins see access denied, authorized /admin redirects to /admin/users. | Preserve server authorization and current-role checks; update browser/API denial and permitted-operation tests together. |
| Security helpers | Session resolution fails closed; ownership and mutation CSRF checks deny invalid requests. | Treat weakened auth, ownership or CSRF behavior as a security change requiring explicit review, failure-path tests and risk-high review/QA. |
| Commands | Root dev/start/build/lint/typecheck/test/coverage/integration scripts, argument forwarding, and database lifecycle/migration script names | Preserve delegating aliases when renaming; update CI, README and pipeline validation configuration together. Migration up/down commands use explicit MikroORM configuration; DATABASE_URL is required in the process environment. No seeders exist yet. |
| Local PostgreSQL | Compose uses PostgreSQL 18, a persistent postgres_data volume and localhost-only port binding. Environment template names POSTGRES_DB/USER/PASSWORD/PORT and DATABASE_URL are configuration contracts. | Never reset volumes as part of routine changes. Major upgrades require reviewed migration or backup/restore; keep real credentials ignored. |
| AI metadata | agentic.config.json version 1, provider descriptors, spec/run naming, and lessons index conventions | Preserve custom settings and metadata; document schema/path changes and migrate consumers before removing old paths. |

The additive `Migration202610210001` introduces `users`, `user_roles`, `credentials`, `auth_sessions`, `action_tokens` and `rate_limit_buckets`. UUID keys, normalized unique email, role/purpose checks, bcrypt cost >=12, digest formats, foreign keys and rate bucket composite keys are persistence contracts. Down locks all auth tables and refuses when user or operational data exists; production rollback retains schema/data. Entity mappings use explicit `user_id` fields and migrations are tested for schema drift. GitHub identity/attempt tables are deferred. No business events or payment webhooks are implemented. Authentication cookies are introduced in phase3 below.

Changes to shared contracts, auth, money, or schema migrations are high-risk and require the pipeline's second-person review and QA rules. Verification includes meaningful 100% production TypeScript unit coverage, typecheck, build and applicable browser/database integration checks.

## Registration API (phase 2)

`POST /api/auth/register` is additive, dynamic, CSRF-protected and accepts only explicit registration fields. Responses use the existing JSON envelope, generic 202 and no-store, with no session issuance. Public success paths share a minimum 15-second completion window; SMTP is bounded at 10 seconds and invalidation uses transaction-local lock/statement deadlines. Outages are not a constant-time guarantee. The registration peer bucket is shared across clients until a trusted-proxy adapter exists; spoofed forwarding headers are ignored.

`apiHandler` retains its original one-argument behavior. An optional typed second argument supports no-store and per-result status (200/201/202), headers and multiple cookie strings. Metadata applies only on successful JSON responses; errors retain the safe JSON envelope and typed 429 Retry-After. Existing CRUD and health consumers retain their default 200 responses. No OAuth response mode or authentication-cookie behavior is implemented in this phase.

`requireCsrf(request, trustedOrigin?)` preserves its original default and custom-header policy (Origin may be absent). Registration supplies server-configured `APP_ORIGIN`, normalized and validated as a bare HTTP(S) origin. This supports Next16.4 canonicalizing Request.url to localhost behind a public deployment origin without trusting Host or forwarding headers; malformed supplied configuration fails closed with503. SMTP independently requires HTTPS in production.

## Verified credentials sessions (phase 3)

`Session` replaces optional singular `role` with required readonly typed `roles`;
all consumers and tests migrate together. `requireRole` checks membership and
`requireSession` rejects malformed roles, retaining its existing401 exception contract.
Login/session/logout routes use safe principal DTOs and no-store. Tokens exist only
in app-owned cookies, signed HS256 through exact-pinned jose6.2.13; fixed issuer,
audience, UUID subject/session ID and24-hour expiry are enforced. JWT_SECRET is lazy,
requires>=32 UTF-8 bytes and rotation logs out existing cookies. No refresh/role claims.
Session resolution requires current verified User and unrevoked/unexpired AuthSession,
with current memberships; concrete lookup infrastructure failures return503.
PostgreSQL rate buckets add narrow900-second login windows; existing registration/email
windows retain3600-second defaults. Logout revokes persisted sessions and expires
cookies with identical attributes. At the phase 3 checkpoint, GitHub and admin UI were deferred and /admin stayed404. Phase 5 supersedes that historical admin contract with the protected routes above. GitHub remains coming-soon only.


## Roles and operator commands (phases 5–6)

Administrator lists expose only the bounded allowlisted user DTO. Role mutations
retain developer membership and serialize current-actor authorization and the last
verified-administrator invariant. Mentor enrollment is verified, self-service and
idempotent. The first-admin UUID-only bootstrap shares the administrator lock;
later grants use authenticated administration. No arbitrary user CRUD is exposed.

`auth:maintain` accepts no arguments and deletes only expired operational rows,
up to500 per table per invocation, with bound timeouts and locked-row skipping.
It preserves identities, credentials, memberships and unexpired records. These
commands require an explicitly selected DATABASE_URL; they never reset Compose
volumes. See the [operator runbook](README.md#authentication-deployment-and-operator-runbook).

## Optional invitations (E02 slice 1)

Owner decision 2026-10-26 preserves verified self-service enrollment. Invitation acceptance adds mentor
membership transactionally to the matching persisted verified email, retains developer/administrator
roles and does not revoke or reissue existing sessions: current session resolution reads live roles.
`GET /api/invitations/[token]` and `POST /api/invitations/[token]/accept` use no-store envelopes; every
unknown/expired/revoked/consumed token returns the same 404. Mismatches return 403. Raw tokens never
enter persistence or audit logs. Owner-only `GET /api/mentors/me/onboarding` returns the first deadline
or null for self-service enrollment. `/mentor` requires current mentor membership.

The additive invitation/profile migration and its non-destructive rollback guard are documented in
README. `invite` and the two bounded day settings are additive operator contracts. Local issue #6
tracks the epic, #7 invitations, #8 profile publication; external historical issue numbers are not
local dependencies. Login continuation accepts only `/invitation/<43-character-token>` and otherwise
retains `/account`, preventing an open redirect. UI time rendering begins in UTC on the server and
hydrates to the viewer's zone without replacing the actual instant.

## Mentor profile publication (E02 slice 2)

Additive owner API routes use current persisted mentor membership, CSRF, bounded JSON and the existing
no-store envelope. Partial updates accept only publicWorkUrl/bio/stackTags; publication readiness is
422 with fieldErrors using those keys. Published updates cannot remove required content. Both
invitation and existing self-service mentors can read a virtual draft; GET does not create rows.

Public `/m/<slug>` and `/api/mentors/<slug>` use an explicit five-key DTO. Slugs are nullable in drafts,
allocated once, and immutable across rename/unpublish/republish. Publication implies a non-null slug
in PostgreSQL. Only `mentor_profiles_slug_unique` triggers the bounded fresh-transaction retry. The
reserved list includes the real static owner segment `me`. Reads hide unpublished profiles and users
without current verified mentor membership. Role changes preserve stored content/publication state.

The schema migration is additive and down refuses saved/public content, retaining the first-deadline
floor. UI exports add backend/panels through the existing wildcard and components/mentors explicitly;
core adds pure validators/mentors exports. Existing form props/value conversion/keyboard behavior
remain supported while textarea, multiselect and additional submit actions are additive. Form actions
now use the shared controls in secondary-then-primary order. Reputation, prices, slots and payments
remain absent. Profile publication's best-effort observer cannot undo a committed transaction.

## E01 v2 account and workspace presentation

Authentication endpoints, session cookies, role values and /account remain compatible.
/admin still redirects authorized administrators to /admin/users; /admin/workspace is
an additive, identically guarded landing route. Developer and administrator are shown
as Mentee and Operator without changing persisted membership. Navigation remains
additive and never substitutes for server authorization. The users DTO is unchanged;
payout cells describe absent integration instead of inferring provider status.

Public auth cards retain recovery/resend and GitHub coming-soon feedback. Verification
never creates a session. The expired-login reason is display-only. App-owned protected
requests notify mounted private-content boundaries of a 401, clear private content and
navigate to /login?reason=session-expired. A 403 remains denial; a 503 stays retryable.
useApiResource adds an optional stable request adapter while retaining the existing
default transport and cancellation behavior. Rollback removes these UI consumers and
styles without schema changes or loss of authentication/profile data. Complete mentor
home composition remains blocked until E02 price/slot contracts and policy approvals.
