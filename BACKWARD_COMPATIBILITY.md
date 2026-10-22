# Backward compatibility

DevMentor is a private, unreleased npm-workspace application. These current contracts are protected against accidental changes, including between internal packages. Intentional breaking changes require an explicit specification, coordinated consumer updates, tests, and a migration note in the PR. No public semver/deprecation window is established yet.

| Surface | Protected behavior | Required change path |
| --- | --- | --- |
| Package exports | @devmentor/core HTTP/container/config entry points, db repository contracts, ui PageShell and backend API/forms/tables/feedback entry points; app → core → db and standalone UI | Update all consumers together; retain aliases when consumers cannot migrate atomically; typecheck and test the contract. |
| HTTP | GET /api/health is database-independent and returns the standard success envelope. Failures use ok:false and error.code/message/optional fieldErrors with appropriate status; unexpected failures never expose raw errors. | Document response/status changes and update client helpers, route and integration tests in the same change. |
| UI routes | Home content/assets remain available. /admin intentionally returns HTTP 404 until the owner-approved admin feature exists. | Replace admin's 404 contract with specified auth/ownership scenarios when introducing that feature; update browser tests. |
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
cookies with identical attributes. GitHub and admin UI remain deferred; /admin stays404.
