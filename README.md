# DevMentor

DevMentor is a TypeScript application built with Next.js and React. Its target architecture is a monorepo with reusable domain, persistence, and UI packages.

## Technology choices

- **Application:** latest stable, mutually compatible Next.js, React, and TypeScript releases. The repository's installed versions are recorded in `package.json` and `package-lock.json`; upgrades should verify compatibility.
- **Database:** PostgreSQL with MikroORM for TypeScript entities, data access, migrations, and connection pooling.
- **Dependency injection:** Awilix, with explicit server container registration and request scopes in the core package.
- **Frontend pages:** Tailwind CSS.
- **Backend/admin pages:** shadcn/ui components. Backend pages here refer to the administrative UI.

## Package structure

```text
packages/
├── app/     # Main Next.js application and dependency composition
├── core/    # Reusable domain logic, contracts, and utilities
├── db/      # MikroORM entities, repositories, migrations, and database helpers
└── ui/      # Reusable React components and styles
```

Dependencies follow `app → core → db`, with standalone `ui` consumed by `app`. Core stays independent of Next.js and React; db and ui import no other workspace package. Shared code is consumed through package exports, with no circular dependencies.

Database access and the Awilix container stay on the server. Request-specific services use request scopes. MikroORM uses a lazy shared pool with fresh request managers and transaction-bound managers; explicit migrations live under `packages/db/src/migrations`.

The npm workspace structure is implemented. Routes live in `packages/app/src/app/`, static assets in `packages/app/public/`, and reusable components in `packages/ui/src/`. Package source exports are compiled by Next.js. The `core` and `db` packages expose shared contracts and a lazy persistence runtime; PostgreSQL is provisioned locally and Awilix scopes are configured. The auth database, credential services/routes and authentication screens are implemented; role management and shadcn/ui administration remain pending. See [implementation status](track.md).

## Getting started

Install Node.js 24+ and Docker with Compose v2, and start the Docker engine. From a fresh checkout:

```bash
npm run setup
```

Setup installs missing or drifted dependencies, creates a private root `.env` only when absent, starts local PostgreSQL and verifies authenticated access, then starts the development server in the foreground. It uses Node builtins and works before `node_modules` exists. Browser installation and CI tests remain separate optional steps.

