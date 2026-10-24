import type { AuthMaintenanceRepository } from "@devmentor/db";
/** Operator-only entry: no HTTP exposure and no user-selected tables or cutoff. */
export async function maintainAuth(args: readonly string[], repository: Pick<AuthMaintenanceRepository, "removeExpired">, output: (message: string) => void): Promise<number> {
  if (args.length !== 0) { output("Usage: npm run auth:maintain (no arguments)"); return 1; }
  try {
    const counts = await repository.removeExpired();
    output(`Expired records removed: sessions=${counts.sessions}, tokens=${counts.tokens}, buckets=${counts.buckets}.`);
    return 0;
  } catch { output("Auth maintenance failed; no successful cleanup is confirmed."); return 1; }
}
