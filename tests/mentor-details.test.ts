import { test, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { detailsDto, MentorDetailsRepository, createDatabaseRuntime, User, UserRole, MentorProfile } from "@devmentor/db";
import { MentorDetailsService } from "../packages/core/src/services/mentors/mentor-details.service";
import { mentorDetailsUpdateSchema, validTimeZone } from "../packages/core/src/validators/mentors/mentor-details.schema";
import { AppError } from "@devmentor/core/http";
import { Migration202611010001 } from "../packages/db/src/migrations/Migration202611010001";
const id=randomUUID(),empty=detailsDto({});
export const rich={sessionLanguage:"en",mentorTimeZone:"Europe/Warsaw",helpTopics:[{title:"Types",description:"Understand constraints"}],sampleAnswer:{title:"An API result",intro:"A public example",codeExcerpt:"<script>alert(1)</script>",body:"Use a discriminated union."},sessionSteps:[{title:"Explain",description:"Bring a small example"}]};
test("strict public content validates bounds, timezone, languages, nested keys, distinct titles and explicit sample ownership",()=>{
 expect(validTimeZone("UTC")).toBe(true);expect(validTimeZone("invented/no-zone")).toBe(false);
 expect(mentorDetailsUpdateSchema.parse({})).toEqual({});expect(mentorDetailsUpdateSchema.parse({...rich,sampleOwnershipConfirmed:true})).toMatchObject(rich);
 expect(mentorDetailsUpdateSchema.parse({sessionLanguage:null,mentorTimeZone:null,sampleAnswer:null,helpTopics:[],sessionSteps:[]})).toMatchObject(empty);
 for(const input of [{...rich},{...rich,sampleOwnershipConfirmed:false},{sessionLanguage:"xx"},{mentorTimeZone:"fake"},{mentorTimeZone:"a".repeat(101)},{userId:id},{helpTopics:[{title:"a",description:"b",private:true}]},{helpTopics:[{title:"A",description:"b"},{title:"a",description:"c"}]},{helpTopics:Array.from({length:7},(_,i)=>({title:String(i),description:"x"}))},{sessionSteps:Array.from({length:6},(_,i)=>({title:String(i),description:"x"}))},{helpTopics:[{title:"x".repeat(101),description:"x"}]},{helpTopics:[{title:"x",description:"x".repeat(501)}]},{helpTopics:[{title:" ",description:"x"}]},...(["title","intro","codeExcerpt","body"] as const).map((field,index)=>({sampleAnswer:{...rich.sampleAnswer,[field]:"x".repeat([161,501,2001,10001][index])},sampleOwnershipConfirmed:true})),{sampleAnswer:{...rich.sampleAnswer,private:true},sampleOwnershipConfirmed:true}])expect(mentorDetailsUpdateSchema.safeParse(input).success,JSON.stringify(input).slice(0,80)).toBe(false);
});
test("public content service authenticates, allowlists writes, maps outages and hides absent/nonpublic rows",async()=>{
 const repo={read:vi.fn(async()=>empty as typeof empty|null),update:vi.fn(async()=>rich as typeof empty|null),publicBySlug:vi.fn(async()=>rich as typeof empty|null)},service=new MentorDetailsService(repo);
 for(const run of [()=>service.getMine(null),()=>service.update("bad",{} )])await expect(run()).rejects.toMatchObject({status:401});
 expect(await service.getMine(id.toUpperCase())).toEqual(empty);expect(repo.read).toHaveBeenCalledWith(id);
 await service.update(id,{...rich,sampleOwnershipConfirmed:true});expect(repo.update).toHaveBeenCalledWith(id,rich);expect(repo.update.mock.calls[0]).not.toContain("sampleOwnershipConfirmed");
 await expect(service.update(id,{private:true})).rejects.toMatchObject({status:422});
 repo.read.mockResolvedValueOnce(null);await expect(service.getMine(id)).rejects.toMatchObject({status:403});repo.update.mockResolvedValueOnce(null);await expect(service.update(id,{})).rejects.toMatchObject({status:403});
 for(const error of [new Error("private database"),new AppError("DENIED","Denied",403)]){repo.read.mockRejectedValueOnce(error);await expect(service.getMine(id)).rejects.toMatchObject({status:error instanceof AppError?403:503});}
 await expect(service.getPublicBySlug("../draft")).rejects.toMatchObject({status:404});expect(await service.getPublicBySlug("mentor")).toEqual(rich);repo.publicBySlug.mockResolvedValueOnce(null);await expect(service.getPublicBySlug("mentor")).rejects.toMatchObject({status:404});
});
test("separate details projection strips nested and top-level private fields and copies arrays",()=>{
 const source={...rich,email:"private",helpTopics:[{...rich.helpTopics[0],secret:"private"}],sessionSteps:[{...rich.sessionSteps[0],secret:"private"}],sampleAnswer:{...rich.sampleAnswer,secret:"private"}};
 const dto=detailsDto(source);expect(dto).toEqual(rich);expect(JSON.stringify(dto)).not.toContain("private");dto.helpTopics[0].title="Changed";dto.sessionSteps[0].title="Changed";dto.sampleAnswer!.body="Changed";expect(source.helpTopics[0].title).toBe("Types");expect(source.sessionSteps[0].title).toBe("Explain");expect(source.sampleAnswer.body).toBe(rich.sampleAnswer.body);expect(detailsDto({})).toEqual(empty);
});
test("details persistence uses current verified mentor checks, locked explicit writes, partial preservation and null clears",async()=>{
 const runtime=createDatabaseRuntime(),findOne=vi.fn(),create=vi.fn((_entity,value)=>({...value})),flush=vi.fn(),em={findOne,create,flush};vi.spyOn(runtime,"withEntityManager").mockImplementation(async run=>run(em as never));vi.spyOn(runtime,"transaction").mockImplementation(async run=>run(em as never));
 let user:{emailVerifiedAt:Date|null}|null={emailVerifiedAt:new Date()},role=true,profile:Partial<typeof rich>|null=null;
 findOne.mockImplementation(async entity=>entity===User?user:entity===UserRole?(role?{}:null):profile);const repo=new MentorDetailsRepository(runtime);
 expect(await repo.read(id)).toEqual(empty);expect(create).not.toHaveBeenCalled();expect(await repo.update(id,{})).toEqual(empty);expect(create).toHaveBeenCalledWith(MentorProfile,{userId:id,stackTags:[]});
 profile={...rich};expect(await repo.update(id,{})).toEqual(rich);expect(await repo.update(id,{sessionLanguage:null,mentorTimeZone:null,helpTopics:[],sampleAnswer:null,sessionSteps:[]})).toEqual(empty);
 expect(await repo.update(id,rich)).toEqual(rich);expect(await repo.publicBySlug("mentor")).toEqual(rich);
 profile=null;expect(await repo.publicBySlug("mentor")).toBeNull();user=null;expect(await repo.read(id)).toBeNull();expect(await repo.update(id,{})).toBeNull();profile=rich;expect(await repo.publicBySlug("mentor")).toBeNull();user={emailVerifiedAt:null};expect(await repo.update(id,{})).toBeNull();user.emailVerifiedAt=new Date();role=false;expect(await repo.read(id)).toBeNull();expect(await repo.update(id,{})).toBeNull();expect(await repo.publicBySlug("mentor")).toBeNull();
 expect(findOne).toHaveBeenCalledWith(MentorProfile,{slug:"mentor",publishedAt:{$ne:null}});
});
test("additive details migration refuses to destroy any saved content",()=>{
 const migration=Object.create(Migration202611010001.prototype) as Migration202611010001,sql=vi.fn();migration.addSql=sql;migration.up();migration.down();expect(sql.mock.calls[0][0]).toContain('"help_topics" jsonb');expect(sql.mock.calls[1][0]).toContain("lock table");expect(sql.mock.calls[2][0]).toContain("Refusing destructive details rollback");expect(sql.mock.calls[3][0]).toContain("drop column sample_answer");
});

test("mentor timezone must name an IANA zone rather than a fixed numeric offset",()=>{expect(validTimeZone("+02:00")).toBe(false);expect(mentorDetailsUpdateSchema.safeParse({mentorTimeZone:"+02:00"}).success).toBe(false);});
