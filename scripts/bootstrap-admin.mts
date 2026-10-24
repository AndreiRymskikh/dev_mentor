import { database, RolesRepository } from "../packages/db/src/index";
import { RolesService } from "../packages/core/src/services/users/roles.service";
import { bootstrapAdmin } from "../packages/core/src/operators/bootstrap-admin";
try {
  process.exitCode = await bootstrapAdmin(process.argv.slice(2), new RolesService(new RolesRepository()), console.log);
} finally {
  try { await database.close(); }
  catch { console.error("Database cleanup failed."); process.exitCode = 1; }
}
