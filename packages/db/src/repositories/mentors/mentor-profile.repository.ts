import { LockMode, UniqueConstraintViolationException } from "@mikro-orm/postgresql";
import { database } from "../../runtime";
import { User } from "../../entities/users/user.entity";
import { UserRole } from "../../entities/users/user-role.entity";
import { MentorProfile } from "../../entities/mentors/mentor-profile.entity";
export interface MentorProfileRecord { userId: string; displayName: string; publicWorkUrl: string | null; bio: string | null; stackTags: string[]; slug: string | null; publishedAt: Date | null }
export type PublicMentorProfileRecord=Pick<MentorProfileRecord,"displayName"|"publicWorkUrl"|"bio"|"stackTags"|"slug">;
export class SlugCollisionError extends Error {}
export class MentorProfileRepository {
  constructor(private readonly runtime=database) {}
  async read(userId:string):Promise<MentorProfileRecord|null> {
    return this.runtime.withEntityManager(async em=>{
      const user=await em.findOne(User,{id:userId,emailVerifiedAt:{$ne:null}});
      if(!user || !await em.findOne(UserRole,{userId,role:"mentor"}))return null;
      const profile=await em.findOne(MentorProfile,{userId});
      return {userId,displayName:user.displayName,publicWorkUrl:profile?.publicWorkUrl??null,bio:profile?.bio??null,stackTags:profile?.stackTags??[],slug:profile?.slug??null,publishedAt:profile?.publishedAt??null};
    });
  }
  async mutate(userId:string,work:(profile:MentorProfileRecord)=>void):Promise<MentorProfileRecord|null> {
    try{return await this.runtime.transaction(async em=>{
      const user=await em.findOne(User,{id:userId},{lockMode:LockMode.PESSIMISTIC_WRITE});
      if(!user?.emailVerifiedAt || !await em.findOne(UserRole,{userId,role:"mentor"}))return null;
      let profile=await em.findOne(MentorProfile,{userId},{lockMode:LockMode.PESSIMISTIC_WRITE});
      if(!profile)profile=em.create(MentorProfile,{userId,stackTags:[]});
      const record:MentorProfileRecord={userId,displayName:user.displayName,publicWorkUrl:profile.publicWorkUrl??null,bio:profile.bio??null,stackTags:profile.stackTags,slug:profile.slug??null,publishedAt:profile.publishedAt??null};
      work(record);
      profile.publicWorkUrl=record.publicWorkUrl;profile.bio=record.bio;profile.stackTags=record.stackTags;profile.slug=record.slug;profile.publishedAt=record.publishedAt;
      await em.flush();return record;
    });}catch(error){if(error instanceof UniqueConstraintViolationException && "constraint" in error && error.constraint==="mentor_profiles_slug_unique")throw new SlugCollisionError();throw error;}
  }
  async publicBySlug(slug:string):Promise<PublicMentorProfileRecord|null> {
    return this.runtime.withEntityManager(async em=>{
      const profile=await em.findOne(MentorProfile,{slug,publishedAt:{$ne:null}});if(!profile)return null;
      const user=await em.findOne(User,{id:profile.userId,emailVerifiedAt:{$ne:null}});
      if(!user || !await em.findOne(UserRole,{userId:profile.userId,role:"mentor"}))return null;
      return {displayName:user.displayName,publicWorkUrl:profile.publicWorkUrl??null,bio:profile.bio??null,stackTags:profile.stackTags,slug};
    });
  }
}
