import { randomUUID } from "node:crypto";
import type { InvitationRepository, InvitationResult } from "@devmentor/db";
import { AppError, ConflictError, ForbiddenError, NotFoundError, ServiceUnavailableError, UnauthorizedError, ValidationError } from "../../http/errors";
import { invitationCreateSchema, invitationIdSchema, invitationTokenSchema } from "../../validators/invitations/invitation.schema";
import { readEnv } from "../../config/env";
import { hashToken, mintOpaqueToken } from "./token.service";

type Store = Pick<InvitationRepository, "create" | "lookup" | "accept" | "change" | "onboarding" | "identity">;
export class InvitationService {
  constructor(private readonly repository: Store, private readonly clock: () => Date = () => new Date(), private readonly settings = readEnv, private readonly emit: (event: "invitations.invitation.accepted") => void = () => undefined) {}
  private async available<T>(work: () => Promise<T>) {
    try { return await work(); }
    catch (error) { if (error instanceof AppError) throw error; throw new ServiceUnavailableError(); }
  }
  private requireResult(result: InvitationResult) {
    if (result === "not-found") throw new NotFoundError("This invitation is not valid.");
    if (result === "forbidden") throw new ForbiddenError("Sign in with the matching verified email address.");
    if (result === "conflict") throw new ConflictError("An invitation or mentor membership already exists.");
  }
  async create(input: unknown) {
    const parsed = invitationCreateSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError();
    const token = mintOpaqueToken(); const now = this.clock();
    const id = randomUUID(); const expiresAt = new Date(now.getTime() + this.settings().INVITATION_TTL_DAYS * 86400000);
    this.requireResult(await this.available(() => this.repository.create({ id, ...parsed.data, tokenHash: hashToken(token), createdAt: now, expiresAt })));
    return { id, token };
  }
  async lookup(input: unknown) {
    const parsed = invitationTokenSchema.safeParse(input);
    if (!parsed.success) throw new NotFoundError("This invitation is not valid.");
    const result = await this.available(() => this.repository.lookup(hashToken(parsed.data), this.clock()));
    if (!result) throw new NotFoundError("This invitation is not valid.");
    return result;
  }
  async accept(actorId: string | null, input: unknown) {
    if (!actorId) throw new UnauthorizedError();
    const actor = invitationIdSchema.safeParse(actorId); const token = invitationTokenSchema.safeParse(input);
    if (!actor.success) throw new UnauthorizedError();
    if (!token.success) throw new NotFoundError("This invitation is not valid.");
    const now = this.clock(); const dueAt = new Date(now.getTime() + this.settings().MENTOR_PUBLISH_WINDOW_DAYS * 86400000);
    this.requireResult(await this.available(() => this.repository.accept(actor.data, hashToken(token.data), now, dueAt)));
    this.emit("invitations.invitation.accepted");
    return { publishDueAt: dueAt.toISOString() };
  }
  async change(input: unknown, resend: boolean) {
    const parsed = invitationIdSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError();
    const now = this.clock(); const token = resend ? mintOpaqueToken() : null;
    const rotation = token ? { tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + this.settings().INVITATION_TTL_DAYS * 86400000) } : undefined;
    this.requireResult(await this.available(() => this.repository.change(parsed.data, now, rotation)));
    return { id: parsed.data, token };
  }
  async identity(actorId: string) { return this.available(() => this.repository.identity(actorId)); }
  async onboarding(actorId: string | null) {
    if (!actorId) throw new UnauthorizedError();
    const result = await this.available(() => this.repository.onboarding(actorId));
    if (!result) throw new ForbiddenError();
    return result;
  }
}
