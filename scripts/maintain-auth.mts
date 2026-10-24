import { database, AuthMaintenanceRepository } from "../packages/db/src/index";
import { maintainAuth } from "../packages/core/src/operators/maintain-auth";
try {
  process.exitCode = await maintainAuth(process.argv.slice(2), new AuthMaintenanceRepository(), console.log);
} finally {
  try { await database.close(); }
  catch { console.error("Database cleanup failed."); process.exitCode = 1; }
}
