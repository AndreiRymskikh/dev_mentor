# Users/auth implementation

## Goal
Implement [spec](../specs/2026-10-16-users-auth-application-primitives.md) using a subagent and separate commit per task. Owner defers GitHub auth to a coming-soon button and requires a manual checkpoint after each phase.

## Plan and acceptance
See [tracker](../../track.md). Deliver database foundation, registration/email, credentials, UI, administration, final review in sequence. Preserve boundaries and lazy persistence. Require meaningful 100% unit coverage, lint/typecheck/audit/build and relevant disposable PostgreSQL/mail/browser checks. Never reset developer data. Pause after phase 1 for manual testing.

## Inspection and progress
Read spec, engineering standards, compatibility contract, lessons index and Storybook lesson. DB currently has type contracts only; reuse existing HTTP/UI/DI helpers. Existing untracked `.ai/prototypes/`, `.ai/runs/2026-10-20-accounts-screen-map.md` and `lekcja-07/` are outside scope.

Created tracker before implementation. No checks or implementation claimed yet.

## Risks
Security-sensitive transactions/schema need independent review before final acceptance. Disposable email tests cannot establish production SMTP delivery. Do not implement deferred GitHub protocol or speculative abstractions.

## P1.1 — Database runtime

Parent review: diff whitespace clean, runtime/config/tests inspected. Alternate documented `npm run build --workspace @devmentor/app -- --webpack` passed production compilation, TypeScript and static generation. Default Turbopack restriction remains recorded. Task committed with this update; proceed to P1.2.

Implemented `packages/db/src/config.ts`, `runtime.ts` and exports, exact database workspace dependency pins and lockfile, and `tests/db.test.ts`. Preserved the existing `Repository` type contract and made no app changes. ORM initialization, request forks, transaction callbacks, shutdown deduplication and failure/retry are explicit; request cleanup clears its identity map and never closes the process pool. Configuration reads DATABASE_URL lazily, rejects malformed/non-PostgreSQL URLs without echoing input, disables ORM diagnostic logging and bounds the pool to 0–10. Entity registration is intentionally empty until P1.2 adds the first real schemas.

Registry verification selected mutually matching `@mikro-orm/core`, `postgresql`, `migrations`, and `cli` 7.2.5 (Node >=22.17, compatible with project >=24); no existing package was upgraded. Primary references: [quick start](https://mikro-orm.io/docs/quick-start), [transactions](https://mikro-orm.io/docs/transactions), [configuration](https://mikro-orm.io/docs/configuration). Installed 7.2.5 implementation confirms `MikroORM.init` creates metadata/managers without connecting; removed obsolete `connect:false` configuration after typecheck caught its removal in v7.

Validation: `npm run lint` and `npm run typecheck` passed. `npm run test:coverage` passed with 60 tests and 100% statements/branches/functions/lines (477/477, 356/356, 117/117, 338/338). Initial sandbox-only test attempt failed existing localhost tests with EPERM; escalated rerun passed. Real installed ORM initialization and distinct manager forks run in unit tests without any reachable DB. No disposable database/schema checks claimed yet.

`npm audit` completed with six high-severity findings rooted in existing braces/micromatch → fast-glob → Awilix/Next lint dependencies; its suggested fix changes existing dependencies and was not applied. No ORM vulnerability was reported. `npm run build` attempted both sandboxed and escalated: sandbox initially could not fetch existing Google fonts; escalation reached Turbopack but still failed worker port binding with EPERM. Parent should rerun build in its available execution context. P1.1 awaits parent review/commit; P1.2 and phase checkpoint remain unfinished.
