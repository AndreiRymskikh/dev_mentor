import type { RolesRepository, RoleChangeResult } from "@devmentor/db";
import { AppError, ConflictError, ForbiddenError, NotFoundError, ServiceUnavailableError, UnauthorizedError, ValidationError } from "../../http/errors";
import { desiredRolesSchema, mentorEnrollmentSchema, userIdSchema } from "../../validators/users/roles.schema";

export class RolesService {
  constructor(private readonly repository: Pick<RolesRepository, "enrollMentor" | "setRoles" | "bootstrap">) {}
  private async result(operation: () => Promise<RoleChangeResult>, conflictMessage: string) {
    try {
      const result = await operation();
      if (result.status === "forbidden") throw new ForbiddenError();
      if (result.status === "not-found") throw new NotFoundError();
      if (result.status === "conflict") throw new ConflictError(conflictMessage);
      return { roles: result.roles };
    } catch (error) { if (error instanceof AppError) throw error; throw new ServiceUnavailableError(); }
  }
  async enrollMentor(actorId: unknown, input: unknown) {
    const actor = userIdSchema.safeParse(actorId);
    if (!actor.success) throw new UnauthorizedError();
    if (!mentorEnrollmentSchema.safeParse(input).success) throw new ValidationError();
    return this.result(() => this.repository.enrollMentor(actor.data), "Membership could not be changed.");
  }
  async setRoles(actorId: unknown, targetId: unknown, input: unknown) {
    const actor = userIdSchema.safeParse(actorId);
    if (!actor.success) throw new UnauthorizedError();
    const target = userIdSchema.safeParse(targetId); const desired = desiredRolesSchema.safeParse(input);
    if (!target.success || !desired.success) throw new ValidationError();
    return this.result(() => this.repository.setRoles(actor.data, target.data, desired.data), "At least one verified administrator must remain.");
  }
  async bootstrap(userId: unknown) {
    const parsed = userIdSchema.safeParse(userId);
    if (!parsed.success) throw new ValidationError("Provide one existing verified user UUID.");
    return this.result(() => this.repository.bootstrap(parsed.data), "Administrator bootstrap already completed; use an authenticated administrator grant.");
  }
}
