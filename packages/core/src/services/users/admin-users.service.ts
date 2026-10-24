import type { AdminUsersRepository } from "@devmentor/db";
import { AppError, ForbiddenError, ServiceUnavailableError, UnauthorizedError, ValidationError } from "../../http/errors";
import { adminListQuerySchema } from "../../validators/users/admin-list.schema";
import { userIdSchema } from "../../validators/users/roles.schema";
export class AdminUsersService {
  constructor(private readonly repository: Pick<AdminUsersRepository, "list">) {}
  async list(actorId: unknown, input: unknown) {
    const actor = userIdSchema.safeParse(actorId);
    if (!actor.success) throw new UnauthorizedError();
    const query = adminListQuerySchema.safeParse(input);
    if (!query.success) throw new ValidationError();
    try {
      const result = await this.repository.list(actor.data, query.data);
      if (!result) throw new ForbiddenError();
      return result;
    } catch (error) { if (error instanceof AppError) throw error; throw new ServiceUnavailableError(); }
  }
}
