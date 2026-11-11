import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {createDatabaseRuntime,MentorPricesRepository,MentorProfileRepository,SlotRepository,User,UserRole,MentorProfile,Slot} from "../../packages/db/src";
import {MentorPricesService} from "../../packages/core/src/services/prices/mentor-prices.service";
import {MentorProfileService} from "../../packages/core/src/services/mentors/mentor-profile.service";
import {SlotService} from "../../packages/core/src/services/availability/slot.service";
import {readPricePolicy} from "../../packages/core/src/services/prices/policy";
export async function testPrices(runtime:ReturnType<typeof createDatabaseRuntime>){
 const ids=[randomUUID(),randomUUID()],now=new Date("2026-11-03T12:00:00.000Z");let time=now,policy=readPricePolicy();
 const repo=new MentorPricesRepository(runtime),service=new MentorPricesService(repo,()=>policy,()=>time),profiles=new MentorProfileService(new MentorProfileRepository(runtime)),slots=new SlotService(new SlotRepository(runtime),()=>time),input={price25:"90.00",price50:"180.00"};
 await runtime.transaction(async em=>{for(const id of ids){em.create(User,{id,normalizedEmail:`prices-${id}@example.test`,displayName:"Prices mentor",emailVerifiedAt:now,createdAt:now,updatedAt:now});em.create(UserRole,{userId:id,role:"mentor"});}});
 try{
  const initial=await service.getMine(ids[0]);assert.deepEqual(initial.readiness,{profile:false,prices:false,availability:false});assert.equal(initial.prices,null);assert.deepEqual(initial.savedPrices,{price25Cents:null,price50Cents:null});
  await assert.rejects(service.update(ids[0],{price25:"90",price50:"179.99"}),{status:422});assert.equal((await service.getMine(ids[0])).prices,null);
  await service.update(ids[0],input);await service.update(ids[0],input);assert.equal((await service.getMine(ids[0])).readiness.prices,true);assert.equal((await service.getMine(ids[1])).prices,null);
  await profiles.update(ids[0],{bio:"Prices mentor",publicWorkUrl:"https://example.test",stackTags:["react"]});const published=await profiles.publish(ids[0]),slug=published.slug!;
  assert.equal((await service.getPublicBySlug(slug)).mentorOfferReady,false);
  const slot=await slots.publish(ids[0],{startsAt:new Date(now.getTime()+7200000).toISOString()});assert.equal((await service.getMine(ids[0])).mentorOfferReady,true);const publicData=await service.getPublicBySlug(slug);assert.equal(publicData.mentorOfferReady,true);assert.equal(publicData.bookingAvailable,false);assert.deepEqual(Object.keys(publicData).sort(),["prices","readiness","mentorOfferReady","bookingAvailable","serverNow","refreshAt"].sort());assert.ok(!JSON.stringify(publicData).includes(ids[0]));assert.equal(publicData.refreshAt,new Date(now.getTime()+1).toISOString());
  time=new Date(now.getTime()+1);assert.equal((await service.getMine(ids[0])).readiness.availability,false);time=new Date(now.getTime()+7200000);assert.equal((await service.getPublicBySlug(slug)).mentorOfferReady,false);time=now;
  await slots.remove(ids[0],slot.slots[0].id);assert.equal((await service.getMine(ids[0])).readiness.availability,false);await slots.publish(ids[0],{startsAt:new Date(now.getTime()+7200000).toISOString()});
  policy={...policy,priceBounds:{...policy.priceBounds,p25:{minCents:10000,maxCents:60000}}};assert.equal((await service.getMine(ids[0])).mentorOfferReady,false);assert.equal((await service.getMine(ids[0])).savedPrices.price25Cents,9000);assert.equal((await service.getPublicBySlug(slug)).prices,null);policy=readPricePolicy();
  // Both invalid values and failed response reads leave the complete previous pair unchanged.
  await assert.rejects(service.update(ids[0],{price25:"100",price50:"1200.001"}),{status:422});
  const failingRuntime:typeof runtime={...runtime,transaction:work=>runtime.transaction(async em=>{const find=em.findOne.bind(em);Object.defineProperty(em,"findOne",{value:async(...args:Parameters<typeof em.findOne>)=>{if(args[0]===Slot)throw new Error("injected projection outage");return find(...args);}});return work(em);})};
  const failing=new MentorPricesService(new MentorPricesRepository(failingRuntime),()=>policy,()=>now);await assert.rejects(failing.update(ids[0],{price25:"100",price50:"200"}),{status:503});await assert.rejects(failing.getMine(ids[0]),{status:503});assert.deepEqual((await service.getMine(ids[0])).prices,{price25Cents:9000,price50Cents:18000,currency:"PLN"});
  await service.update(ids[0],{price25:"100",price50:"200"});
  const pairs=[{price25:"110",price50:"210"},{price25:"120",price50:"220"}];await Promise.all(Array.from({length:8},(_,i)=>service.update(ids[0],pairs[i%2])));const last=(await service.getMine(ids[0])).prices!;assert.ok((last.price25Cents===11000&&last.price50Cents===21000)||(last.price25Cents===12000&&last.price50Cents===22000));
  const orm=await runtime.getOrm();await assert.rejects(orm.migrator.down({to:"Migration202611020001"}),/saved prices exist/);assert.equal(await orm.schema.getUpdateSchemaSQL({wrap:false}),"");await runtime.withEntityManager(async em=>{await assert.rejects(em.execute("update mentor_profiles set price_25_cents=0 where user_id=?",[ids[0]]),/check constraint/);});
  await profiles.unpublish(ids[0]);await assert.rejects(service.getPublicBySlug(slug),{status:404});await profiles.publish(ids[0]);await runtime.transaction(async em=>{const user=await em.findOneOrFail(User,{id:ids[0]});user.emailVerifiedAt=null;});await assert.rejects(service.getPublicBySlug(slug),{status:404});await assert.rejects(service.update(ids[0],input),{status:403});
  await runtime.transaction(async em=>{const user=await em.findOneOrFail(User,{id:ids[0]});user.emailVerifiedAt=now;await em.nativeDelete(UserRole,{userId:ids[0],role:"mentor"});});await assert.rejects(service.getMine(ids[0]),{status:403});await assert.rejects(service.update(ids[0],input),{status:403});await assert.rejects(service.getPublicBySlug(slug),{status:404});
  console.log("Prices DB passed: atomic pairs/rollback/retry/concurrency, current owner verification and role, public allowlist, changed policy, exact 2h expiration, removal, guarded migration rollback and schema parity.");
 }finally{await runtime.transaction(async em=>{await em.nativeDelete(Slot,{mentorProfileId:{$in:ids}});await em.nativeDelete(MentorProfile,{userId:{$in:ids}});await em.nativeDelete(UserRole,{userId:{$in:ids}});await em.nativeDelete(User,{id:{$in:ids}});});}
}
