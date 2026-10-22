# Local registration setup repair

## Goal and scope

Resolve the owner's manual registration 503 after phase4 of issue #4. Related
specification: [users/auth](../specs/2026-10-16-users-auth-application-primitives.md).
This is local environment preparation; no phase5 or production source changes.

## Diagnosis

- The existing local PostgreSQL database accepted a read-only connection, but
  `users`, `action_tokens`, `rate_limit_buckets` and migration history were absent.
- The ignored application environment file was absent. The root environment held
  the database settings but no authentication, rate-limit or mail settings.
- Registration first accesses persisted rate limits, so the missing schema alone
  explains the safe 503. No bundler defect was established.

## Completed work

- Created the previously absent ignored `packages/app/.env.local` exclusively,
  preserving existing database credentials. Generated independent random JWT and
  rate-limit secrets and configured the existing loopback development mail sink.
- Applied the existing reviewed additive migration through `npm run db:migrate`;
  it exited successfully. Did not reset or delete database data.
- The owner's existing development server reloaded configuration without being
  stopped or replaced.
- Updated the README to make the migration and app environment prerequisites
  explicit before manual registration.

## Verification

- Read-only checks confirmed all four previously absent tables now exist.
- One synthetic registration returned HTTP202 in approximately15.1seconds.
- The local mail sink delivered its verification email; a read-only comparison
  confirmed the SHA256 digest of its fragment token matched an active database
  token. The token was not consumed.
- One synthetic account and its mail were retained. No existing user input was
  reused, and no users, messages or rate-limit buckets were deleted or cleared.
- An initial diagnostic POST used an incorrect CSRF header and returned403 before
  registration. The successful check used the application's actual CSRF header.
- No production TypeScript changed; lint, typecheck, unit coverage, audit, build
  and the disposable integration suite were not rerun for this setup/docs repair.

## Outcome

The owner can retry manual registration in the running app. Owner acceptance of
phase4 remains pending. Local secrets, connection values, addresses and tokens are
excluded from this record and the committed documentation.
