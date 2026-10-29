import { pathToFileURL } from "node:url";
import { withScope } from "../packages/core/src/container";
import { database } from "../packages/db/src";

export async function runInvite(args: readonly string[], output: (line: string) => void = console.log) {
  const [command, operator, target, ...tags] = args;
  if (!operator || !/^[a-zA-Z0-9_-]{1,64}$/.test(operator) || !target || !["create", "revoke", "resend"].includes(command) || (command !== "create" && tags.length)) throw new Error("Usage: npm run invite -- create|revoke|resend OPERATOR EMAIL_OR_UUID [STACK_TAGS...]");
  const origin = new URL(process.env.APP_ORIGIN ?? "");
  if (!["http:", "https:"].includes(origin.protocol) || origin.origin !== process.env.APP_ORIGIN) throw new Error("APP_ORIGIN must be a bare HTTP(S) origin.");
  const result = await withScope(({ invitationService }) => command === "create" ? invitationService.create({ email: target, stackTags: tags }) : invitationService.change(target, command === "resend"));
  output(`invitation.${command} operator=${operator} id=${result.id}`);
  if (result.token) output(`${origin.origin}/invitation/${result.token}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await runInvite(process.argv.slice(2)); }
  catch { console.error("Invitation command failed. Check arguments, configuration and invitation state."); process.exitCode = 1; }
  finally { try { await database.close(); } catch { console.error("Database cleanup failed."); process.exitCode = 1; } }
}
