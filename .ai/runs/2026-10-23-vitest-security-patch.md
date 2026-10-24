# Vitest security patch — 2026-10-23

## Goal and scope

Owner-approved S2 follow-up during [users/auth implementation](2026-10-21-users-auth-implementation.md): patch the affected Vitest browser test server without unrelated dependency upgrades. GitHub Auth remains coming-soon; owner final acceptance stays pending.

## Plan and implementation

- Exact-pin root `vitest` and `@vitest/coverage-v8`, plus UI `@vitest/browser` and `@vitest/browser-playwright`, to5.0.5.
- Preserve Next16.4.2, React19.3.0 and Storybook's compatible separate runner4.1.11.
- Inspect published compatibility, actual installed versions and targeted lock changes; run lint, typecheck, full coverage and native Storybook tests in both themes. Parent owns build, audit and full application integration evidence.

The [maintainer advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-p458-7748-mcp3) identifies5.0.5 as patched. It concerns running Vitest HTTP/UI/browser servers; this repository's multi-project Storybook browser tests make it relevant. The [official5.0.5 manifest](https://github.com/vitest-dev/vitest/blob/v5.0.5/packages/vitest/package.json) supports Node `^22.12.0 || ^24.0.0 || >=26.0.0` and Vite8, covering CI24 and host26.11.1.

Changed dependency records are limited to nine existing Vitest-family packages moving5.0.4→5.0.5 and the matching four direct pins. All resolved HTTP URLs remain on `registry.npmjs.org`; no new dependency or unrelated version change is retained.

## Resolver evidence

The first install rejected the existing exact5.0.4 peer cycle. A bounded refresh removed only those nine old Vitest lock records. npm12.2.0 then refused an unchanged optional Tailwind registry tarball while generating lock metadata. After checking that manifests had no URL dependencies and all lock URLs used the official registry, parent authorized a command-scoped lock-only metadata refresh with scripts ignored; no npm configuration or installation security policy was persisted. Incidental optional wasm child records were removed before normal-policy installation.

A normal install reported success but left actual packages at5.0.4. The nine old package directories and hidden installation lock were moved reversibly to an owned temporary backup; a subsequent normal-policy install installed5.0.5. Actual package manifests confirm Vitest, coverage, browser, browser-playwright and UI5.0.5, with runner4.1.11/Next16.4.2/React19.3.0 unchanged. No broad remote-policy override was used for installation, no force/legacy peer bypass was used, and unrelated directories were preserved.

## Validation and handoff

- Post-install lint48350 and typecheck66912 passed (exit0).
- Parent full coverage passed on actual Vitest5.0.5:131 tests,100% statements/branches/functions/lines (1435/833/364/1059). An earlier5.0.4 run is not patch verification.
- Parent both-theme native Storybook browser suite25246 passed:30 files,92 tests (exit0).
- Parent production build49676 passed (exit0). Final audit45346 exited1 with zero critical, zero moderate and six high findings in the braces dependency chain; no clean audit is claimed.
- Full application integration after this patch remains pending under P6.2 after its QA hook; P6.1 integration83907 passed before this patch and is not claimed as patch integration evidence.
- S2 implementation and its patch checks are complete and ready for the parent separate commit. Production/dependency source remains frozen. P6.2 final application integration, independent review and owner manual acceptance remain pending; no CI pass is claimed.
