"use client";
import { protectedRequest } from "../../../auth/protected-request";
import { useState } from "react";
import { mentorProfileUpdateSchema, type OwnerMentorProfile } from "@devmentor/core/validators/mentors";
import { useApiResource } from "@devmentor/ui/backend/api";
import { CrudForm } from "@devmentor/ui/backend/forms";
import { ResourcePanel } from "@devmentor/ui/backend/panels";
import { ErrorMessage, ReadinessChecklist } from "@devmentor/ui/backend/feedback";
import { MentorPageView } from "@devmentor/ui/components/mentors";
import { Button } from "@devmentor/ui/components/ui/button";
import { Link } from "@devmentor/ui/components/ui/link";
export function ProfileEditor({options,origin}:{options:readonly {value:string;label:string}[];origin:string}) {
  const resource=useApiResource<OwnerMentorProfile>("/api/mentors/me", protectedRequest<OwnerMentorProfile>);const [working,setWorking]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
  async function request(path:string,method:string,values:unknown) {setWorking(true);setNotice("");setError("");const result=await protectedRequest(path,{method,body:JSON.stringify(values)});setWorking(false);return result;}
  async function copyLink(share:string) {setNotice("");setError("");try{await navigator.clipboard.writeText(origin?share:`${window.location.origin}${share}`);setNotice("Link copied.");}catch{setError("Unable to copy the link. Select and copy the link above.");}}
  return <ResourcePanel resource={resource}>{profile=>{
    const share=profile.slug?`${origin}/m/${profile.slug}`:null;
    return <div className="grid gap-group"><h1>Your mentor profile</h1><p>{profile.publishedAt?"Your profile is published.":"Your profile is a draft. Save it as you go, then publish when it is ready."}</p>
      <CrudForm schema={mentorProfileUpdateSchema} fields={[{name:"publicWorkUrl",label:"Link to your public work",hint:"A public HTTP or HTTPS link, such as your GitHub profile."},{name:"bio",label:"Your experience",type:"textarea",hint:"Describe what you have done, in up to 2,000 characters."},{name:"stackTags",label:"Stack tags",type:"multiselect",options}]} initialValues={{publicWorkUrl:profile.publicWorkUrl??"",bio:profile.bio??"",stackTags:profile.stackTags}}
        onSubmit={values=>request("/api/mentors/me","PUT",values)} onCancel={resource.reload} onSuccess={()=>{setNotice("Profile updated.");resource.reload();}} submitLabel={profile.publishedAt?"Save changes":"Save draft"}
        additionalActions={profile.publishedAt?[]:[{label:"Save and publish",onSubmit:async values=>{const saved=await request("/api/mentors/me","PUT",values);return saved.ok?request("/api/mentors/me/publish","POST",{}):saved;}}]}/>
      <ReadinessChecklist items={profile.readiness}/>
      {profile.publishedAt&&<Button variant="text" loading={working} onClick={()=>{void request("/api/mentors/me/unpublish","POST",{}).then(result=>{if(result.ok){setNotice("Profile unpublished.");resource.reload();}else setError(result.error.message);});}}>Unpublish</Button>}
      {share&&<section className="grid gap-group" aria-label="Share your profile"><h2>Your share link</h2><Link href={share}>{share}</Link><p>Your link stays the same when you change your display name. {profile.publishedAt?"Anyone with the link can see your page.":"Your page is hidden until you publish again."}</p><Button variant="text" disabled={working} onClick={()=>{void copyLink(share);}}>Copy link</Button></section>}
      {notice&&<p role="status">{notice}</p>}{error&&<ErrorMessage message={error}/>}
      <section className="grid gap-group" aria-label="Profile preview"><h2>Preview</h2><MentorPageView heading="h3" displayName={profile.displayName} bio={profile.bio} publicWorkUrl={profile.publicWorkUrl} tags={options.filter(option=>profile.stackTags.includes(option.value)).map(option=>option.label)}/></section>
    </div>;
  }}</ResourcePanel>;
}
