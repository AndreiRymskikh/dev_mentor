/** Public registration waits out the full delivery budget, including duplicate accounts. */
export const EMAIL_DELIVERY_TIMEOUT_MS = 10_000;
export const REGISTRATION_RESPONSE_WINDOW_MS = EMAIL_DELIVERY_TIMEOUT_MS + 5000;
