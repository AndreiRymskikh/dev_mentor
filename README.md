# DevMentor

DevMentor is a TypeScript application built with Next.js and React. Its target architecture is a monorepo with reusable domain, persistence, and UI packages.

## Technology choices

- **Application:** latest stable, mutually compatible Next.js, React, and TypeScript releases. The repository's installed versions are recorded in `package.json` and `package-lock.json`; upgrades should verify compatibility.
- **Database:** PostgreSQL with MikroORM for TypeScript entities, data access, migrations, and connection pooling.
- **Dependency injection:** Awilix, with application composition and server container setup owned by the app package.
- **Frontend pages:** Tailwind CSS.
- **Backend/admin pages:** shadcn/ui components. Backend pages here refer to the administrative UI.

## Target package structure

```text
packages/
├── app/     # Main Next.js application and dependency composition
├── core/    # Reusable domain logic, contracts, and utilities
├── db/      # MikroORM entities, repositories, migrations, and database helpers
└── ui/      # Reusable React components and styles
```

`app` consumes `core`, `db`, and `ui`. The `db` and `ui` packages may depend on `core`; `core` stays independent of Next.js, UI, and persistence implementations. Shared code is consumed through package exports, with no circular dependencies.

Database access and the Awilix container stay on the server. Request-specific services and ORM entity managers use request scopes; database connection pooling is managed by the persistence layer. Database schema changes are captured in migrations under `packages/db`.

The package structure is planned. The current repository is a root-level Next.js starter with its routes in `app/`; PostgreSQL, MikroORM, Awilix, shadcn/ui, and workspace packages have not yet been configured.

## Local development

With dependencies installed:

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000). The current entry page is `app/page.tsx`.

Available verification commands:

```bash
npm run lint
npm run build
```

## Specifications and AI workflow

[AGENTS.md](AGENTS.md) defines the shared architecture and coding-agent rules; [CLAUDE.md](CLAUDE.md) imports them.

- `.ai/specs/YYYY-MM-DD-slug.md`: SDD specifications, moved to `implemented/` after verification or `archive/` when superseded or abandoned.
- `.ai/runs/YYYY-MM-DD-slug.md`: autonomous AI run plans, progress, decisions, and verification results.
- `.ai/lessons.md` and `.ai/lessons/`: durable findings and prevention rules recorded after corrections and bug fixes.
