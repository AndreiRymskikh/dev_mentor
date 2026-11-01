import { z } from "zod";
import type { MentorDetailsRepository } from "@devmentor/db";
import { AppError, ForbiddenError, NotFoundError, ServiceUnavailableError, UnauthorizedError } from "../../http/errors";
import { userIdSchema } from "../../validators/users/roles.schema";
import { mentorSlugSchema } from "../../validators/mentors/mentor-profile-update.schema";
import { mentorDetailsUpdateSchema } from "../../validators/mentors/mentor-details.schema";
export class MentorDetailsService {
  constructor(private readonly repository:Pick<MentorDetailsRepository,"read"|"update"|"publicBySlug">) {}
  private actor(input:string|null) {const parsed=userIdSchema.safeParse(input);if(!parsed.success)throw new UnauthorizedError();return parsed.data;}
  private async available<T>(work:()=>Promise<T>) {try{return await work();}catch(error){if(error instanceof AppError)throw error;throw new ServiceUnavailableError();}}
  async getMine(input:string|null) {const actor=this.actor(input),details=await this.available(()=>this.repository.read(actor));if(!details)throw new ForbiddenError();return details;}
  async update(input:string|null,value:unknown) {
    const actor=this.actor(input),parsed=mentorDetailsUpdateSchema.safeParse(value);
    if(!parsed.success)throw new AppError("VALIDATION_ERROR","Check your public details.",422,z.flattenError(parsed.error).fieldErrors);
    const {sessionLanguage,mentorTimeZone,helpTopics,sampleAnswer,sessionSteps}=parsed.data;
    const details=await this.available(()=>this.repository.update(actor,{sessionLanguage,mentorTimeZone,helpTopics,sampleAnswer,sessionSteps}));
    if(!details)throw new ForbiddenError();return details;
  }
  async getPublicBySlug(input:unknown) {
    const parsed=mentorSlugSchema.safeParse(input);if(!parsed.success)throw new NotFoundError();
    const details=await this.available(()=>this.repository.publicBySlug(parsed.data));if(!details)throw new NotFoundError();return details;
  }
}
