import {test,expect,vi} from "vitest";
import {act,type ReactNode} from "react";
import {createRoot} from "react-dom/client";
import {renderToStaticMarkup} from "react-dom/server";
import {JSDOM} from "jsdom";
import {detailsDto} from "@devmentor/db";
import {DetailsForm,PublicDetailsEditor} from "../packages/app/src/app/mentor/profile/details/details-editor";
import DetailsPage from "../packages/app/src/app/mentor/profile/details/page";
import PublicPage from "../packages/app/src/app/m/[slug]/page";
import {PublicProfile} from "../packages/app/src/app/m/[slug]/public-profile";
import {SessionService} from "../packages/core/src/services/users/session.service";
import {MentorDetailsService} from "../packages/core/src/services/mentors/mentor-details.service";
import {MentorProfileService} from "../packages/core/src/services/mentors/mentor-profile.service";
import {NotFoundError} from "@devmentor/core/http";
vi.mock("next/headers",()=>({headers:async()=>new Headers()}));
vi.mock("next/navigation",()=>({redirect:(url:string)=>{throw new Error("redirect:"+url);},notFound:()=>{throw new Error("not-found");}}));
const profile={displayName:"Alex Laurent",bio:"I explain API choices.",publicWorkUrl:"https://example.test",stackTags:["typescript"],slug:"alex"},empty=detailsDto({}),rich={sessionLanguage:"en",mentorTimeZone:"Europe/Warsaw",helpTopics:[{title:"Types",description:"Understand constraints"}],sampleAnswer:{title:"An API result",intro:"A public example",codeExcerpt:"<script>alert(1)</script>",body:"Use a discriminated union."},sessionSteps:[{title:"Explain",description:"Bring a small example"}]};
async function mount(element:ReactNode){
 const dom=new JSDOM("<div id='root'></div>",{url:"https://local.test"});
 for(const [name,value]of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,FormData:dom.window.FormData,Event:dom.window.Event,HTMLElement:dom.window.HTMLElement,Node:dom.window.Node,IS_REACT_ACT_ENVIRONMENT:true}))vi.stubGlobal(name,value);
 const host=dom.window.document.getElementById("root")!,root=createRoot(host);await act(async()=>root.render(element));
 return {dom,host,root,fill(name:string,value:string){host.querySelector<HTMLInputElement>(`[name="${name}"]`)!.value=value;},async click(label:string){const button=Array.from(host.querySelectorAll("button")).find(button=>button.textContent===label);expect(button,`missing ${label}`).toBeDefined();await act(async()=>button!.click());},async check(selector:string){await act(async()=>host.querySelector<HTMLInputElement>(selector)!.click());},async close(){await act(async()=>root.unmount());dom.window.close();vi.unstubAllGlobals();}};
}
test("details page rejects anonymous/nonmentor entries and public page handles details errors without leaking",async()=>{
 const resolve=vi.spyOn(SessionService.prototype,"resolve").mockResolvedValue(null);await expect(DetailsPage()).rejects.toThrow("redirect:/login");resolve.mockResolvedValue({id:"actor",displayName:"Mentor",roles:["developer"]});expect(renderToStaticMarkup(await DetailsPage())).toContain("Mentor access is required");resolve.mockResolvedValue({id:"actor",displayName:"Mentor",roles:["mentor"]});expect(renderToStaticMarkup(await DetailsPage())).toContain("Back to profile editor");
 vi.spyOn(MentorProfileService.prototype,"getPublicBySlug").mockResolvedValue(profile);const read=vi.spyOn(MentorDetailsService.prototype,"getPublicBySlug").mockRejectedValueOnce(new NotFoundError());await expect(PublicPage({params:Promise.resolve({slug:"alex"})})).rejects.toThrow("not-found");read.mockRejectedValueOnce(new Error("secret"));expect(renderToStaticMarkup(await PublicPage({params:Promise.resolve({slug:"alex"})}))).toContain("temporarily unavailable");read.mockResolvedValue(rich);expect(renderToStaticMarkup(await PublicPage({params:Promise.resolve({slug:"alex"})}))).toContain("How I run a session");
});
test("public layout renders only genuine optional content, escaped samples, local disclosure, unavailable booking and footer",()=>{
 const html=renderToStaticMarkup(<PublicProfile profile={profile} details={rich}/>);for(const text of ["AL","Session language","English","Europe/Warsaw","What I can help with","An API result","How I run a session","Get coding help","Booking is not available"])expect(html).toContain(text);expect(html).toContain("&lt;script&gt;");expect(html).not.toContain("<script>");expect(html).toContain("<details>");expect(html).toContain("<summary>Read the sample answer");expect(html).toMatch(/disabled=""/);expect(html).toContain('rel="noopener noreferrer"');
 const minimal=renderToStaticMarkup(<PublicProfile profile={{...profile,displayName:"One",bio:null,publicWorkUrl:null,stackTags:[]}} details={empty}/>);for(const text of ["Session language","Mentor timezone","Public work","About me","What I can help with","Sample answer","How I run a session"])expect(minimal).not.toContain(text);
 const zoneOnly=renderToStaticMarkup(<PublicProfile profile={profile} details={{...empty,mentorTimeZone:"UTC"}}/>);expect(zoneOnly).toContain("UTC");expect(zoneOnly).not.toContain("Session language");
 const langOnly=renderToStaticMarkup(<PublicProfile profile={profile} details={{...empty,sessionLanguage:"pl",sampleAnswer:{...rich.sampleAnswer,codeExcerpt:""}}}/>);expect(langOnly).toContain("Polish");expect(langOnly).not.toContain("Mentor timezone");expect(langOnly).not.toContain("<pre");
});
test("owner edits optional rows and sample with confirmation, sends only public fields and clears optional content",async()=>{
 const fetcher=vi.fn().mockResolvedValue(Response.json({ok:true,data:empty}));vi.stubGlobal("fetch",fetcher);const view=await mount(<DetailsForm details={empty}/>);
 try{
  expect(view.host.querySelector<HTMLInputElement>('[name="mentorTimeZone"]')!.value).toBe("");expect(view.host.textContent).toContain("do not affect publication readiness");
  await view.click("Add help topic");await view.click("Add session step");
  for(const [name,value]of Object.entries({sessionLanguage:"en",mentorTimeZone:"Europe/Warsaw","helpTopics.0.title":"Types","helpTopics.0.description":"Understand constraints","sessionSteps.0.title":"Explain","sessionSteps.0.description":"Bring a small example"}))view.fill(name,value);
  await view.check('input[type="checkbox"]');for(const [name,value]of Object.entries({"sample.title":rich.sampleAnswer.title,"sample.intro":rich.sampleAnswer.intro,"sample.body":rich.sampleAnswer.body,"sample.codeExcerpt":rich.sampleAnswer.codeExcerpt}))view.fill(name,value);
  await view.click("Save public details");expect(view.host.textContent).toContain("sampleOwnershipConfirmed");expect(fetcher).not.toHaveBeenCalled();await view.check('[name="sampleOwnershipConfirmed"]');await view.click("Save public details");expect(view.host.textContent).toContain("Public details saved.");expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({...rich,sampleOwnershipConfirmed:true});expect(fetcher.mock.calls[0][0]).toBe("/api/mentors/me/details");
  await view.click("Remove last help topic");await view.click("Remove last session step");await view.check('input[type="checkbox"]');view.fill("sessionLanguage","");view.fill("mentorTimeZone","");fetcher.mockResolvedValueOnce(Response.json({ok:false,error:{code:"OFFLINE",message:"Try later"}},{status:503}));await view.click("Save public details");expect(view.host.textContent).toContain("Try later");expect(view.host.textContent).not.toContain("Public details saved.");await view.click("Save public details");expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body)).toEqual(empty);
  for(let i=0;i<6;i++)await view.click("Add help topic");for(let i=0;i<5;i++)await view.click("Add session step");expect(Array.from(view.host.querySelectorAll("button")).find(button=>button.textContent==="Add help topic")!.disabled).toBe(true);expect(Array.from(view.host.querySelectorAll("button")).find(button=>button.textContent==="Add session step")!.disabled).toBe(true);
 }finally{await view.close();}
});
test("owner loads rich values through resource panel, preserves input during failures and disables duplicate pending saves",async()=>{
 let finish!:(value:Response)=>void;const fetcher=vi.fn().mockResolvedValueOnce(Response.json({ok:true,data:rich})).mockImplementationOnce(()=>new Promise<Response>(resolve=>{finish=resolve;}));vi.stubGlobal("fetch",fetcher);const view=await mount(<PublicDetailsEditor/>);
 try{expect(view.host.querySelector<HTMLInputElement>('[name="helpTopics.0.title"]')!.value).toBe("Types");expect(view.host.querySelector<HTMLTextAreaElement>('[name="sample.body"]')!.value).toBe(rich.sampleAnswer.body);await view.check('[name="sampleOwnershipConfirmed"]');await view.click("Save public details");expect(view.host.textContent).toContain("Saving details…");expect(view.host.querySelector('fieldset')!.disabled).toBe(true);await act(async()=>finish(Response.json({ok:false,error:{code:"VALIDATION_ERROR",message:"Check timezone",fieldErrors:{mentorTimeZone:["Zone denied"]}}},{status:422})));expect(view.host.textContent).toContain("Zone denied");expect(view.host.querySelector<HTMLInputElement>('[name="mentorTimeZone"]')!.getAttribute("aria-invalid")).toBe("true");expect(view.host.querySelector<HTMLInputElement>('[name="helpTopics.0.title"]')!.value).toBe("Types");
 }finally{await view.close();}
});
