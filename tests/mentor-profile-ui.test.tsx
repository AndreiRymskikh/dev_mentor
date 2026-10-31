import MentorHome from "../packages/app/src/app/mentor/page";
import { InvitationService } from "../packages/core/src/services/invitations/invitation.service";
import {test,expect,vi} from "vitest";
import {act,type ReactNode} from "react";
import {createRoot} from "react-dom/client";
import {renderToStaticMarkup} from "react-dom/server";
import {JSDOM} from "jsdom";
import {z} from "zod";
import {ProfileEditor} from "../packages/app/src/app/mentor/profile/profile-editor";
import ProfilePage from "../packages/app/src/app/mentor/profile/page";
import PublicPage from "../packages/app/src/app/m/[slug]/page";
import {SessionService} from "../packages/core/src/services/users/session.service";
import {MentorProfileService,toOwnerDto,toPublicDto} from "../packages/core/src/services/mentors/mentor-profile.service";
import {AppError,NotFoundError} from "@devmentor/core/http";
import {StackTags} from "../packages/core/src/domain/vocabularies/stack-tags";
import {ResourcePanel} from "../packages/ui/src/backend/panels";
import {useApiResource} from "../packages/ui/src/backend/api";
import {CrudForm} from "../packages/ui/src/backend/forms";
import {ReadinessChecklist} from "../packages/ui/src/backend/feedback";
import {MentorPageView} from "../packages/ui/src/components/mentors/MentorPageView";
import {Badge} from "../packages/ui/src/components/ui/badge";
const id="00000000-0000-4000-8000-000000000001",stamp=new Date("2026-10-27T10:00:00Z");
const record={userId:id,displayName:"Mentor",publicWorkUrl:"https://github.com/example",bio:"Public experience",stackTags:["react"],slug:null as string|null,publishedAt:null as Date|null};
const draft=toOwnerDto(record),published=toOwnerDto({...record,slug:"mentor-1",publishedAt:stamp});
vi.mock("next/headers",()=>({headers:async()=>new Headers()}));
vi.mock("next/navigation",()=>({redirect:(url:string)=>{throw new Error("redirect:"+url);},notFound:()=>{throw new Error("not-found");}}));
function response(data:unknown,status=200){return Response.json(data,{status});}
async function mount(element:ReactNode){
 const dom=new JSDOM("<div id='root'></div>",{url:"https://local.test"});
 class ResizeObserver {observe(){}unobserve(){}disconnect(){}}
 for(const [name,value]of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,FormData:dom.window.FormData,Event:dom.window.Event,CustomEvent:dom.window.CustomEvent,HTMLElement:dom.window.HTMLElement,Node:dom.window.Node,getComputedStyle:dom.window.getComputedStyle,ResizeObserver,IS_REACT_ACT_ENVIRONMENT:true}))vi.stubGlobal(name,value);
 const host=dom.window.document.getElementById("root")!,root=createRoot(host);
 await act(async()=>root.render(element));
 return {dom,host,root,fill(name:string,value:string){host.querySelector<HTMLInputElement|HTMLTextAreaElement>(`[name="${name}"]`)!.value=value;},async click(label:string){const button=Array.from(host.querySelectorAll("button")).find(button=>button.textContent===label);expect(button,`missing button ${label}`).toBeDefined();await act(async()=>button!.click());},async close(){await act(async()=>root.unmount());dom.window.close();vi.unstubAllGlobals();}};
}
test("profile page guards each entry and public pages expose only the shared approved view",async()=>{
 const resolve=vi.spyOn(SessionService.prototype,"resolve").mockResolvedValue(null);await expect(ProfilePage()).rejects.toThrow("redirect:/login");resolve.mockResolvedValue({id,displayName:"Mentor",roles:["developer"]});expect(renderToStaticMarkup(await ProfilePage())).toContain("Mentor access is required");resolve.mockResolvedValue({id,displayName:"Mentor",roles:["mentor"]});vi.stubEnv("APP_ORIGIN",undefined);expect((await ProfilePage()).props.children.props.origin).toBe("");vi.stubEnv("APP_ORIGIN","https://site.test/");expect((await ProfilePage()).props.children.props.origin).toBe("https://site.test");vi.unstubAllEnvs();
 const get=vi.spyOn(MentorProfileService.prototype,"getPublicBySlug").mockResolvedValue(toPublicDto({...record,slug:"mentor-1"}));const render=async()=>renderToStaticMarkup(await PublicPage({params:Promise.resolve({slug:"mentor-1"})}));expect(await render()).toContain("Public experience");expect(await render()).toContain("React");expect(await render()).not.toContain("TypeScript");get.mockRejectedValueOnce(new NotFoundError());await expect(render()).rejects.toThrow("not-found");for(const error of [new Error("secret"),new AppError("OFFLINE","private",503)]){get.mockRejectedValueOnce(error);const html=await render();expect(html).toContain("temporarily unavailable");expect(html).not.toContain("secret");}
});
test("shared profile view, badges and readiness show accessible text without private or ranking fields",()=>{
 const complete=renderToStaticMarkup(<MentorPageView {...record} tags={["React","TypeScript"]}/>);expect(complete).toContain('rel="noopener noreferrer"');expect(complete).toContain('data-slot="badge"');expect(complete).toContain("<h1");for(const word of ["rating","review","ranking","score", "email"])expect(complete).not.toContain(word);
 const empty=renderToStaticMarkup(<MentorPageView displayName="Mentor" bio={null} publicWorkUrl={null} tags={[]} heading="h3"/>);expect(empty).toContain("<h3");expect(empty).not.toContain("See public work");
 expect(renderToStaticMarkup(<Badge variant="outline" asChild className="custom"><a href="https://example.test">Mentor</a></Badge>)).toContain('data-variant="outline"');expect(renderToStaticMarkup(<ReadinessChecklist items={[{field:"bio",label:"Experience",met:true},{field:"stackTags",label:"Tags",met:false}]}/>)).toContain("Complete: Experience");expect(renderToStaticMarkup(<ReadinessChecklist items={[{field:"bio",label:"Experience",met:false}]}/>)).toContain("Missing: Experience");
});
test("resource panel handles loading, error/retry, empty and successful data",async()=>{
 const reload=vi.fn();for(const resource of [{loading:true,error:null,data:null,reload},{loading:false,error:"Offline",data:null,reload},{loading:false,error:null,data:null,reload},{loading:false,error:null,data:"Content",reload}]){const view=await mount(<ResourcePanel resource={resource}>{data=><p>{data}</p>}</ResourcePanel>);try{expect(view.host.textContent).toContain(resource.loading?"Loading":resource.error??resource.data??"No results");if(resource.error)await view.click("Try again");}finally{await view.close();}}expect(reload).toHaveBeenCalledOnce();
});
function HookView({url}:{url:string}){const resource=useApiResource<string>(url);return <ResourcePanel resource={resource}>{data=><div>{data}<button onClick={resource.reload}>Reload</button></div>}</ResourcePanel>;}
test("resource hook retries failures, resets for reload/URL changes and ignores aborted stale responses",async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(response({ok:false,error:{code:"OFFLINE",message:"Offline"}},503));vi.stubGlobal("fetch",fetcher);const view=await mount(<HookView url="/api/a"/>);
 try{expect(view.host.textContent).toContain("Offline");fetcher.mockResolvedValueOnce(response({ok:true,data:"First"}));await view.click("Try again");expect(view.host.textContent).toContain("First");
   let finish!:(value:Response)=>void;fetcher.mockImplementationOnce(()=>new Promise<Response>(resolve=>{finish=resolve;}));await view.click("Reload");expect(view.host.textContent).toContain("Loading");fetcher.mockResolvedValueOnce(response({ok:true,data:"Second"}));await act(async()=>view.root.render(<HookView url="/api/b"/>));expect(view.host.textContent).toContain("Second");await act(async()=>finish(response({ok:true,data:"Stale"})));expect(view.host.textContent).not.toContain("Stale");expect((fetcher.mock.calls[2][1] as RequestInit).signal?.aborted).toBe(true);
 }finally{await view.close();}
});
test("multiselect form collects checked values, preserves textareas, shares errors and supports an additional submit action",async()=>{
 const save=vi.fn(async()=>({ok:true as const,data:{}})),publish=vi.fn(async()=>({ok:false as const,error:{code:"VALIDATION_ERROR",message:"Missing tags",fieldErrors:{stackTags:["Choose tags"]}}}));
 const view=await mount(<CrudForm schema={z.object({bio:z.string(),stackTags:z.array(z.string()),empty:z.array(z.string())})} fields={[{name:"bio",label:"Experience",type:"textarea"},{name:"stackTags",label:"Stack tags",type:"multiselect",options:StackTags.options},{name:"empty",label:"Empty options",type:"multiselect"}]} initialValues={{bio:"Draft",stackTags:["react"]}} onSubmit={save} onCancel={()=>{}} additionalActions={[{label:"Publish",onSubmit:publish}]}/>);
 try{expect(view.host.querySelector('button[role="checkbox"][data-state="checked"]')).not.toBeNull();view.fill("bio","Edited");await view.click("Publish");expect(publish).toHaveBeenCalledWith({bio:"Edited",stackTags:["react"],empty:[]});expect(view.host.textContent).toContain("Choose tags");expect(save).not.toHaveBeenCalled();
   const react=Array.from(view.host.querySelectorAll<HTMLButtonElement>('button[role="checkbox"]')).find(button=>button.closest("label")?.textContent==="React")!;await act(async()=>react.click());await view.click("Save");expect(save).toHaveBeenCalledWith({bio:"Edited",stackTags:[],empty:[]});
 }finally{await view.close();}
});
test("editor saves a draft and publishes via the same form, shows stable link and copies with recoverable failures",async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(response({ok:true,data:draft}));vi.stubGlobal("fetch",fetcher);const view=await mount(<ProfileEditor options={StackTags.options} origin="https://site.test"/>);
 try{expect(view.host.textContent).toContain("Save draft");expect(view.host.textContent).toContain("account-wide name");expect(view.host.querySelector<HTMLInputElement>('[name="displayName"]')!.value).toBe("Mentor");expect(view.host.textContent).not.toContain("Your share link");fetcher.mockResolvedValueOnce(response({ok:true,data:draft})).mockResolvedValueOnce(response({ok:true,data:published})).mockResolvedValueOnce(response({ok:true,data:published}));await view.click("Save and publish");expect(fetcher.mock.calls.map(call=>call[0])).toEqual(["/api/mentors/me","/api/mentors/me","/api/mentors/me/publish","/api/mentors/me"]);expect(view.host.textContent).toContain("Your profile is published");expect(view.host.textContent).toContain("Profile updated");expect(view.host.querySelector('a[href="https://site.test/m/mentor-1"]')).not.toBeNull();
   const writeText=vi.fn().mockResolvedValue(undefined);Object.defineProperty(view.dom.window.navigator,"clipboard",{value:{writeText},configurable:true});const shareInput=view.host.querySelector<HTMLInputElement>("#profile-share-url")!;await act(async()=>shareInput.click());expect(shareInput.selectionEnd).toBe(shareInput.value.length);await view.click("Copy link");expect(writeText).toHaveBeenCalledWith("https://site.test/m/mentor-1");expect(view.host.textContent).toContain("Link copied");writeText.mockRejectedValueOnce(new Error("denied"));await view.click("Copy link");expect(view.host.textContent).toContain("Select and copy");expect(view.host.textContent).not.toContain("Link copied.");Object.defineProperty(view.dom.window.navigator,"clipboard",{value:undefined,configurable:true});await view.click("Copy link");expect(view.host.textContent).toContain("Unable to copy");
   fetcher.mockResolvedValueOnce(response({ok:false,error:{code:"FORBIDDEN",message:"Access changed"}},403));await view.click("Unpublish");expect(view.host.textContent).toContain("Access changed");fetcher.mockResolvedValueOnce(response({ok:true,data:{}})).mockResolvedValueOnce(response({ok:true,data:{...published,publishedAt:null}}));await view.click("Unpublish");expect(view.host.textContent).toContain("Your page is hidden until you publish again");expect(view.host.textContent).toContain("Profile unpublished");
 }finally{await view.close();}
});
test("editor retains inputs on save/publish failures, supports cancel/retry and uses browser origin for local links",async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(response({ok:true,data:{...published,publicWorkUrl:null,bio:null,stackTags:[]}}));vi.stubGlobal("fetch",fetcher);const view=await mount(<ProfileEditor options={StackTags.options} origin=""/>);
 try{const writeText=vi.fn().mockResolvedValue(undefined);Object.defineProperty(view.dom.window.navigator,"clipboard",{value:{writeText},configurable:true});await view.click("Copy link");expect(writeText).toHaveBeenCalledWith("https://local.test/m/mentor-1");view.fill("bio","Keep this input");view.fill("displayName","Edited account name");fetcher.mockResolvedValueOnce(response({ok:false,error:{code:"VALIDATION_ERROR",message:"Missing work",fieldErrors:{publicWorkUrl:["Add work"]}}},422));await view.click("Save changes");expect(view.host.textContent).toContain("Add work");expect(view.host.querySelector<HTMLInputElement>('[name="displayName"]')!.value).toBe("Edited account name");expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body).displayName).toBe("Edited account name");expect(view.host.querySelector<HTMLTextAreaElement>('[name="bio"]')!.value).toBe("Keep this input");
   fetcher.mockResolvedValueOnce(response({ok:true,data:draft}));await view.click("Cancel");fetcher.mockResolvedValueOnce(response({ok:false,error:{code:"OFFLINE",message:"Save failed"}},503));await view.click("Save and publish");expect(view.host.textContent).toContain("Save failed");expect(fetcher.mock.calls.at(-1)?.[0]).toBe("/api/mentors/me");fetcher.mockResolvedValueOnce(response({ok:true,data:draft})).mockResolvedValueOnce(response({ok:true,data:draft}));await view.click("Save draft");expect(view.host.textContent).toContain("Profile updated");
 }finally{await view.close();}
});
test("new partial forms default textarea text and multiselect values to empty while preserving explicit choices",async()=>{
 const save=vi.fn(async()=>({ok:true as const,data:{}}));const view=await mount(<CrudForm schema={z.object({bio:z.string(),stackTags:z.array(z.string())})} fields={[{name:"bio",label:"Experience",type:"textarea"},{name:"stackTags",label:"Tags",type:"multiselect",options:StackTags.options}]} onSubmit={save} onCancel={()=>{}}/>);
 try{expect(view.host.querySelector<HTMLTextAreaElement>("textarea")!.value).toBe("");expect(view.host.querySelectorAll('[role="checkbox"][data-state="checked"]').length).toBe(0);await view.click("Save");expect(save).toHaveBeenCalledWith({bio:"",stackTags:[]});}finally{await view.close();}
});

