# Profile validation correction

Goal: allow publication without a public work URL; replace profile readiness checklist with red inline required-field errors.

Spec: [mentor page](../specs/implemented/2026-09-08-mentor-page.md). User request supersedes its historical three-field publication rule.

Plan: correct shared server readiness; remove checklist; reuse form error handling and theme-aware red styles; add service/UI regressions; run lint, typecheck, coverage, audit, build and profile integration/browser checks.

Progress: server requires only description and topics; drafts remain partial; provided URLs still validate. Inline fields/checkboxes use red borders and messages. The description is labelled required, with publication-specific guidance; incomplete drafts still save.

Changed files: core mentor readiness, app ProfileEditor, shared CrudForm multiselect feedback, controls/tokens CSS, service/UI/browser regression tests, mentor-page spec and lessons index.

Validation: lint and workspace/test typecheck passed. All 224 unit tests passed with 100% statements, lines, functions and branches across the covered tree. Production build passed. Targeted profiles integration passed (disposable PostgreSQL migrations/repositories, invitation HTTP/browser, profile HTTP/browser, partial drafts, empty-link publication, published edits, light/dark computed error colors, responsive screenshots). Inspected required-error screenshots in both themes. Final label-only correction was rechecked with lint, full coverage and production build/typecheck. Diff whitespace check passed. Sandbox localhost restrictions required elevated coverage/build retries.

Audit completed: 16 moderate dependency vulnerabilities in existing glob/minimatch tooling chains; dependency upgrades are outside this correction. No clean audit or GitHub CI result is claimed. No commit/PR requested or created.

Outcome: requested changes implemented locally; no implementation blockers remain.
