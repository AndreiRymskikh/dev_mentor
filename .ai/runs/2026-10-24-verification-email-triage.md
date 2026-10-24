# Missing local verification email triage — 2026-10-24

## Goal and checks

Investigate the owner's missing Mailpit verification email without exposing credentials, tokens or personal account details. Check container health, sanitized app configuration, mailbox counts and the supplied account's verification state before changing SMTP or authentication behavior.

## Evidence and outcome

- Local Mailpit and PostgreSQL containers were healthy. Mailpit's local API returned zero messages.
- Sanitized configuration checks confirmed the development-only local SMTP sink, loopback SMTP port1025, matching database configuration, configured sender and valid secret lengths; no secret values were printed.
- The account supplied by the owner already existed, was verified and had a password credential. It had no active verification token.
- Source inspection confirmed that duplicate registration does not resend verification or replace credentials; verification resend also does not issue a token for an already-verified account. Generic acceptance remains intentional.
- No application, environment, database or mailbox changes were needed. The owner can sign in with the original password, or explicitly use password recovery if it is forgotten. A newly submitted registration password does not replace the original.
- Browser observation was denied by browser policy; no alternate browser or indirect page-reading workaround was attempted. Diagnosis used independently authorized service-side configuration and account-state checks.

No production code changed and no verification/reset email was sent. Unit/build/integration suites were not rerun for this read-only diagnosis. Metadata diff whitespace was checked. Personal account identifiers are intentionally omitted.

## Follow-up: existing unverified account

The owner confirmed password recovery worked and supplied a different account for the registration test. Parameterized read-only lookup showed that this account also already existed, but was unverified with no active verification token. It was therefore a duplicate registration, not a newly created account; the original credential remains unchanged.

Requested a new verification email through the normal local `/api/auth/verification/request` endpoint with its required CSRF header and origin. The endpoint returned202 with success. A Mailpit metadata-only check confirmed a matching verification message arrived; no token or message body was read or logged. The owner must open the email and complete verification manually. No verification confirmation, password change, account creation or database repair was performed.

Use a never-registered address to exercise first-time registration, or the verification resend flow to reuse an unverified account. No production change was needed. Checks were the actual resend response, local mailbox receipt and metadata diff whitespace; unit/build/integration suites were not rerun for this operational diagnosis.
