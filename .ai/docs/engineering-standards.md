# Engineering standards

The [source specification](../specs/2026-09-01-engineering-standards.md) owns the full naming table, rationale, security requirements and review checklist.

Dependencies: app → core → db; standalone ui consumed by app. ESLint and package manifests enforce this structure. Application routes use src/app. Matching plural concept folders are introduced only with a real entity/service/validator; no module runtime or auto-discovery.

Use core/http for API envelopes, typed errors, validation and fail-closed security checks. Use core/container for explicit Awilix registration and disposed request scopes. Only db may import MikroORM. Use ui/backend for client API calls, schema-driven forms, controlled tables and feedback. Pure core validators are imported by app client components and passed to forms; ui never imports core itself.

Database pooling/entities/migrations, real authentication, users admin screens and domain events remain feature/persistence work. The existing health endpoint proves the HTTP/DI boundary without a database. The server must build and boot without a reachable database.
