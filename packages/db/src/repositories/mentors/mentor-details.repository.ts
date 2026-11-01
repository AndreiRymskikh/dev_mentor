import { LockMode } from "@mikro-orm/postgresql";
import { database } from "../../runtime";
import { User } from "../../entities/users/user.entity";
import { UserRole } from "../../entities/users/user-role.entity";
import { MentorProfile } from "../../entities/mentors/mentor-profile.entity";
export interface MentorDetails {
  sessionLanguage: string | null;
  mentorTimeZone: string | null;
  helpTopics: {title:string;description:string}[];
  sampleAnswer: {title:string;intro:string;codeExcerpt:string;body:string} | null;
  sessionSteps: {title:string;description:string}[];
}
/** The same explicit projection is used for owner and public content; never return an entity. */
export function detailsDto(value: Partial<MentorDetails>): MentorDetails {
  return {sessionLanguage:value.sessionLanguage??null,mentorTimeZone:value.mentorTimeZone??null,
    helpTopics:(value.helpTopics??[]).map(({title,description})=>({title,description})),
    sampleAnswer:value.sampleAnswer?{title:value.sampleAnswer.title,intro:value.sampleAnswer.intro,codeExcerpt:value.sampleAnswer.codeExcerpt,body:value.sampleAnswer.body}:null,
    sessionSteps:(value.sessionSteps??[]).map(({title,description})=>({title,description}))};
}
export class MentorDetailsRepository {
  constructor(private readonly runtime=database) {}
  async read(userId:string):Promise<MentorDetails|null> {
    return this.runtime.withEntityManager(async em=>{
      if(!await em.findOne(User,{id:userId,emailVerifiedAt:{$ne:null}})||!await em.findOne(UserRole,{userId,role:"mentor"}))return null;
      const profile=await em.findOne(MentorProfile,{userId});
      return detailsDto(profile??{});
    });
  }
  async update(userId:string,values:Partial<MentorDetails>):Promise<MentorDetails|null> {
    return this.runtime.transaction(async em=>{
      const user=await em.findOne(User,{id:userId},{lockMode:LockMode.PESSIMISTIC_WRITE});
      if(!user?.emailVerifiedAt||!await em.findOne(UserRole,{userId,role:"mentor"}))return null;
      let profile=await em.findOne(MentorProfile,{userId},{lockMode:LockMode.PESSIMISTIC_WRITE});
      if(!profile)profile=em.create(MentorProfile,{userId,stackTags:[]});
      if(values.sessionLanguage!==undefined)profile.sessionLanguage=values.sessionLanguage;
      if(values.mentorTimeZone!==undefined)profile.mentorTimeZone=values.mentorTimeZone;
      if(values.helpTopics!==undefined)profile.helpTopics=values.helpTopics;
      if(values.sampleAnswer!==undefined)profile.sampleAnswer=values.sampleAnswer;
      if(values.sessionSteps!==undefined)profile.sessionSteps=values.sessionSteps;
      await em.flush();return detailsDto(profile);
    });
  }
  async publicBySlug(slug:string):Promise<MentorDetails|null> {
    return this.runtime.withEntityManager(async em=>{
      const profile=await em.findOne(MentorProfile,{slug,publishedAt:{$ne:null}});
      if(!profile)return null;
      if(!await em.findOne(User,{id:profile.userId,emailVerifiedAt:{$ne:null}})||!await em.findOne(UserRole,{userId:profile.userId,role:"mentor"}))return null;
      return detailsDto(profile);
    });
  }
}
