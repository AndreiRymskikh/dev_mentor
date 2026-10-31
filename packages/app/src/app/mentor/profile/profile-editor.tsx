"use client";
import { protectedRequest } from "../../../auth/protected-request";
import { useState } from "react";
import { mentorProfileUpdateSchema, type OwnerMentorProfile } from "@devmentor/core/validators/mentors";
import { useApiResource } from "@devmentor/ui/backend/api";
import { CrudForm } from "@devmentor/ui/backend/forms";
import { ResourcePanel } from "@devmentor/ui/backend/panels";
import { ErrorMessage, ReadinessChecklist } from "@devmentor/ui/backend/feedback";
import { MentorPageView } from "@devmentor/ui/components/mentors";
import { Badge } from "@devmentor/ui/components/ui/badge";
import { Copy, ExternalLink, Link2 } from "lucide-react";
import { Input } from "@devmentor/ui/components/ui/input";
import { Button } from "@devmentor/ui/components/ui/button";
import { Link } from "@devmentor/ui/components/ui/link";
export function ProfileEditor({options,origin}:{options:readonly {value:string;label:string}[];origin:string}) {
  const resource=useApiResource<OwnerMentorProfile>("/api/mentors/me", protectedRequest<OwnerMentorProfile>);const [working,setWorking]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
  async function request(path:string,method:string,values:unknown) {setWorking(true);setNotice("");setError("");const result=await protectedRequest(path,{method,body:JSON.stringify(values)});setWorking(false);return result;}
  async function copyLink(share:string) {setNotice("");setError("");try{await navigator.clipboard.writeText(origin?share:`${window.location.origin}${share}`);setNotice("Link copied.");}catch{setError("Unable to copy the link. Select and copy the link above.");}}
  return <ResourcePanel resource={resource}>{profile=>{
    const share=profile.slug?`${origin}/m/${profile.slug}`:null;
    return <div className="dm-profile-editor"><div className="dm-profile-heading"><div className="dm-profile-eyebrow">Your public profile <Badge variant="outline">{profile.publishedAt?"Published":"Draft"}</Badge></div><h1>Show mentees how you can help</h1><p>Describe your work and the problems you know well. Your public work gives mentees an example to look at.</p><p className="sr-only">Your mentor profile. {profile.publishedAt?"Your profile is published.":"Your profile is a draft. Save it as you go, then publish when it is ready."}</p></div>
      <div className="dm-profile-columns"><section className="dm-profile-card" aria-label="Edit your mentor profile">
      <CrudForm schema={mentorProfileUpdateSchema} fields={[{name:"displayName",label:"Display name",required:true,hint:"Changes your account-wide name, including your public mentor profile. Use 1–100 characters."},{name:"bio",label:"About your mentoring",type:"textarea",hint:"Share the topics you know and the kind of help people can expect. Up to 2,000 characters."},{name:"publicWorkUrl",label:"Public work link",hint:"Link to a public repository, portfolio or technical article that shows your work. Use HTTP or HTTPS."},{name:"stackTags",label:"Technologies and topics",hint:"Choose up to four topics. People will see these on your profile.",type:"multiselect",options:options.map(option=>({...option,icon:({typescript:"TS",react:"⚛",python:"Py","ai-agents":"</>"} as Record<string,string>)[option.value]}))}]} initialValues={{displayName:profile.displayName,publicWorkUrl:profile.publicWorkUrl??"",bio:profile.bio??"",stackTags:profile.stackTags}}
        onSubmit={values=>request("/api/mentors/me","PUT",values)} onCancel={resource.reload} onSuccess={()=>{setNotice("Profile updated.");resource.reload();}} submitLabel={profile.publishedAt?"Save changes":"Save draft"}
        additionalActions={profile.publishedAt?[]:[{label:"Save and publish",onSubmit:async values=>{const saved=await request("/api/mentors/me","PUT",values);return saved.ok?request("/api/mentors/me/publish","POST",{}):saved;}}]}/>
      <ReadinessChecklist items={profile.readiness}/>
      {profile.publishedAt&&<Button variant="text" loading={working} onClick={()=>{void request("/api/mentors/me/unpublish","POST",{}).then(result=>{if(result.ok){setNotice("Profile unpublished.");resource.reload();}else setError(result.error.message);});}}>Unpublish</Button>}
      </section><aside className="dm-profile-share"><section className="dm-profile-card" aria-label="Share your profile"><Link2 aria-hidden="true"/><h2>Share your profile</h2>
      {share?<><Link className="dm-profile-preview-link" href={share}><ExternalLink aria-hidden="true"/>Preview public page</Link><label className="dm-label" htmlFor="profile-share-url">Your share link</label><Input id="profile-share-url" readOnly value={share} onClick={event=>event.currentTarget.select()}/><p>Your link stays the same when you change your display name. {profile.publishedAt?"Anyone with the link can see your page.":"Your page is hidden until you publish again."}</p><Button variant="text" disabled={working} onClick={()=>{void copyLink(share);}}><Copy aria-hidden="true"/>Copy link</Button></>:<p>Save your draft, then publish to create your public link. Your private preview is below.</p>}
      </section><p>Session prices and availability are managed from your mentor workspace.</p></aside></div>
      {notice&&<p role="status">{notice}</p>}{error&&<ErrorMessage message={error}/>}
      <section className="dm-profile-card dm-profile-preview" aria-label="Profile preview"><h2>Preview</h2><MentorPageView heading="h3" displayName={profile.displayName} bio={profile.bio} publicWorkUrl={profile.publicWorkUrl} tags={options.filter(option=>profile.stackTags.includes(option.value)).map(option=>option.label)}/></section>
    </div>;
  }}</ResourcePanel>;
}
