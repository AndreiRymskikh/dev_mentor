import { defineEntity, p } from "@mikro-orm/postgresql";
import type { MentorDetails } from "../../repositories/mentors/mentor-details.repository";
import { User } from "../users/user.entity";

export const MentorProfile = defineEntity({
  name: "MentorProfile",
  tableName: "mentor_profiles",
  checks: [
    { name: "mentor_profiles_published_slug_check", expression: "published_at is null or slug is not null" },
    { name: "mentor_profiles_stack_tags_check", expression: "stack_tags <@ ARRAY['typescript','react','python','ai-agents']::text[] and array_position(stack_tags, null) is null" },
  ],
  properties: {
    sessionLanguage: p.string().length(35).nullable(),
    mentorTimeZone: p.string().length(100).nullable(),
    helpTopics: p.json<MentorDetails["helpTopics"]>().default([]),
    sampleAnswer: p.json<NonNullable<MentorDetails["sampleAnswer"]>>().nullable(),
    sessionSteps: p.json<MentorDetails["sessionSteps"]>().default([]),
    publicWorkUrl: p.text().nullable(),
    bio: p.text().nullable(),
    stackTags: p.array<string>().default([]),
    slug: p.string().length(60).unique().nullable(),
    publishedAt: p.datetime().nullable(),
    userId: p.manyToOne(User).fieldName("user_id").mapToPk().primary().deleteRule("restrict"),
    initialPublishDueAt: p.datetime().nullable(),
  },
});