test("mentor home links each readiness item to the editor and distinguishes unpublished from published pages",async()=>{
 vi.spyOn(SessionService.prototype,"resolve").mockResolvedValue({id,displayName:"Mentor",roles:["developer","mentor"]});vi.spyOn(InvitationService.prototype,"onboarding").mockResolvedValue({initialPublishDueAt:null});const get=vi.spyOn(MentorProfileService.prototype,"getMine").mockResolvedValue(draft);const pending=renderToStaticMarkup(await MentorHome());expect(pending).toContain("Missing");expect(pending).toContain('href="/mentor/profile"');get.mockResolvedValue(published);expect(renderToStaticMarkup(await MentorHome())).toContain("Complete");
});

test("resource hook consumes real fetch abort rejections on URL changes and unmount",async()=>{
 const aborted:string[]=[];
 const fetcher=vi.fn((url:string,options:RequestInit)=>new Promise<Response>((resolve,reject)=>{
   if(url==="/api/ready"){resolve(response({ok:true,data:"Current"}));return;}
   options.signal!.addEventListener("abort",()=>{aborted.push(url);reject(new DOMException("Request aborted","AbortError"));},{once:true});
 }));
 vi.stubGlobal("fetch",fetcher);
 const view=await mount(<HookView url="/api/pending"/>);
 try{
   expect(view.host.textContent).toContain("Loading");
   await act(async()=>view.root.render(<HookView url="/api/ready"/>));
   expect(aborted).toEqual(["/api/pending"]);expect(view.host.textContent).toContain("Current");
   await act(async()=>view.root.render(<HookView url="/api/unmount"/>));
   expect(view.host.textContent).toContain("Loading");
 }finally{await view.close();}
 expect(aborted).toEqual(["/api/pending","/api/unmount"]);
 // Let Node deliver unhandled rejections; Vitest fails this test run if either abort escapes.
 await new Promise<void>(resolve=>setImmediate(resolve));
});

test("resource hook renders safe retry feedback for a rejected request contract",async()=>{
 const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
 const view=await mount(<HookView url="https://untrusted.test/private"/>);
 try{
   expect(view.host.textContent).toContain("Unable to load this resource. Please try again.");
   expect(view.host.textContent).not.toContain("untrusted.test");expect(fetcher).not.toHaveBeenCalled();
   fetcher.mockResolvedValueOnce(response({ok:true,data:"Recovered"}));
   await act(async()=>view.root.render(<HookView url="/api/recovered"/>));
   expect(view.host.textContent).toContain("Recovered");
 }finally{await view.close();}
});
