# Lessons learned

Read this index before starting work and consult relevant linked lessons. Add durable findings after bug fixes or reusable discoveries; keep entries concise and avoid duplicates.

For each lesson, record the problem, root cause or supporting evidence, recommended practice, and relevant repository links. Put longer explanations in `lessons/<kebab-case-topic>.md` and link them here. Correct or retire outdated lessons. Never include secrets or sensitive data.

## Lesson index

- **Read raw cookies when duplicate rejection matters.** Installed Next's cookie store collapses duplicate names to the last value, so `cookies().getAll(name)` cannot reproduce the API's fail-closed duplicate handling. Server account authorization awaits raw `headers()` and reuses the same `readSessionCookie` parser as the API; test actual duplicate header text. See [phase4 run](runs/2026-10-21-users-auth-implementation.md).

- **Read actual bytes when an HTTP endpoint permits an empty body.** Production Next exposed a nonnull empty request stream, unlike the constructed unit Request, so logout rejected a real bodyless POST. Use bounded optional-empty parsing, require JSON for nonempty content, and never infer emptiness from Content-Length. Cover both an empty stream and production HTTP; see [phase3 run](runs/2026-10-21-users-auth-implementation.md).

- **Validate architectural assumptions against the actual tree.** The engineering spec assumed entities and admin screens that were absent. Apply the owner-approved dependency direction, then adapt moves to existing files; defer domain scaffolding until a real feature needs it. See [engineering adaptation](specs/2026-09-01-engineering-standards.md).
- **Test safe URL guards with legitimate query strings.** The first API helper rejected pagination queries while blocking traversal. Validate the pathname separately from the query; regression coverage lives in [API tests](../tests/api.test.ts).
- **Use the shared JSX configuration in monorepo tests.** Moving app tsconfig left root TSX tests without the automatic React JSX runtime. Explicitly point the runner at tsconfig.base.json and typecheck test sources. See [test configuration](../tests/tsconfig.json).

- **Keep shutdown commands independent of work cancellation.** Aborting setup must not cancel the Windows taskkill command used to stop its owned process tree. Use an uncancelled cleanup path and cover interruption plus forced shutdown in [runtime tests](../tests/setup-runtime.test.ts).

- **Extract primitives through feature delivery.** A proposed foundations-first spec risked making a candidate abstraction inventory mandatory before any working consumer existed. Require a concrete feature consumer and inspect existing helpers before adding a primitive; separate product/security decisions instead of bundling them into one approval. See [users/auth specification run](runs/2026-10-16-users-auth-primitives-spec.md).

- **Verify built Storybook pages, not only development stories.** Minified CSS, documentation-root themes and the manager bundler can differ from canvas tests. Check every built page, real theme controls, portals and console errors; see [Storybook foundation verification](lessons/storybook-foundation-verification.md).

- **Verify explicit MikroORM relation columns against migrations.** A `userId` relation defaults to `user_id_id` even with `mapToPk()`. Set `fieldName("user_id")`, prove actual ORM persist/read behavior, and assert an empty schema diff against the migration. Static migration lists disable automatic snapshots to keep disposable integration runs from writing repository artifacts. See [database integration](../tests/integration/database.ts).

- **Generic authentication bodies also need timing review.** Awaiting SMTP only for new accounts exposes account existence even with identical202 bodies. Registration uses a shared public completion window covering the bounded SMTP deadline and cleanup budget; test new/success/failure/stall and duplicate timings together. Database outage timing remains a documented limitation. See [phase2 run](runs/2026-10-21-users-auth-implementation.md).

- **Check framework request URL origins in the production process.** Installed Next16.4 canonicalized `Request.url` to localhost even when bound to127.0.0.1; origin checks based only on it rejected real requests. Registration validates a fixed server-configured `APP_ORIGIN` and passes it to the backwards-compatible CSRF guard; never infer the public origin from Host/forwarded headers. Production HTTP integration sends the configured public origin. See [phase2 run](runs/2026-10-21-users-auth-implementation.md).

- **Validate rendered CSS when changing build pipelines.** A successful Webpack fallback build and functional browser tests still emitted literal Tailwind @apply/@utility because only a Turbopack-specific loader existed. Use one supported PostCSS pipeline for both engines, test actual style compilation, and inspect computed layout/focus plus desktop/mobile screenshots. Removing the manual loader also made the previously failing default build pass; distinguish historical environment symptoms from the verified final pipeline. See [phase4 correction](runs/2026-10-21-users-auth-implementation.md).

- **Make registration acceptance a clear next-step screen.** Manual testing found the generic202 message below the unchanged form easy to miss, with sign-in below the fold. Replace the submitted form with a focused acceptance heading and visible verification-before-sign-in guidance and links; preserve identical generic feedback for every accepted response. Test removed password controls, focus, and visible desktop/mobile next steps. See [acceptance feedback correction](runs/2026-10-22-registration-acceptance-feedback.md).
