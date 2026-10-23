import { z } from "zod";
export const adminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().toLowerCase().max(100).default(""),
}).strict();
