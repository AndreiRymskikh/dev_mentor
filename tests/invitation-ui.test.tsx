import { MentorProfileService } from "../packages/core/src/services/mentors/mentor-profile.service";
import { test, expect, vi } from "vitest";
import { act } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString, renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { InvitationService } from "../packages/core/src/services/invitations/invitation.service";
import { SessionService } from "../packages/core/src/services/users/session.service";
import { AppError, NotFoundError } from "@devmentor/core/http";
import { LocalTime, formatInstant } from "../packages/ui/src/time";
import InvitationPage from "../packages/app/src/app/invitation/[token]/page";
import MentorPage from "../packages/app/src/app/mentor/page";
import { AcceptButton } from "../packages/app/src/app/invitation/[token]/accept-button";
const { replace,refresh }=vi.hoisted(()=>({replace:vi.fn(),refresh:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>({replace,refresh}),redirect:(url:string)=>{throw new Error("redirect:"+url);}}));
vi.mock("next/headers",()=>({headers:async()=>new Headers()}));
const token="a".repeat(43), id="00000000-0000-4000-8000-000000000001",date="2026-11-09T12:00:00.000Z";
function setup(html="<div id='root'></div>") {const dom=new JSDOM(html,{url:"http://localhost"});for(const [key,value]of Object.entries({window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true}))vi.stubGlobal(key,value);return {dom,host:dom.window.document.getElementById("root")!};}
test("invitation page shows identical invalid states, safe infrastructure errors and verified identity controls",async()=>{
  const lookup=vi.spyOn(InvitationService.prototype,"lookup").mockResolvedValue({email:"invited@example.test",stackTags:["react"],expiresAt:date});const resolve=vi.spyOn(SessionService.prototype,"resolve").mockResolvedValue(null);const identity=vi.spyOn(InvitationService.prototype,"identity").mockResolvedValue("invited@example.test");const render=async()=>renderToStaticMarkup(await InvitationPage({params:Promise.resolve({token})}));
  expect(await render()).toContain("returnTo=");expect(await render()).not.toContain("Accept invitation");
  resolve.mockResolvedValue({id,displayName:"Invited",roles:["developer"]});expect(await render()).toContain("Accept invitation");
  identity.mockResolvedValue("wrong@example.test");expect(await render()).toContain("wrong@example.test");expect(await render()).not.toContain("Accept invitation");
  for(const error of [new NotFoundError(),new AppError("MISSING","missing",404)]){lookup.mockRejectedValueOnce(error);expect(await render()).toContain("This invitation is not valid");}
  for(const error of [new Error("secret"),new AppError("OFFLINE","private",503)]){lookup.mockRejectedValueOnce(error);const html=await render();expect(html).toContain("Unable to load");expect(html).not.toContain("secret");}
});
test("mentor home protects current membership and renders durable deadline or self-service guidance",async()=>{
  vi.spyOn(MentorProfileService.prototype,"getMine").mockResolvedValue({displayName:"Name",bio:null,publicWorkUrl:null,stackTags:[],slug:null,publishedAt:null,readiness:[]});
  const resolve=vi.spyOn(SessionService.prototype,"resolve").mockResolvedValue(null),onboarding=vi.spyOn(InvitationService.prototype,"onboarding").mockResolvedValue({initialPublishDueAt:date});
  await expect(MentorPage()).rejects.toThrow("redirect:/login");resolve.mockResolvedValue({id,displayName:"Name",roles:["developer"]});expect(renderToStaticMarkup(await MentorPage())).toContain("Mentor access is required");expect(onboarding).not.toHaveBeenCalled();
  resolve.mockResolvedValue({id,displayName:"Name",roles:["developer","mentor"]});expect(renderToStaticMarkup(await MentorPage())).toContain("Publish at least one bookable session");onboarding.mockResolvedValue({initialPublishDueAt:null});expect(renderToStaticMarkup(await MentorPage())).toContain("Prepare your mentor profile");
});
test("accept action prevents duplicate clicks, reports failures and navigates after success",async()=>{
  const {dom,host}=setup(),root=createRoot(host);const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
  try {await act(async()=>root.render(<AcceptButton token={token}/>));let finish!:(response:Response)=>void;fetcher.mockImplementationOnce(()=>new Promise<Response>(resolve=>{finish=resolve;}));await act(async()=>host.querySelector("button")!.click());expect(host.querySelector("button")!.disabled).toBe(true);
    await act(async()=>finish(Response.json({ok:false,error:{code:"FORBIDDEN",message:"Use the invited email"}},{status:403})));expect(host.textContent).toContain("Use the invited email");expect(replace).not.toHaveBeenCalled();
    fetcher.mockResolvedValueOnce(Response.json({ok:true,data:{initialPublishDueAt:date}}));await act(async()=>host.querySelector("button")!.click());expect(replace).toHaveBeenCalledWith("/mentor");expect(refresh).toHaveBeenCalled();expect(fetcher).toHaveBeenLastCalledWith(`/api/invitations/${token}/accept`,expect.objectContaining({method:"POST",body:"{}"}));
  }finally{await act(async()=>root.unmount());dom.window.close();vi.unstubAllGlobals();}
});
test("LocalTime hydrates from UTC then shows the viewer zone without an SSR mismatch",async()=>{
  expect(formatInstant(date)).toBe(formatInstant(date,"UTC"));const html=renderToString(<LocalTime value={date}/>);expect(html).toContain("UTC");const {dom,host}=setup(`<div id='root'>${html}</div>`);const original=Intl.DateTimeFormat().resolvedOptions();vi.spyOn(Intl.DateTimeFormat.prototype,"resolvedOptions").mockReturnValue({...original,timeZone:"Europe/Warsaw"});
  let root!:ReturnType<typeof hydrateRoot>;try{await act(async()=>{root=hydrateRoot(host,<LocalTime value={date}/>);});expect(host.textContent).toContain("Europe/Warsaw");expect(host.querySelector("time")!.dateTime).toBe(date);}finally{await act(async()=>root.unmount());dom.window.close();vi.unstubAllGlobals();}
});
