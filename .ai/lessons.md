# Lessons learned

Read this index before starting work and consult relevant linked lessons. Add durable findings after bug fixes or reusable discoveries; keep entries concise and avoid duplicates.

For each lesson, record the problem, root cause or supporting evidence, recommended practice, and relevant repository links. Put longer explanations in `lessons/<kebab-case-topic>.md` and link them here. Correct or retire outdated lessons. Never include secrets or sensitive data.

## Lesson index

- **Validate architectural assumptions against the actual tree.** The engineering spec assumed entities and admin screens that were absent. Apply the owner-approved dependency direction, then adapt moves to existing files; defer domain scaffolding until a real feature needs it. See [engineering adaptation](specs/2026-09-01-engineering-standards.md).
- **Test safe URL guards with legitimate query strings.** The first API helper rejected pagination queries while blocking traversal. Validate the pathname separately from the query; regression coverage lives in [API tests](../tests/api.test.ts).
- **Use the shared JSX configuration in monorepo tests.** Moving app tsconfig left root TSX tests without the automatic React JSX runtime. Explicitly point the runner at tsconfig.base.json and typecheck test sources. See [test configuration](../tests/tsconfig.json).
