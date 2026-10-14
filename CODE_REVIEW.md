# Code review

Apply the [engineering standards](.ai/specs/2026-09-01-engineering-standards.md), including its security and correctness checklist.

- Enforce app → core → db and standalone UI; ORM imports only in db. Keep domain rules out of routes and presentation out of services.
- Reuse HTTP/API/UI foundations and explicit Zod schemas. Check authorization, ownership, CSRF, safe error envelopes and secret redaction.
- Introduce only the concept folders needed by actual files; register DI bindings explicitly and dispose request scopes.
- Test changed behavior and failure cases; use integration tests for transactions and concurrency. Run lint, typecheck, tests, dependency audit and production build. Report unavailable checks and unresolved advisories.
- Authentication features require the spec's hashing, secret, cookie, lifetime and brute-force controls. Payment/booking changes require server-computed prices, idempotency and race-safe persistence.

- Every production TypeScript change requires meaningful unit tests with 100% per-file lines/statements/functions/branches. No coverage exclusions or lowered thresholds. Verify all four PR CI jobs, including disposable PostgreSQL and agent-browser scenarios.
