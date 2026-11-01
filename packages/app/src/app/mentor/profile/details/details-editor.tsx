"use client";
import { useState } from "react";
import { mentorDetailsUpdateSchema, SessionLanguages, type PublicMentorProfileDetails } from "@devmentor/core/validators/mentors";
import { useApiResource } from "@devmentor/ui/backend/api";
import { ResourcePanel } from "@devmentor/ui/backend/panels";
import { useFormState } from "@devmentor/ui/backend/forms";
import { ErrorMessage } from "@devmentor/ui/backend/feedback";
import { Button } from "@devmentor/ui/components/ui/button";
import { protectedRequest } from "../../../../auth/protected-request";
export function PublicDetailsEditor() {
  const resource=useApiResource<PublicMentorProfileDetails>("/api/mentors/me/details",protectedRequest<PublicMentorProfileDetails>);
  return <ResourcePanel resource={resource}>{details=><DetailsForm details={details}/>}</ResourcePanel>;
}
export function DetailsForm({details}:{details:PublicMentorProfileDetails}) {
  const [topics,setTopics]=useState(details.helpTopics.length),[steps,setSteps]=useState(details.sessionSteps.length),[sample,setSample]=useState(Boolean(details.sampleAnswer)),[saved,setSaved]=useState(false);
  const {pending,errors,message,submit}=useFormState({schema:mentorDetailsUpdateSchema,onSubmit:values=>protectedRequest("/api/mentors/me/details",{method:"PUT",body:JSON.stringify(values)}),onSuccess:()=>setSaved(true)});
  function save(form:HTMLFormElement) {
    setSaved(false);const data=new FormData(form),text=(name:string)=>String(data.get(name));
    const rows=(name:string,count:number)=>Array.from({length:count},(_,index)=>({title:text(`${name}.${index}.title`),description:text(`${name}.${index}.description`)}));
    void submit({sessionLanguage:text("sessionLanguage")||null,mentorTimeZone:text("mentorTimeZone")||null,helpTopics:rows("helpTopics",topics),sessionSteps:rows("sessionSteps",steps),sampleAnswer:sample?{title:text("sample.title"),intro:text("sample.intro"),codeExcerpt:text("sample.codeExcerpt"),body:text("sample.body")}:null,...(sample?{sampleOwnershipConfirmed:data.get("sampleOwnershipConfirmed")==="on"}: {})});
  }
  const field=(name:string,label:string,value:string,max:number,multiline=false)=><label key={name} className="dm-details-field">{label}{multiline?<textarea name={name} defaultValue={value} maxLength={max} aria-invalid={Boolean(errors[name])}/>:<input name={name} defaultValue={value} maxLength={max} aria-invalid={Boolean(errors[name])}/>}</label>;
  return <form onSubmit={event=>{event.preventDefault();save(event.currentTarget);}} className="dm-details-form" noValidate aria-label="Public profile details" aria-busy={pending}>
    <p>All fields are optional and public when your profile is published. Leave sections empty to hide them. They do not affect publication readiness.</p>
    <fieldset disabled={pending}><legend>Language and timezone</legend><label className="dm-details-field">Session language<select name="sessionLanguage" defaultValue={details.sessionLanguage??""}><option value="">Not specified</option>{SessionLanguages.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    {field("mentorTimeZone","Mentor timezone (IANA)",details.mentorTimeZone??"",100)}<p>For example Europe/Warsaw or America/New_York. We never infer it from your device.</p></fieldset>
    {([{name:"helpTopics",label:"What I can help with",count:topics,set:setTopics,max:6,values:details.helpTopics,add:"Add help topic",remove:"Remove last help topic"},{name:"sessionSteps",label:"How I run a session",count:steps,set:setSteps,max:5,values:details.sessionSteps,add:"Add session step",remove:"Remove last session step"}] as const).map(group=><fieldset key={group.name} disabled={pending}><legend>{group.label}</legend><p>Displayed in this order. Up to {group.max} items. Remove the last item to shorten the list.</p>{Array.from({length:group.count},(_,index)=><div key={index} className="dm-details-row">{field(`${group.name}.${index}.title`,`${group.label}: title ${index+1}`,group.values[index]?.title??"",100)}{field(`${group.name}.${index}.description`,`${group.label}: description ${index+1}`,group.values[index]?.description??"",500,true)}</div>)}<div className="dm-form-actions"><Button variant="text" disabled={group.count===group.max} onClick={()=>group.set(group.count+1)}>{group.add}</Button><Button variant="text" disabled={group.count===0} onClick={()=>group.set(group.count-1)}>{group.remove}</Button></div></fieldset>)}
    <fieldset disabled={pending}><legend>Sample answer</legend><label><input type="checkbox" checked={sample} onChange={event=>setSample(event.target.checked)}/> Include a public sample answer</label><p>Publish only your own example, with no private session content, personal information or credentials. Plain text only; code is displayed as text.</p>
    {sample&&<>{field("sample.title","Sample title",details.sampleAnswer?.title??"",160)}{field("sample.intro","Sample introduction",details.sampleAnswer?.intro??"",500,true)}{field("sample.codeExcerpt","Code excerpt (optional)",details.sampleAnswer?.codeExcerpt??"",2000,true)}{field("sample.body","Full sample answer",details.sampleAnswer?.body??"",10000,true)}<label><input name="sampleOwnershipConfirmed" type="checkbox"/> I own this sample and have removed private information.</label></>}</fieldset>
    {message&&<ErrorMessage message={message}/>}<ul aria-label="Details validation errors">{Object.entries(errors).map(([name,values])=><li role="alert" key={name}>{name}: {values.join(" ")}</li>)}</ul>
    {saved&&<p role="status">Public details saved.</p>}<Button type="submit" disabled={pending}>{pending?"Saving details…":"Save public details"}</Button>
  </form>;
}
