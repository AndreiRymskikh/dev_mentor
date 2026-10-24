import type { RolesService } from "../services/users/roles.service";
import { AppError } from "../http/errors";
export async function bootstrapAdmin(args: readonly string[], service: Pick<RolesService, "bootstrap">, output: (message: string) => void): Promise<number> {
  if (args.length !== 1) { output("Usage: npm run auth:bootstrap-admin -- <existing-verified-user-uuid>"); return 1; }
  try { await service.bootstrap(args[0]); output("Administrator membership confirmed."); return 0; }
  catch (error) { output(error instanceof AppError ? error.message : "Service temporarily unavailable"); return 1; }
}
