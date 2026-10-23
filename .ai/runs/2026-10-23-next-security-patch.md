# Next.js security patch — 2026-10-23

## Goal and authorization

The owner approved S1 as a separately committed task after issue #4 phase 5.
Keep [users/auth scope](../specs/2026-10-16-users-auth-application-primitives.md),
GitHub coming-soon behavior and the pending manual checkpoint unchanged.

## Evidence and plan

Next16.4.0 is affected by the upstream critical advisories
[SVG image optimization](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw)
and [typed-array cache functions](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr).
Both identify16.4.1 as patched; this records package exposure, not demonstrated
application exploitation. Existing audit proposed16.4.2. Official Vercel
[Next manifest](https://raw.githubusercontent.com/vercel/next.js/v16.4.2/packages/next/package.json)
and [ESLint manifest](https://raw.githubusercontent.com/vercel/next.js/v16.4.2/packages/eslint-config-next/package.json)
confirm compatible Node>=20.9, React19, ESLint>=9 and TypeScript>=3.3.1.
Registry web access was unavailable; an earlier sandbox npm query stalled and the
escalated query was aborted without metadata. Targeted approved installs succeeded.

Plan: exact matching Next/ESLint16.4.2 pins, inspect lockfile, lint/typecheck/full
coverage, then parent production build/audit/full disposable integration. Commit
separately and pause for owner testing; phase6 stays pending.

## Changes and progress

- Upgraded `next` and both root/app `eslint-config-next` pins from16.4.0 to16.4.2.
- Lockfile changes are limited to those packages and matching `@next/env`, ESLint
  plugin and optional platform SWC packages; React and unrelated packages unchanged.
- Installed `sharp` is0.35.5; patched Next requires^0.35.5.
- Read installed Next upgrade guides before and after install; no app migration
  was required. No production TypeScript or configuration behavior changed.
- README manual instructions require restarting the existing development server.
  No developer server, database or account was changed.
- Install audit snapshot:11 findings,6 high/5 moderate, no critical. This is not
  a clean audit or substitute for the parent's final audit.

## Validation and outcome

Lint and typecheck passed. Elevated full coverage session4931 passed128 tests:
100% statements1412/1412, branches830/830, functions360/360, lines1041/1041.
Diff whitespace check passed. Dependencies and all source are frozen for parent
production build/audit/full integration. Separate commit remains pending. Owner
acceptance and phase6 remain unchecked.


S1 parent gates: production build82327 passed on Next16.4.2 without the prior security notice. Final npm audit exited1 with0 critical,6 high and5 moderate findings (11total), with no Next advisory. Remaining findings include an Awilix/glob production dependency path, so they are not characterized as tooling-only. No clean audit is claimed and unrelated upgrades remain outside S1. Full disposable integration23294 is running; source/dependencies remain frozen. S1 and owner acceptance remain unchecked pending full integration and separate commit.


S1 final verification: full disposable integration23294 passed exit0, including PostgreSQL, SMTP/HTTP, authentication and administration HTTPS browser scenarios, installer fresh-start/reuse and owned-resource cleanup. The earlier installer failure did not recur; its cause was not established, and no causal claim about the patch is made. Parent production build82327 passed. Lint/typecheck and128 tests passed with100% statements/branches/functions/lines. Final audit exited1 with0 critical/6 high/5 moderate findings and no Next advisory; a clean audit and CI pass are not claimed.

All phase5 implementation tasks are complete in separate commits: P5.1 ab3b3b1, P5.2 5d8a8a7, P5.3 09beae4. S1 is verified and completed with this separate commit. Stop for owner manual testing using the [README checkpoint](../../README.md#phase-5-manual-browser-checkpoint); restart npm run dev to load Next16.4.2. Owner acceptance remains unchecked, GitHub Auth remains coming-soon, and phase6 remains pending.
