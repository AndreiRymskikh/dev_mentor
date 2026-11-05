import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse, delay } from "msw";
import { expect, within } from "storybook/test";
import { MentorHome } from "../src/app/mentor/mentor-home";
import { Workspace } from "../src/app/workspace";
import { Button } from "@devmentor/ui/components/ui/button";
import "../src/app/mentor/mentor-home.css";
import "../src/app/mentor/slots/slots.css";
const now="2026-11-04T12:00:00.000Z";
const profile={displayName:"Jordan Lee",publicWorkUrl:null,bio:null,stackTags:[],slug:"jordan-lee",publishedAt:now,readiness:[]};
const prices={currency:"PLN",priceBounds:{p25:{minCents:9000,maxCents:60000},p50:{minCents:18000,maxCents:120000}},prices:null,savedPrices:{price25Cents:null,price50Cents:null},readiness:{profile:false,prices:false,availability:false},mentorOfferReady:false,bookingAvailable:false,serverNow:now,refreshAt:null};
const availability={slots:[],nextCursor:null,serverNow:now,refreshAt:null,availabilityComplete:false,lastPublishedAvailabilityAt:null,policy:{publicationMonths:6,eligibilityLeadHours:2,latestPublishAt:"2027-05-04T12:00:00.000Z"}};
function handlers(count:number) {return [
 http.get("/api/mentors/me",()=>HttpResponse.json({ok:true,data:{...profile,publishedAt:count?now:null,slug:count?profile.slug:null}})),
 http.get("/api/mentors/me/prices",()=>HttpResponse.json({ok:true,data:{...prices,savedPrices:count>1?{price25Cents:18000,price50Cents:32000}:prices.savedPrices,readiness:{profile:count>0,prices:count>1,availability:count>2},mentorOfferReady:count===3}})),
 http.get("/api/availability/slots",()=>HttpResponse.json({ok:true,data:{...availability,availabilityComplete:count>2,slots:count>2?[{id:"fixture",startsAt:"2026-12-01T14:30:00.000Z",eligible:true}]:[]}})),
 http.put("/api/mentors/me/prices",()=>HttpResponse.json({ok:false,error:{code:"VALIDATION_ERROR",message:"Check prices",fieldErrors:{price25:["Choose a price inside the accepted bounds."]}}},{status:422})),
 http.post("/api/availability/slots",()=>HttpResponse.json({ok:false,error:{code:"CONFLICT",message:"This start is already published."}},{status:409})),
 http.delete("/api/availability/slots/:id",()=>HttpResponse.json({ok:false,error:{code:"OFFLINE",message:"Removal unavailable; retry."}},{status:503})),
];}
const meta={title:"Product/E01/Mentor home",component:MentorHome,args:{initialPublishDueAt:"2026-11-18T12:00:00.000Z"},decorators:[Story=><Workspace identity="Jordan Lee" roles={["mentor","developer"]} current="mentor" signOut={<Button variant="text">Sign out</Button>}><Story/></Workspace>],parameters:{msw:handlers(0)},play:async({canvasElement})=>{const canvas=within(canvasElement);await expect(canvas.getByRole("heading",{name:"Your mentor workspace"})).toBeVisible();await expect(canvas.getByRole("heading",{name:"Your available times"})).toBeVisible();await expect(canvas.getByRole("button",{name:"Payout settings"})).toBeDisabled();}} satisfies Meta<typeof MentorHome>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Initial:Story={};
export const ProfileOnly:Story={parameters:{msw:handlers(1)}};
export const PricesSaved:Story={parameters:{msw:handlers(2)}};
export const Ready:Story={parameters:{msw:handlers(3)}};
export const Dark:Story={globals:{theme:"dark"},parameters:{msw:handlers(3)}};
export const Narrow:Story={decorators:[Story=><div style={{maxWidth:320}}><Story/></div>]};
export const Loading:Story={parameters:{msw:[http.get("/api/*",async()=>{await delay("infinite");return new HttpResponse();})]}};
export const LoadFailure:Story={parameters:{msw:[http.get("/api/*",()=>HttpResponse.json({ok:false,error:{code:"OFFLINE",message:"Temporarily unavailable. Retry loading."}},{status:503}))]}};
export const Forbidden:Story={parameters:{msw:[http.get("/api/*",()=>HttpResponse.json({ok:false,error:{code:"FORBIDDEN",message:"Mentor access is required."}},{status:403}))]},play:async({canvasElement})=>{await expect(await within(canvasElement).findByRole("alert")).toHaveTextContent("Mentor access is required");}};
export const PendingSave:Story={parameters:{msw:[http.put("/api/mentors/me/prices",async()=>{await delay("infinite");return new HttpResponse();}),...handlers(0)]},play:async({canvasElement})=>{const canvas=within(canvasElement);const {userEvent}=await import("storybook/test");await userEvent.type(await canvas.findByLabelText(/25-minute price/),"180");await userEvent.type(canvas.getByLabelText(/50-minute price/),"320");await userEvent.click(canvas.getByRole("button",{name:"Save both prices"}));await expect(await canvas.findByRole("button",{name:"Saving…"})).toBeDisabled();}};