Setup does not yet configure authentication secrets/SMTP or apply authentication
migrations. Before testing registration, complete the [auth environment and
migration prerequisites](#phase-2-registration-api-checkpoint), then follow the
phase4 manual UI checkpoint below. A running app and healthy PostgreSQL alone are
insufficient for registration.

Rerunning validates current state and skips healthy dependencies, existing configuration and a healthy database. A setup-owned server with the same repository, dependency fingerprint, effective configuration and port is reused. Existing credentials and database data are preserved. Use `PORT=3001 npm run setup` on POSIX shells to choose another application port (PowerShell: `$env:PORT=3001; npm run setup`). `POSTGRES_PORT` and DATABASE_URL must describe the same database connection.

Ctrl+C stops only the development server owned by this setup invocation; PostgreSQL data remains. If another setup is still preparing, retry after it reports ready. An occupied port belonging to an unverified process is reported rather than killed. After an abnormal termination, verify no installer/dev process is running before removing only `.devmentor/setup.lock` and retrying; never remove database volumes for routine recovery.

Existing invalid or incomplete `.env` files are left unchanged with recovery instructions. Explicit POSTGRES_* and DATABASE_URL process values override the file, but must remain mutually consistent; the same effective settings are supplied to Compose, database checks and dev. If PostgreSQL storage already exists and credentials are missing, recover the original credentials instead of generating replacements. Secrets are not printed. Installer state under `.devmentor/` is ignored.

### Manual alternative

The original commands remain available. Prepare `.env` from `.env.example`, set POSTGRES_PASSWORD and the matching encoded DATABASE_URL (see Local PostgreSQL below), then run:

```bash
npm install
npm run db:up
npm run db:check
npm run dev
```

When the app needs DATABASE_URL, export it to the dev process or place the matching value in `packages/app/.env.local`; setup supplies it automatically.

Open [localhost:3000](http://localhost:3000). The current entry page is `packages/app/src/app/page.tsx`. Root `dev`, `build`, and `start` scripts delegate to the app workspace.

Available verification commands:

```bash
npm run lint
npm run typecheck
npm test
npm audit
npm run build
npm run smoke
```

## Specifications and AI workflow

[AGENTS.md](AGENTS.md) defines the shared architecture and coding-agent rules; [CLAUDE.md](CLAUDE.md) imports them.

- `.ai/specs/YYYY-MM-DD-slug.md`: SDD specifications, moved to `implemented/` after verification or `archive/` when superseded or abandoned.
- `.ai/runs/YYYY-MM-DD-slug.md`: autonomous AI run plans, progress, decisions, and verification results.
- `.ai/lessons.md` and `.ai/lessons/`: durable findings and prevention rules recorded after corrections and bug fixes.

`npm run smoke` starts the production app on localhost:3100, verifies the homepage, assets, and shared Tailwind styles, then stops the server. Run it after a successful build; override the port with `SMOKE_PORT`.

## Local PostgreSQL

Install Docker with Compose v2 and start its engine. From the repository root:

```bash
cp .env.example .env
# Set POSTGRES_PASSWORD and update DATABASE_URL in .env.
npm run db:up
npm run db:check
```

The official PostgreSQL 18 Alpine image uses a persistent named volume mounted at `/var/lib/postgresql`. The port is bound to `127.0.0.1:5432`; change `POSTGRES_PORT` and the URL if that port is occupied. Startup waits for the database health check. This is a local development database; the bootstrap user has administrative privileges.

`npm run db:psql` opens SQL shell access, `db:logs` follows logs, and `db:status` shows health. `db:check` checks password-authenticated TCP access inside the container. `npm run db:down` stops the stack while preserving its data. Initialization settings apply only to an empty volume; changing the environment does not change existing database users or passwords. Never remove the volume unless you intend to delete its data. Upgrade PostgreSQL major versions with an explicit data migration or backup/restore.

Compose reads the root `.env`. Next.js runs in `packages/app`, so when ORM integration is added, provide the same `DATABASE_URL` in `packages/app/.env.local` (or the process environment); Next.js does not automatically read the root file. Within Compose networking the hostname is `postgres` and the port is `5432`; host-run applications use `127.0.0.1` and `POSTGRES_PORT`. URL-encode special characters in passwords used in connection URLs. Environment files are ignored; only `.env.example` is committed.

MikroORM 7.2.5 provides the lazy database runtime and explicit auth schema migrations. Application routes do not yet consume persistence. Schema changes use reviewed migrations.

## Shared engineering foundations

Core exports HTTP helpers through `@devmentor/core/http` and request scopes through `@devmentor/core/container`. `/api/health` demonstrates both without needing PostgreSQL. API responses use `{ ok: true, data }` or `{ ok: false, error: { code, message, fieldErrors? } }`.

UI exposes independent `@devmentor/ui/backend/api`, `/forms`, `/tables`, and `/feedback` entry points. Application code passes pure validation schemas into `CrudForm`; UI does not import core. `DataTable` uses controlled pagination: its caller supplies the current page rows, total count, and page-change callback.

The shared auth helpers require a verified session resolver; they do not implement login or JWT authentication. Auth/mentor entities, the users admin example, domain events, and concept validators will be added with their first feature specification. MikroORM integration remains a separate persistence stage. See the [engineering standards](.ai/specs/2026-09-01-engineering-standards.md).

## Database workspace commands

Root commands delegate to `packages/db` and forward CLI arguments:

| Root command | Database workspace command |
| --- | --- |
| `npm run db:migration:create` | `migration:create` |
| `npm run db:migrate` | `migration:up` |
| `npm run db:migrate:down` | `migration:down` |
| `npm run db:schema:update` | `schema:update` |
| `npm run db:seed` | `seed` |

Migration commands now use the installed MikroORM CLI and explicit configuration. Supply `DATABASE_URL` in the process environment; the CLI does not implicitly load the root `.env`. `npm run db:migrate` applies the tracked migration. `npm run db:migrate:down` refuses if users or rate-limit data exist and holds table locks through its check and drop. Roll back application routes while retaining production schema/data; destructive production removal needs an approved backup/export and data-loss plan. `db:schema:update` bypasses reviewed migrations and must not be used to deploy this schema. No seeders are implemented yet; `db:seed` remains a reserved alias.

For the phase 1 manual checkpoint, run these from the repository root:

```sh
npm run test:integration
```

This starts its own disposable PostgreSQL container, applies migrations, checks entity/schema drift, ORM writes/reads, constraints and transaction rollback, proves empty rollback succeeds and populated rollback is refused, then checks home and `/admin` HTTP/browser behavior. It stops its own resources and never resets Compose data. A production build and installed browser are prerequisites (`npm run build`, `npm run browser:install`). Authentication routes and screens become testable in later phases.

To inspect operator command argument forwarding without connecting to any database, run `npm run db:migrate -- --help` and `npm run db:migrate:down -- --help`.

## PR CI and tests

[CI](.github/workflows/ci.yml) runs on every pull request, on pushes to `develop`/`main`, and manually. It uses Node 24 and `npm ci`, with separate **Production build**, **Lint and TypeScript**, **Unit tests (100% coverage)**, and **PostgreSQL and browser integration** jobs. Configure these four job names as required status checks in GitHub branch protection if merges must be mechanically blocked.

```bash
npm ci
npm run test:unit
npm run test:coverage
npm run browser:install          # Linux: add -- --with-deps
npm run build
npm run test:integration         # Requires a running Docker engine
```

Vitest/V8 enforces 100% lines, statements, functions and branches per production TypeScript/TSX file, including Next configuration. It does not exclude untested production files. Generated declarations, assets, dependencies and test/operational tooling are outside that metric. Reports are in `coverage/`; CI uploads them even when coverage fails.

Integration runs start a PostgreSQL 18 Testcontainer with random credentials and a random mapped port, verify SQL access, and start the production app on a free localhost port with the ephemeral DATABASE_URL. Agent-browser checks home content and protected `/admin`/`/admin/users` navigation, role controls and responsive users tables. HTTP checks verify authentication redirects, denied access, bounded admin queries and role mutations. The runner verifies the real ORM and migrations before starting the app; public app routes remain independent of persistence. Developer Compose data is untouched.

The browser session, app process and test container are closed in cleanup. Snapshots, screenshots and app logs are retained in ignored `test-results/integration/` and uploaded by CI. Timeouts are centralized in `tests/integration/config.ts`. The integration script fails when no production build exists; it never silently skips tests when Docker or Chromium is missing.

`npm run check` additionally runs `npm audit`. The previously recorded unpatched braces advisory remains a separate local full-gate blocker; it is not concealed by the four requested CI checks.

`npm run test:setup` exercises a real first run and rerun in a temporary checkout with unique Compose resources and free ports. It verifies credential/dependency preservation, server reuse and a persisted SQL sentinel, then removes only its fixture resources. The normal integration runner includes this scenario. `scripts/setup` is included in the 100% unit coverage gate; no coverage threshold is relaxed.

### Registration email configuration (phase 2)

Registration services require `RATE_LIMIT_SECRET` (at least 32 random bytes), fixed
`APP_ORIGIN` and `EMAIL_FROM`, plus `SMTP_HOST`/`SMTP_PORT`. Production SMTP requires
`SMTP_USER`/`SMTP_PASSWORD` and verified TLS (implicit on port 465, required STARTTLS
otherwise); `APP_ORIGIN` must be an HTTPS origin without a path/query/credentials.
Configuration is checked only when registering or sending email, so build and health
remain independent of secrets. Never derive the origin or sender from request headers.

For development, explicitly set `SMTP_LOCAL_SINK=true`, `NODE_ENV=development` and
an IP literal loopback `SMTP_HOST` (`127.0.0.1` or `::1`) with your local mail-sink port.
This policy permits plaintext to that sink only. Do not use real recipients or external
SMTP credentials for tests: integration starts its own disposable loopback SMTP sink.
A ten-second overall delivery deadline closes the connection across connect/auth/send.

Initial registration atomically persists a 24-hour verification token digest before
awaiting delivery. Delivery failure keeps the public response generic and invalidates
only that issued token. If the database is also unavailable, revocation cannot be
guaranteed; the service records a fixed event without sensitive diagnostics. Same-account
verification resend is available through the phase 3 API; integration proves recovery
by resending to the same account after simulated SMTP failure. The registration API is now exposed through task P2.3; use the checkpoint below.

### Phase 2 registration API checkpoint

Set `DATABASE_URL` and the mail/rate settings in `packages/app/.env.local` for Next development, or export them into the app process environment. The root migration CLI does not load the app’s `.env.local`: export the same `DATABASE_URL` in your shell before running `npm run db:migrate`. Set a random `RATE_LIMIT_SECRET` of at least 32 UTF-8 bytes, and configure `APP_ORIGIN`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` and `SMTP_PASSWORD` in your local environment. Production requires an HTTPS app origin and authenticated TLS SMTP with a trusted certificate. SMTP credentials and a functioning mailbox are operator prerequisites; delivery is not guaranteed. Verification links open the implemented `/verify-email` page; use the phase4 UI checkpoint below or the optional API-only sequence.

For development, optionally start [Mailpit](https://github.com/axllent/mailpit) pinned to [v1.31.5](https://github.com/axllent/mailpit/releases/tag/v1.31.5):

```sh
docker run --rm --name devmentor-mailpit -p127.0.0.1:1025:1025 -p127.0.0.1:8025:8025 axllent/mailpit:v1.31.5
```

Open its [local mailbox](http://localhost:8025). This optional manual command was not executed during implementation; automated tests use their own SMTPServer fixture. For development only, this or an existing loopback SMTP sink can use `SMTP_LOCAL_SINK=true`, `SMTP_HOST=127.0.0.1`, its listening port, and `APP_ORIGIN=http://localhost:3000`. This intentionally rejects production mode. The automated integration suite provisions its own authenticated STARTTLS sink and disposable database; it needs Docker and OpenSSL and never resets the Compose database.

Before starting a manual auth test, apply migrations to the same database used by
the app. A healthy PostgreSQL container and `/api/health` response do not confirm
that authentication tables exist. On a POSIX shell, after configuring the ignored
`packages/app/.env.local` with the matching `DATABASE_URL` and auth/mail settings:

```sh
set -a
source packages/app/.env.local
set +a
npm run db:migrate
npm run dev
```

Include independently generated `JWT_SECRET` and `RATE_LIMIT_SECRET` values of at
least 32 UTF-8 bytes. Use `npm run dev` with the development-only local SMTP sink.
Missing configuration or unapplied migrations intentionally returns a safe 503
from registration. Keep environment files untracked and never reset the database
to repair missing migrations.

Then run:

```sh
curl -i http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:3000' \
  -H 'X-DevMentor-CSRF: 1' \
  --data '{"email":"your-test-mailbox@example.com","displayName":"Manual Test","password":"a unique test password"}'
```

Expect a generic JSON 202, `Cache-Control: no-store`, and no session cookie. A duplicate or delivery failure returns the same response. Admitted registrations intentionally take at least 15 seconds, including duplicates: the response window covers the 10-second SMTP deadline and cleanup budget to reduce account-existence timing disclosure. Severe database/network outages can exceed that window; this is not a constant-time guarantee under outages. Invalid fields or forged `roles` return 400, removing the CSRF header returns 403, and missing server configuration or unavailable persistence returns safe 503.

Next's request does not expose a trusted peer address. Registration therefore uses one conservative shared bucket across clients (10 registrations/hour), ignoring `X-Forwarded-For` and `X-Real-IP`. There is no trusted-proxy configuration yet. Email limits also apply; 429 includes bounded `Retry-After`. This conservative limit is intentional until a verified proxy integration is introduced. Restarting the app does not clear database-backed limits. `/api/health` remains independent of database and mail configuration; protected administration is available in phase 5.


### Phase 3 verification API checkpoint

Use the same database, app origin, mail sink and rate-limit configuration as above.
Request a replacement verification email (this invalidates prior verification tokens):

```sh
curl -i http://localhost:3000/api/auth/verification/request \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:3000' \
  -H 'X-DevMentor-CSRF: 1' \
  --data '{"email":"your-test-mailbox@example.com"}'
```

Expect generic 202 after the same 15-second window for unverified, unknown,
already-verified and credentialless accounts, or failed delivery. Only an eligible
unverified credentials account receives mail. Registration and resend share the
3 emails/hour/address and 20 emails/hour/shared-peer limits; 429 includes Retry-After.

Copy the 43-character `token` value from the email link's `#token=` fragment into
the local JSON body below. Keep real tokens out of shared terminal logs and screenshots.
The link's page is implemented in phase 4; visiting a GET URL cannot consume a token.

```sh
curl -i http://localhost:3000/api/auth/verification/confirm \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:3000' \
  -H 'X-DevMentor-CSRF: 1' \
  --data '{"token":"PASTE_THE_FRAGMENT_TOKEN_HERE"}'
```

Expect 200 and no session cookie. Repeating the POST, using a replaced token, or
using an expired/invalid token returns the same safe 400 error. Tokens expire after
24 hours. Missing CSRF returns 403; GET returns 405 and leaves the token unchanged.
Resend after a delivery failure can recover the same account once SMTP works again,
subject to the shared email limits. Do not clear or reset your Compose database to
repeat tests; `npm run test:integration` provisions disposable PostgreSQL and mail.
Continue with the login/session and recovery checkpoint below.

### Phase 3 login/session checkpoint

After verifying a credentials account, configure `JWT_SECRET` with at least 32 random
bytes independently of `RATE_LIMIT_SECRET`. Configuration and database connections
remain lazy: home and build do not require either secret.

```sh
curl -i -c /tmp/devmentor-cookies -H 'Content-Type: application/json' \
  -H 'X-DevMentor-CSRF: 1' -H 'Origin: http://localhost:3000' \
  -d '{"email":"your-local-account@example.test","password":"your local password"}' \
  http://localhost:3000/api/auth/login
curl -i -b /tmp/devmentor-cookies http://localhost:3000/api/auth/session
curl -i -b /tmp/devmentor-cookies -c /tmp/devmentor-cookies \
  -H 'X-DevMentor-CSRF: 1' -H 'Origin: http://localhost:3000' \
  -X POST http://localhost:3000/api/auth/logout
```

Use your local account only; avoid putting real production credentials in shell history.
Login returns only `id`, `displayName`, and current `roles`; its JWT appears only in
the HttpOnly cookie. Session lookup after logout returns401. Production cookies have
`__Host-` names and Secure/HttpOnly/SameSite=Lax/Path=/; local HTTP development uses
an unprefixed non-Secure cookie. Sessions expire absolutely after24 hours, have no
refresh, and read current database roles on every request. Unknown, wrong-password
and unverified credentials return the same401. Login retains all attempts: five per
email/IP pair and50 per IP in fixed15-minute PostgreSQL windows; without an explicit
trusted-proxy adapter, all callers share the conservative peer bucket and forwarding
headers are ignored. JWT/storage failures deny access with safe503; invalid cookies
return401. Logout is idempotent and clears the cookie even when already absent/invalid.

Shared `Session` now requires `roles: readonly Role[]` with `developer`, `mentor`,
`administrator`; `requireRole` checks membership. All existing consumers migrated
atomically. The generic `requireSession` helper retains its existing401-on-resolver-error
contract; concrete session HTTP lookup preserves infrastructure failures as503.

### Phase 3 complete manual API sequence

Owner manual acceptance remains pending. This optional API-only sequence copies
email fragment tokens into the POST bodies; the phase4 UI checkpoint below instead
opens actual email links in the browser. First follow the registration example above,
open the local mailbox, and confirm its verification token with the verification
POST. Use the same email and password throughout. Login with the cookie-jar command
above and verify `/api/auth/session` returns your principal. If you tested logout,
login again before continuing so the jar holds an active session.

Request recovery using your registered local email:

```sh
curl -i http://localhost:3000/api/auth/password/forgot \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:3000' \
  -H 'X-DevMentor-CSRF: 1' \
  --data '{"email":"your-local-account@example.test"}'
```

Expect generic 202 after the same 15-second public window for eligible, unknown,
credentialless and SMTP-failure cases. Registration, verification resend and forgot
share three requests/hour/address and twenty/hour/shared peer; retry after the
reported cooldown. The reset link uses the configured `APP_ORIGIN` and a fragment.
Copy its 43-character token from the mailbox; GET cannot consume it. Tokens expire
after 30 minutes and a newer request invalidates older reset tokens.

```sh
curl -i http://localhost:3000/api/auth/password/reset \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:3000' \
  -H 'X-DevMentor-CSRF: 1' \
  --data '{"token":"PASTE_THE_FRAGMENT_TOKEN_HERE","newPassword":"your replacement password"}'
curl -i -b /tmp/devmentor-cookies http://localhost:3000/api/auth/session
```

Expect reset 200 without a session cookie and the old cookie to return 401. Login
with the old password must return 401; login with the replacement password and
`-c /tmp/devmentor-cookies` must return 200, then session lookup returns the same
account. Repeating the reset POST returns 400. Reset does not automatically verify
an unverified account or add credentials to a credentialless account. No automatic
login occurs. Passwords must contain 12–72 UTF-8 bytes. Missing CSRF or a mismatched
Origin returns 403; extra identity/role fields return 400. For automatic disposable
SMTP failure, retry, expiry, replay and reset/login concurrency evidence, run
`npm run test:integration`; do not clear the developer database or rate counters.

That phase3 API checkpoint remains available for manual testing. Phase4 screen
implementation is complete below; GitHub remains coming-soon and administration
is available in phase5 below. No owner manual checkpoint is marked passed.

### Authentication screens (phase 4)

With the existing database, migrations and auth/SMTP environment configured, open
`/register`, `/login` or `/forgot-password` directly. Registration sends a generic
verification message and does not sign in. The verification email/retry link opens
`/verify-email`; password recovery links open `/reset-password`. Verification/reset and `/account` are implemented in task P4.2.

For manual testing, submit empty/invalid fields, correct them using the keyboard,
check password-manager autocomplete, and submit valid registration/recovery forms.
While the request is pending (the public delivery window is about 15 seconds),
controls prevent duplicate submissions. After registration is accepted, the form is
replaced by a focused **Request accepted** heading, email instructions, and visible
**Sign in** / **Request another verification email** links. Verify your email using
the inbox link before signing in; acceptance does not guarantee account creation
or email delivery. Check your SMTP inbox and spam folder.
GitHub's button displays “GitHub sign-in will be implemented soon.” without starting
OAuth. Wrong/unverified login, unavailable services and rate limits display safe
feedback. Successful login goes only to `/account`.

Phase4 P4.1 automated verification includes actual HTTPS browser registration,
unverified login denial, verified fixture login with an accepted Secure session
cookie, recovery mail, rate-limit feedback and GitHub no-request feedback. Desktop
and320px screenshots and computed field spacing/focus/no-overflow checks passed.
Both default and Webpack builds now compile Tailwind through the same PostCSS
pipeline. The owner's complete phase4 manual checkpoint remains pending.


Phase4 manual UI checkpoint (owner acceptance remains unchecked):

1. Configure the database/migrations and server auth/SMTP environment described
   above, start the app, and register a fresh address. Open the actual verification
   mail link. The browser removes its query/fragment immediately. Press **Verify
   email** explicitly; merely opening the page must not consume the token. Then
   sign in; registration and verification never sign in automatically.
2. Open `/verify-email` without a link and request another email. Unknown and known
   eligible addresses receive the same generic feedback. Missing, expired and used
   links provide a retry path. Tokens remain only in the open page's memory: after
   reloading or navigating away, reopen the original email link or request a new
   one. Do not copy tokens into issue reports or screenshots.
3. Check `/account` shows your display name and every current role. Sign out, then
   revisit `/account`; it should return to `/login`. Mentor enrollment and admin
   controls are covered by the phase5 checkpoint below.
4. Sign in again, request recovery at `/forgot-password`, open the actual reset
   email, enter a replacement password and press **Change password**. Opening the
   link alone must do nothing. Success asks you to sign in; all old sessions and
   the old password must stop working. Sign in with the replacement password.
   Reusing the reset link should show safe retry guidance.
5. Repeat with keyboard navigation and a narrow mobile viewport. Labels, focused
   invalid fields, pending controls and errors should remain usable. Verify that
   the GitHub button only says it will be implemented soon.

P4.2 local lint, typecheck and112 unit tests with100% line/statement/function/branch
coverage passed. The final default production build passed. Full disposable PostgreSQL/SMTP/production HTTP/native HTTPS browser and installer
integration passed. Parent reviewed verification, reset and account screenshots at
desktop and320px widths without visual issues or token disclosure. No owner manual acceptance, CI or clean audit is implied.

### Roles and first administrator (phase 5)

Register and verify the operator's account first. After login, open `/api/auth/session` in the same browser and use its `data.id`
UUID. The bootstrap command accepts
only that existing verified user UUID; it never accepts a password or creates a user.
From the repository root, load the same database setting used by the app, then run:

```sh
set -a
source packages/app/.env.local
set +a
npm run auth:bootstrap-admin -- YOUR_EXISTING_VERIFIED_USER_UUID
```

Keep environment files private. Bootstrap grants administrator only while no other
administrator exists. Repeating it for the same already-administrator user succeeds;
a different user is refused. Later grants go through an authenticated administrator.
No bootstrap was run against your development accounts automatically.

`POST /api/users/me/mentor` with the session cookie, `X-DevMentor-CSRF: 1` and an empty
JSON object enrolls a verified developer as mentor idempotently. It accepts no user
ID or role input. Session reads show current memberships immediately; login again
is unnecessary. Developer remains the baseline membership. Administrator changes
serialize with bootstrap and protect the last **verified** administrator: granting
administrator to an unverified user cannot remove the last administrator able to
sign in. GitHub remains a coming-soon button. Admin screens follow in P5.3.


Administrator API (P5.2): `GET /api/admin/users?page=1&pageSize=20&q=search`
returns `{items,page,pageSize,total}` inside the standard `data` envelope. Page is
1–10000; pageSize is 1–100 (default20). Search is trimmed, case-insensitive,
limited to100 characters and matches literal email/display-name text, including
literal `%` and `_`. Results use creation time then UUID ordering. Each item
contains only id, displayName, email, emailVerifiedAt, roles and createdAt.
Unknown or repeated query keys are rejected. Only current verified administrators
may list users; other sessions return403 and anonymous requests return401.

`PUT /api/admin/users/USER_UUID/roles` requires the session cookie and
`X-DevMentor-CSRF: 1`, with exactly
`{"mentor":true,"administrator":false}` (choose both desired boolean values).
It returns current roles; developer is preserved. The last verified administrator
cannot be removed (409). Existing cookies observe grants/revocations immediately.
The service rechecks persisted administrator membership inside its transaction;
client identity/role fields cannot authorize an operation. Both endpoints use
`Cache-Control: no-store`. The admin browser checklist follows below.

### Phase 5 manual browser checkpoint

1. Run the existing local database, Mailpit and development app as described above.
   After installing the Next.js 16.4.2 security patch, restart `npm run dev` so the
   running process uses the updated framework.
   Register and verify two accounts; sign in to each. Registration requires email
   verification before login. Keep GitHub as its coming-soon button.
2. On `/account`, choose **Become a mentor**. The refreshed role list should include
   mentor and the enrollment button should disappear. Sign out and back in to check
   persistence. A developer or mentor opening `/admin` or `/admin/users` sees
   **Access denied**; a signed-out visitor goes to `/login`.
3. To bootstrap the first administrator, sign in as your verified operator account.
   Open `/api/auth/session` in the same browser and copy `data.id`. In the configured
   terminal run `npm run auth:bootstrap-admin -- YOUR_EXISTING_VERIFIED_USER_UUID`.
   This changes only that existing account; the implementation never runs it for you.
   If an administrator already exists, use its authenticated role controls instead.
4. Refresh `/account`, choose **Manage users**, and confirm `/admin` redirects to
   `/admin/users`. Search by email or display name, try an empty result, and use
   Previous/Next when more than 20 accounts exist. Verify the table can scroll
   horizontally on a narrow screen without making the whole page overflow.
5. Grant and revoke mentor/administrator on your second account using **Save roles**.
   Developer remains enabled. Sign in as that account and confirm its current
   memberships control administration access immediately. Test invalid/outage
   feedback only against accounts and infrastructure you own.
6. With only one verified administrator remaining, try removing its administrator
   checkbox and save: the last-administrator error should appear and access remains.
   Grant the second verified account administrator, then demote the current account:
   the private table disappears and subsequent admin visits are denied. Keep the
   second administrator available so you can restore the intended operator roles.

The owner manual checkpoint is pending. Phase 6 final security review is separate;
these instructions do not claim CI, a clean dependency audit or final acceptance.

For a focused disposable administration regression after a production build, run
`npm run test:integration -- --scenario=admin`. It retains the owned database,
migrations, application and HTTPS/browser setup and cleanup, and skips unrelated
authentication SMTP/browser and installer scenarios. It does not replace the full
`npm run test:integration` validation gate. Unknown options are rejected.
