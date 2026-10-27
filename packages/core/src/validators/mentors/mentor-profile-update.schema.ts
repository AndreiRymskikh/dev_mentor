import { z } from "zod";
import { StackTags } from "../../domain/vocabularies/stack-tags";
export const mentorProfileUpdateSchema=z.object({
  publicWorkUrl:z.union([z.literal(""),z.url().max(2048).refine(value=>/^https?:\/\//.test(value),"Use an HTTP or HTTPS URL.")]).optional(),
  bio:z.string().trim().max(2000).optional(),
  stackTags:z.array(StackTags.schema).max(4).refine(values=>new Set(values).size===values.length,"Choose each tag once.").optional(),
}).strict();
export const mentorSlugSchema=z.string().min(1).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
