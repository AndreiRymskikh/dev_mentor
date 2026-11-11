import { ProfileDetailsPreview } from "../packages/app/src/app/mentor/profile/profile-details-preview";
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
 const html=renderToStaticMarkup(<PublicProfile profile={profile} details={rich}/>);for(const text of ["AL","Session language","English","Europe/Warsaw","What I can help with","An API result","How I run a session","Get coding help","Choose a bookable start"])expect(html).toContain(text);expect(html).toContain("&lt;script&gt;");expect(html).not.toContain("<script>");expect(html).toContain("<details>");expect(html).toContain("<summary>Read the sample answer");expect(html).not.toContain("Choose a session</button>");expect(html).toContain('rel="noopener noreferrer"');
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
  await view.check('input[type="checkbox"]');for(const [name,value]of Object.entries({"sampleAnswer.title":rich.sampleAnswer.title,"sampleAnswer.intro":rich.sampleAnswer.intro,"sampleAnswer.body":rich.sampleAnswer.body,"sampleAnswer.codeExcerpt":rich.sampleAnswer.codeExcerpt}))view.fill(name,value);
  await view.click("Save public details");expect(view.host.textContent).toContain("Confirm you own this public sample");expect(view.host.textContent).not.toContain("sampleOwnershipConfirmed:");expect(view.dom.window.document.activeElement).toBe(view.host.querySelector('[name="sampleOwnershipConfirmed"]'));expect(fetcher).not.toHaveBeenCalled();await view.check('[name="sampleOwnershipConfirmed"]');await view.click("Save public details");expect(view.host.textContent).toContain("Public details saved.");expect(view.dom.window.document.activeElement).toBe(view.host.querySelector(".dm-save-confirmation"));expect(view.host.querySelector(".dm-save-confirmation")!.getAttribute("role")).toBe("status");expect(view.host.querySelector(".dm-save-confirmation")!.textContent).toContain("Your changes have been saved successfully.");expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({...rich,sampleOwnershipConfirmed:true});expect(fetcher.mock.calls[0][0]).toBe("/api/mentors/me/details");
  await view.click("Remove last help topic");await view.click("Remove last session step");await view.check('input[type="checkbox"]');view.fill("sessionLanguage","");view.fill("mentorTimeZone","");fetcher.mockResolvedValueOnce(Response.json({ok:false,error:{code:"OFFLINE",message:"Try later"}},{status:503}));await view.click("Save public details");expect(view.host.textContent).toContain("Try later");expect(view.host.textContent).not.toContain("Public details saved.");await view.click("Save public details");expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body)).toEqual(empty);
  for(let i=0;i<6;i++)await view.click("Add help topic");for(let i=0;i<5;i++)await view.click("Add session step");expect(Array.from(view.host.querySelectorAll("button")).find(button=>button.textContent==="Add help topic")!.disabled).toBe(true);expect(Array.from(view.host.querySelectorAll("button")).find(button=>button.textContent==="Add session step")!.disabled).toBe(true);
 }finally{await view.close();}
});
test("owner loads rich values through resource panel, preserves input during failures and disables duplicate pending saves",async()=>{
 let finish!:(value:Response)=>void;const fetcher=vi.fn().mockResolvedValueOnce(Response.json({ok:true,data:rich})).mockImplementationOnce(()=>new Promise<Response>(resolve=>{finish=resolve;}));vi.stubGlobal("fetch",fetcher);const view=await mount(<PublicDetailsEditor/>);
 try{expect(view.host.querySelector<HTMLInputElement>('[name="helpTopics.0.title"]')!.value).toBe("Types");expect(view.host.querySelector<HTMLTextAreaElement>('[name="sampleAnswer.body"]')!.value).toBe(rich.sampleAnswer.body);await view.check('[name="sampleOwnershipConfirmed"]');await view.click("Save public details");expect(view.host.textContent).toContain("Saving details…");expect(view.host.querySelector('fieldset')!.disabled).toBe(true);await act(async()=>finish(Response.json({ok:false,error:{code:"VALIDATION_ERROR",message:"Check timezone",fieldErrors:{mentorTimeZone:["Zone denied"]}}},{status:422})));expect(view.host.textContent).toContain("Zone denied");expect(view.host.querySelector<HTMLInputElement>('[name="mentorTimeZone"]')!.getAttribute("aria-invalid")).toBe("true");expect(view.host.querySelector<HTMLInputElement>('[name="helpTopics.0.title"]')!.value).toBe("Types");
 }finally{await view.close();}
});

