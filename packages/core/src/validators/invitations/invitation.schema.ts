import { z } from "zod";
import { StackTags } from "../../domain/vocabularies/stack-tags";
export const invitationCreateSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  stackTags: z.array(StackTags.schema).max(4).refine(tags => new Set(tags).size === tags.length),
}).strict();
export const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const invitationIdSchema = z.uuid().transform(value => value.toLowerCase());
