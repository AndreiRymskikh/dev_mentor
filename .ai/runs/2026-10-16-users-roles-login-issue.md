# Users, roles and login issue

## Goal and plan
Capture the requested module, check duplicates and partial specifications, and create a tracker issue without implementation.

## Progress and decisions
- Read lessons, pipeline configuration, tracker descriptor, engineering standards, compatibility contract and product brief.
- Open issue searches for login, roles and users and the open PR list returned no matches.
- Owner confirmed developer/mentor/administrator roles, multiple roles per user, public email/password or GitHub registration, and administrator-only administrator grants.
- Engineering standards partially cover security; the issue records the precise additional feature-design work and superseding roles requirement.
- Created [issue #4](https://github.com/AndreiRymskikh/dev_mentor/issues/4). No production files changed.
- Configured feature, priority-medium and risk-high labels are absent; application skipped rather than substituting labels.

## Validation and outcome
Reviewed issue content against actual auth/container/db entry points and protected contracts. Updated links and pickup command. No lint, build, tests or audit run: tracker/documentation task only. No feature spec PR created because the existing engineering spec partially covers the request; detailed role/identity design remains required before implementation.

## Changed files
- This required run log.

## Subsequent clarification — 2026-10-16
This is a historical issue-creation log, not a feature specification or design approval. Partial coverage by engineering standards leaves identity, authorization, session and recovery design incomplete. The owner subsequently requested the [feature specification](../specs/2026-10-16-users-auth-application-primitives.md), accepted its review recommendations and explicitly reconfirmed multiple simultaneous roles per user.
