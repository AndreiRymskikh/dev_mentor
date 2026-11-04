import {test, expect, vi} from "vitest";
import {randomUUID} from "node:crypto";
import {MentorPricesRepository, createDatabaseRuntime, User, UserRole, MentorProfile, Slot, type OfferRecord} from "@devmentor/db";
import {readPricePolicy} from "../packages/core/src/services/prices/policy";
import {MentorPricesService, publicOffer} from "../packages/core/src/services/prices/mentor-prices.service";
import {parseMoney, formatMoney, mentorPricesSchema} from "@devmentor/core/validators/prices";
import {AppError} from "@devmentor/core/http";
import {Migration202611030001} from "../packages/db/src/migrations/Migration202611030001";
const actor=randomUUID(),now=new Date("2026-11-03T12:00:00.000Z"),start=new Date(now.getTime()+7200000);
export const source={PLATFORM_CURRENCY:"PLN",PLATFORM_PRICE_BOUNDS:'{"25":{"minCents":9000,"maxCents":60000},"50":{"minCents":18000,"maxCents":120000}}'};
export const policy=readPricePolicy(source);
const record:OfferRecord={price25Cents:9000,price50Cents:18000,published:true,availability:true,now,refreshAt:new Date(now.getTime()+1)};
test("exact money never rounds and bounds policy refuses incomplete or unsupported configuration",()=>{
 for(const [value,cents]of [["20.00",2000],["0",0],["0.01",1],["90.1",9010],["21474836.47",2147483647]] as const)expect(parseMoney(value)).toBe(cents);
 expect(formatMoney(9010)).toBe("90.10");expect(formatMoney(9000)).toBe("90.00");
 for(const value of ["", "90.001", "90.", ".90", "090", " 90", "90 ", "+90", "-90", "9e2", "90,00", "９０", "123456789012345", "21474836.48"])expect(()=>parseMoney(value)).toThrow();
 expect(mentorPricesSchema.safeParse({price25:"90",price50:"180",userId:actor}).success).toBe(false);
 const malformed=[{}, {...source,PLATFORM_CURRENCY:"USD"},{...source,PLATFORM_PRICE_BOUNDS:""},{...source,PLATFORM_PRICE_BOUNDS:"x".repeat(257)},{...source,PLATFORM_PRICE_BOUNDS:"{"},...[
 {25:{minCents:1,maxCents:2}}, {25:{minCents:2,maxCents:1},50:{minCents:1,maxCents:2}}, {25:{minCents:0,maxCents:2},50:{minCents:1,maxCents:2}}, {25:{minCents:1.1,maxCents:2},50:{minCents:1,maxCents:2}}, {25:{minCents:1,maxCents:2147483648},50:{minCents:1,maxCents:2}}, {25:{minCents:1,maxCents:2,extra:1},50:{minCents:1,maxCents:2}}, {25:{minCents:1,maxCents:2},50:{minCents:1,maxCents:2},extra:1}
 ].map(bounds=>({...source,PLATFORM_PRICE_BOUNDS:JSON.stringify(bounds)}))];
 for(const input of malformed)expect(()=>readPricePolicy(input)).toThrow(expect.objectContaining({status:503}));
 vi.stubEnv("PLATFORM_CURRENCY",source.PLATFORM_CURRENCY);vi.stubEnv("PLATFORM_PRICE_BOUNDS",source.PLATFORM_PRICE_BOUNDS);expect(readPricePolicy()).toEqual(policy);vi.unstubAllEnvs();
});
test("readiness covers partial, expired/removed availability and changed bounds; public projection is allowlisted",()=>{
 const dto=publicOffer({...record,userId:actor,email:"secret",priceBounds:policy.priceBounds} as OfferRecord,policy);
 expect(dto).toEqual({prices:{price25Cents:9000,price50Cents:18000,currency:"PLN"},readiness:{profile:true,prices:true,availability:true},mentorOfferReady:true,bookingAvailable:false,serverNow:now.toISOString(),refreshAt:new Date(now.getTime()+1).toISOString()});
 for(const change of [{published:false},{availability:false},{price25Cents:null},{price50Cents:null},{price25Cents:8999},{price50Cents:120001},{price25Cents:9000.5}])expect(publicOffer({...record,...change,refreshAt:null},policy).mentorOfferReady).toBe(false);
 expect(publicOffer({...record,price25Cents:null,price50Cents:null,published:false,availability:false,refreshAt:null},policy)).toMatchObject({prices:null,readiness:{profile:false,prices:false,availability:false},refreshAt:null});
 expect(publicOffer(record,{...policy,priceBounds:{...policy.priceBounds,p25:{minCents:10000,maxCents:60000}}}).prices).toBeNull();
 expect(publicOffer({...record,price25Cents:60000,price50Cents:120000},policy).mentorOfferReady).toBe(true);
});
test("service canonicalizes ownership, validates both fields before any write and gives safe retryable failures",async()=>{
 const repo={read:vi.fn(async()=>record as OfferRecord|null),save:vi.fn(async()=>record as OfferRecord|null),publicBySlug:vi.fn(async()=>record as OfferRecord|null)},service=new MentorPricesService(repo,()=>policy,()=>now);
 for(const work of [()=>service.getMine(null),()=>service.update("bad",{}),()=>service.getMine("bad")])await expect(work()).rejects.toMatchObject({status:401});
 expect(await service.getMine(actor.toUpperCase())).toMatchObject({savedPrices:{price25Cents:9000,price50Cents:18000},priceBounds:policy.priceBounds});expect(repo.read).toHaveBeenCalledWith(actor,expect.any(Function));
 for(const input of [{price25:"90.001",price50:"180"},{price25:"90",price50:"179.99"},{price25:"601",price50:"180"},{price25:"21474836.48",price50:"180"},{price25:"0",price50:"99999999999999"}])await expect(service.update(actor,input)).rejects.toMatchObject({status:422});
 expect(repo.save).not.toHaveBeenCalled();
 await expect(service.update(actor,{price25:"89",price50:"1201"})).rejects.toMatchObject({fieldErrors:{price25:[expect.stringContaining("90.00–600.00")],price50:[expect.stringContaining("180.00–1200.00")]}});
 for(let i=0;i<2;i++)await expect(service.update(actor,{price25:"90.00",price50:"180"})).resolves.toMatchObject({mentorOfferReady:true});expect(repo.save).toHaveBeenCalledWith(actor,{price25Cents:9000,price50Cents:18000},expect.any(Function));
 repo.save.mockRejectedValueOnce(new Error("secret"));await expect(service.update(actor,{price25:"90",price50:"180"})).rejects.toMatchObject({status:503});await expect(service.update(actor,{price25:"90",price50:"180"})).resolves.toMatchObject({mentorOfferReady:true});
 repo.save.mockResolvedValueOnce(null);await expect(service.update(actor,{price25:"90",price50:"180"})).rejects.toMatchObject({status:403});repo.read.mockResolvedValueOnce(null);await expect(service.getMine(actor)).rejects.toMatchObject({status:403});
 for(const error of [new Error("secret"),new AppError("DENIED","Denied",403)]){repo.read.mockRejectedValueOnce(error);await expect(service.getMine(actor)).rejects.toMatchObject({status:error instanceof AppError?403:503});}
 await expect(service.getPublicBySlug("../bad")).rejects.toMatchObject({status:404});repo.publicBySlug.mockResolvedValueOnce(null);await expect(service.getPublicBySlug("mentor")).rejects.toMatchObject({status:404});expect(await service.getPublicBySlug("mentor")).toEqual(publicOffer(record,policy));
 vi.stubEnv("PLATFORM_CURRENCY","PLN");vi.stubEnv("PLATFORM_PRICE_BOUNDS",source.PLATFORM_PRICE_BOUNDS);repo.read.mockImplementationOnce(async(_id?:string,clock?:()=>Date)=>{expect(clock!()).toBeInstanceOf(Date);return record;});await new MentorPricesService(repo).getMine(actor);vi.unstubAllEnvs();
});
test("repository checks current verified role under user lock, saves both values and returns only transaction snapshots",async()=>{
 const runtime=createDatabaseRuntime(),findOne=vi.fn(),create=vi.fn((_entity,values)=>({...values})),flush=vi.fn(),em={findOne,create,flush};vi.spyOn(runtime,"transaction").mockImplementation(async work=>work(em as never));
 let user:{emailVerifiedAt:Date|null}|null={emailVerifiedAt:now},role=true,profile:{userId:string;publishedAt?:Date;price25Cents?:number;price50Cents?:number}|null=null,eligible:{startsAt:Date}|null=null;
 findOne.mockImplementation(async entity=>entity===User?user:entity===UserRole?(role?{}:null):entity===Slot?eligible:profile);
 const repo=new MentorPricesRepository(runtime),clock=()=>now,values={price25Cents:9000,price50Cents:18000};
 expect(await repo.read(actor,clock)).toEqual({price25Cents:null,price50Cents:null,published:false,availability:false,now,refreshAt:null});
 await repo.save(actor,values,clock);expect(create).toHaveBeenCalledWith(MentorProfile,{userId:actor,stackTags:[]});expect(create.mock.results[0].value).toMatchObject(values);expect(flush).toHaveBeenCalledOnce();
 profile={userId:actor,publishedAt:now,...values};eligible={startsAt:start};expect(await repo.save(actor,values,clock)).toEqual(record);expect(await repo.publicBySlug("mentor",clock)).toEqual(record);
 expect(findOne).toHaveBeenCalledWith(User,{id:actor},{lockMode:expect.anything()});expect(findOne).toHaveBeenCalledWith(Slot,{mentorProfileId:actor,removedAt:null,startsAt:{$gte:start}},{orderBy:{startsAt:"asc"}});expect(findOne).toHaveBeenCalledWith(MentorProfile,{userId:actor,slug:"mentor",publishedAt:{$ne:null}},{refresh:true});
 findOne.mockImplementationOnce(async()=>profile).mockImplementationOnce(async()=>user).mockImplementationOnce(async()=>({})).mockImplementationOnce(async()=>null);expect(await repo.publicBySlug("mentor",clock)).toBeNull();
 profile=null;expect(await repo.publicBySlug("mentor",clock)).toBeNull();profile={userId:actor};role=false;expect(await repo.publicBySlug("mentor",clock)).toBeNull();expect(await repo.read(actor,clock)).toBeNull();expect(await repo.save(actor,values,clock)).toBeNull();user=null;expect(await repo.read(actor,clock)).toBeNull();user={emailVerifiedAt:null};expect(await repo.read(actor,clock)).toBeNull();
 user={emailVerifiedAt:now};role=true;flush.mockRejectedValueOnce(new Error("outage"));await expect(repo.save(actor,values,clock)).rejects.toThrow("outage");
});
test("migration adds nullable integer prices with positive checks and refuses populated rollback",()=>{
 const migration=Object.create(Migration202611030001.prototype) as Migration202611030001,sql=vi.fn();migration.addSql=sql;migration.up();migration.down();expect(sql.mock.calls.map(([statement])=>statement)).toEqual([expect.stringContaining('integer null'),expect.stringContaining('check (price_50_cents > 0)'),expect.stringContaining('lock table'),expect.stringContaining('saved prices exist'),expect.stringContaining('drop column')]);
});
