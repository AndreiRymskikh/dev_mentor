import type { PublicMentorProfile, OwnerMentorProfile } from "../../domain/mentor-profile";
import { SlugCollisionError, type MentorProfileRepository, type MentorProfileRecord } from "@devmentor/db";
import { z } from "zod";
import { AppError, ConflictError, ForbiddenError, NotFoundError, ServiceUnavailableError, UnauthorizedError, ValidationError } from "../../http/errors";
import { userIdSchema } from "../../validators/users/roles.schema";
import { mentorProfileUpdateSchema, mentorSlugSchema } from "../../validators/mentors/mentor-profile-update.schema";
import { uniqueSlug } from "../../domain/slug";
import { mentorPagePublishable } from "./readiness";
export function toPublicDto(profile:MentorProfileRecord):PublicMentorProfile {return {displayName:profile.displayName,publicWorkUrl:profile.publicWorkUrl,bio:profile.bio,stackTags:[...profile.stackTags],slug:profile.slug};}
export function toOwnerDto(profile:MentorProfileRecord):OwnerMentorProfile {return {...toPublicDto(profile),publishedAt:profile.publishedAt?.toISOString()??null,readiness:mentorPagePublishable.evaluate(profile)};}
export class MentorProfileService {
  constructor(private readonly repository:Pick<MentorProfileRepository,"read"|"mutate"|"publicBySlug">,private readonly clock:()=>Date=()=>new Date(),private readonly emit:(event:"mentors.profile.published")=>void=()=>undefined) {}
  private actor(input:string|null) {const result=userIdSchema.safeParse(input);if(!result.success)throw new UnauthorizedError();return result.data;}
  private async available<T>(work:()=>Promise<T>) {try{return await work();}catch(error){if(error instanceof AppError)throw error;throw new ServiceUnavailableError();}}
  private owned(profile:MentorProfileRecord|null) {if(!profile)throw new ForbiddenError();return toOwnerDto(profile);}
  async getMine(actorId:string|null) {const actor=this.actor(actorId);return this.owned(await this.available(()=>this.repository.read(actor)));}
  async update(actorId:string|null,input:unknown) {
    const actor=this.actor(actorId),parsed=mentorProfileUpdateSchema.safeParse(input);if(!parsed.success)throw new ValidationError("Check your profile fields.",z.flattenError(parsed.error).fieldErrors);
    return this.owned(await this.available(()=>this.repository.mutate(actor,profile=>{
      if(parsed.data.publicWorkUrl!==undefined)profile.publicWorkUrl=parsed.data.publicWorkUrl||null;
      if(parsed.data.bio!==undefined)profile.bio=parsed.data.bio||null;
      if(parsed.data.stackTags!==undefined)profile.stackTags=parsed.data.stackTags;
      if(profile.publishedAt)mentorPagePublishable.assert(profile);
    })));
  }
  async publish(actorId:string|null) {
    const actor=this.actor(actorId);
    for(let attempt=0;attempt<100;attempt++) {
      try{let transitioned=false;const dto=this.owned(await this.repository.mutate(actor,profile=>{
        mentorPagePublishable.assert(profile);transitioned=profile.publishedAt===null;profile.slug??=uniqueSlug(profile.displayName,attempt);profile.publishedAt??=this.clock();
      }));if(transitioned){try{this.emit("mentors.profile.published");}catch{
        // Observers are best effort; the publication transaction has already committed.
        return dto;
      }}return dto;}catch(error){if(error instanceof SlugCollisionError)continue;if(error instanceof AppError)throw error;throw new ServiceUnavailableError();}
    }
    throw new ConflictError("Unable to allocate a share link. Please try publishing again.");
  }
  async unpublish(actorId:string|null) {const actor=this.actor(actorId);return this.owned(await this.available(()=>this.repository.mutate(actor,profile=>{profile.publishedAt=null;})));}
  async getPublicBySlug(input:unknown) {
    const parsed=mentorSlugSchema.safeParse(input);if(!parsed.success)throw new NotFoundError();const profile=await this.available(()=>this.repository.publicBySlug(parsed.data));if(!profile)throw new NotFoundError();return toPublicDto(profile);
  }
}