test("sample field validation identifies and focuses the invalid nested field",async()=>{
 const view=await mount(<DetailsForm details={rich}/>);try{view.fill("sampleAnswer.title","");await view.check('[name="sampleOwnershipConfirmed"]');await view.click("Save public details");const title=view.host.querySelector<HTMLInputElement>('[name="sampleAnswer.title"]')!;expect(title.getAttribute("aria-invalid")).toBe("true");expect(view.dom.window.document.activeElement).toBe(title);}finally{await view.close();}
});

test("optional details save empty; added content is required with errors only beneath each field",async()=>{
 const fetcher=vi.fn().mockResolvedValue(Response.json({ok:true,data:empty}));vi.stubGlobal("fetch",fetcher);const view=await mount(<DetailsForm details={empty}/>);
 try{await view.click("Save public details");expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(empty);await view.click("Add help topic");await view.click("Add session step");await view.check('input[type="checkbox"]');await view.click("Save public details");
 for(const [name,message]of Object.entries({"helpTopics.0.title":"Title is required.","helpTopics.0.description":"Description is required.","sessionSteps.0.title":"Title is required.","sessionSteps.0.description":"Description is required.","sampleAnswer.title":"Sample title is required.","sampleAnswer.intro":"Sample introduction is required.","sampleAnswer.body":"Full sample answer is required.",sampleOwnershipConfirmed:"Confirm you own this public sample and have removed private information."})){const control=view.host.querySelector<HTMLInputElement>(`[name="${name}"]`)!;expect(control.required).toBe(true);expect(control.getAttribute("aria-invalid")).toBe("true");const field=control.closest(".dm-field")!;expect(field.querySelector(".dm-field-indicator")!.textContent).toBe("Required");expect(field.querySelector(".dm-field-error")!.textContent).toContain(message);expect(control.getAttribute("aria-describedby")).toContain(field.querySelector(".dm-field-error")!.id);}
 for(const name of ["mentorTimeZone","sampleAnswer.codeExcerpt","sessionLanguage"]){const control=view.host.querySelector<HTMLInputElement>(`[name="${name}"]`)!;expect(control.required).toBe(false);expect(control.getAttribute("aria-invalid")).toBe("false");}expect(view.host.querySelector('[aria-label="Details validation errors"]')).toBeNull();expect(fetcher).toHaveBeenCalledTimes(1);
 }finally{await view.close();}
});

test("details retain server group, language and form errors near the relevant controls",async()=>{
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({ok:false,error:{code:"VALIDATION_ERROR",message:"Check details",fieldErrors:{helpTopics:["Use distinct topic titles."],sessionSteps:["Use distinct step titles."],sessionLanguage:["Language unavailable."],_form:["Unable to save these details."]}}},{status:422})));const view=await mount(<DetailsForm details={empty}/>);
 try{await view.click("Save public details");for(const message of ["Use distinct topic titles.","Use distinct step titles.","Language unavailable.","Unable to save these details."])expect(view.host.textContent).toContain(message);expect(view.host.querySelector('[name="sessionLanguage"]')!.getAttribute("aria-invalid")).toBe("true");}finally{await view.close();}
});

test("owner preview loads saved rich details, preserves safe disclosure and retries without the edit form",async()=>{
 let finish!:(value:Response)=>void;const fetcher=vi.fn().mockImplementationOnce(()=>new Promise<Response>(resolve=>{finish=resolve;})).mockResolvedValueOnce(Response.json({ok:true,data:rich}));vi.stubGlobal("fetch",fetcher);const view=await mount(<ProfileDetailsPreview/>);
 try{expect(view.host.textContent).toContain("Loading");await act(async()=>finish(Response.json({ok:false,error:{code:"OFFLINE",message:"Details unavailable"}},{status:503})));expect(view.host.textContent).toContain("Details unavailable");await view.click("Try again");expect(fetcher.mock.calls[0][0]).toBe("/api/mentors/me/details");for(const text of ["English","Europe/Warsaw","What I can help with","Types","Sample answer","An API result","How I run a session","Bring a small example"])expect(view.host.textContent).toContain(text);expect(view.host.querySelector("h4")!.textContent).toBe("What I can help with");expect(view.host.querySelector("h5")!.textContent).toBe("Types");expect(view.host.querySelector("script")).toBeNull();expect(view.host.querySelector("code")!.textContent).toBe(rich.sampleAnswer.codeExcerpt);const disclosure=view.host.querySelector("details")!;await act(async()=>view.host.querySelector("summary")!.click());expect(disclosure.open).toBe(true);
 }finally{await view.close();}
});
