export function LoadingMessage({ message = "Loading…" }: { message?: string }) { return <p role="status" aria-live="polite">{message}</p>; }
