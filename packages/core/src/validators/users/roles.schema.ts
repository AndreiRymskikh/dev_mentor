import { z } from "zod";
export const userIdSchema = z.uuid().toLowerCase();
export const mentorEnrollmentSchema = z.object({}).strict();
export const desiredRolesSchema = z.object({ mentor: z.boolean(), administrator: z.boolean() }).strict();
