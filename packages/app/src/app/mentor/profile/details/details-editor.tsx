"use client";
import { useState, useRef, useEffect } from "react";
import { mentorDetailsUpdateSchema, SessionLanguages, type PublicMentorProfileDetails } from "@devmentor/core/validators/mentors";
import { useApiResource } from "@devmentor/ui/backend/api";
import { ResourcePanel } from "@devmentor/ui/backend/panels";
import { useFormState } from "@devmentor/ui/backend/forms";
import { FormField } from "@devmentor/ui/backend/fields";
import { Input } from "@devmentor/ui/components/ui/input";
import { Textarea } from "@devmentor/ui/components/ui/textarea";
import { ErrorMessage, SaveConfirmation } from "@devmentor/ui/backend/feedback";
import { Button } from "@devmentor/ui/components/ui/button";
import { protectedRequest } from "../../../../auth/protected-request";
export function PublicDetailsEditor() {
  const resource=useApiResource<PublicMentorProfileDetails>("/api/mentors/me/details",protectedRequest<PublicMentorProfileDetails>);
  return <ResourcePanel resource={resource}>{details=><DetailsForm details={details}/>}</ResourcePanel>;
}
export function DetailsForm({details}:{details:PublicMentorProfileDetails}) {
  const formRef=useRef<HTMLFormElement>(null);
  const [topics,setTopics]=useState(details.helpTopics.length),[steps,setSteps]=useState(details.sessionSteps.length),[sample,setSample]=useState(Boolean(details.sampleAnswer)),[saved,setSaved]=useState(false);
  const {pending,errors,message,submit}=useFormState({schema:mentorDetailsUpdateSchema,onSubmit:values=>protectedRequest("/api/mentors/me/details",{method:"PUT",body:JSON.stringify(values)}),onSuccess:()=>setSaved(true)});
  useEffect(()=>{formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();},[errors]);
  function save(form:HTMLFormElement) {
    setSaved(false);const data=new FormData(form),text=(name:string)=>String(data.get(name));
    const rows=(name:string,count:number)=>Array.from({length:count},(_,index)=>({title:text(`${name}.${index}.title`),description:text(`${name}.${index}.description`)}));
    void submit({sessionLanguage:text("sessionLanguage")||null,mentorTimeZone:text("mentorTimeZone")||null,helpTopics:rows("helpTopics",topics),sessionSteps:rows("sessionSteps",steps),sampleAnswer:sample?{title:text("sampleAnswer.title"),intro:text("sampleAnswer.intro"),codeExcerpt:text("sampleAnswer.codeExcerpt"),body:text("sampleAnswer.body")}:null,...(sample?{sampleOwnershipConfirmed:data.get("sampleOwnershipConfirmed")==="on"}: {})});
  }
  const field=(name:string,label:string,value:string,max:number,multiline=false,required=true)=><FormField key={name} label={label} required={required} error={errors[name]?.join(" ")}>{control=>multiline?<Textarea {...control} name={name} defaultValue={value} maxLength={max}/>:<Input {...control} name={name} defaultValue={value} maxLength={max}/>}</FormField>;
  return <form ref={formRef} onSubmit={event=>{event.preventDefault();save(event.currentTarget);}} className="dm-details-form" noValidate aria-label="Public profile details" aria-busy={pending}>
    <p>These sections are optional and public when your profile is published. Added items require a title and description. Including a sample requires its title, introduction, full answer and ownership confirmation. Remove items or turn off the sample to omit them. These details do not affect publication readiness.</p>
    <fieldset disabled={pending}><legend>Language and timezone</legend><FormField label="Session language" error={errors.sessionLanguage?.join(" ")}>{control=><select {...control} className="dm-control" name="sessionLanguage" defaultValue={details.sessionLanguage??""}><option value="">Not specified</option>{SessionLanguages.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>}</FormField>
    {field("mentorTimeZone","Mentor timezone (IANA)",details.mentorTimeZone??"",100,false,false)}<p>For example Europe/Warsaw or America/New_York. We never infer it from your device.</p></fieldset>
    {([{name:"helpTopics",label:"What I can help with",count:topics,set:setTopics,max:6,values:details.helpTopics,add:"Add help topic",remove:"Remove last help topic"},{name:"sessionSteps",label:"How I run a session",count:steps,set:setSteps,max:5,values:details.sessionSteps,add:"Add session step",remove:"Remove last session step"}] as const).map(group=><fieldset key={group.name} disabled={pending}><legend>{group.label}</legend><p>Displayed in this order. Up to {group.max} items. Remove the last item to shorten the list.</p>{Array.from({length:group.count},(_,index)=><div key={index} className="dm-details-row">{field(`${group.name}.${index}.title`,`${group.label}: title ${index+1}`,group.values[index]?.title??"",100)}{field(`${group.name}.${index}.description`,`${group.label}: description ${index+1}`,group.values[index]?.description??"",500,true)}</div>)}<div className="dm-form-actions"><Button variant="text" disabled={group.count===group.max} onClick={()=>group.set(group.count+1)}>{group.add}</Button><Button variant="text" disabled={group.count===0} onClick={()=>group.set(group.count-1)}>{group.remove}</Button></div>{errors[group.name]&&<p role="alert" className="dm-field-error">{errors[group.name].join(" ")}</p>}</fieldset>)}
    <fieldset disabled={pending}><legend>Sample answer</legend><label><input type="checkbox" checked={sample} onChange={event=>setSample(event.target.checked)}/> Include a public sample answer</label><p>Publish only your own example, with no private session content, personal information or credentials. Plain text only; code is displayed as text.</p>
    {sample&&<>{field("sampleAnswer.title","Sample title",details.sampleAnswer?.title??"",160)}{field("sampleAnswer.intro","Sample introduction",details.sampleAnswer?.intro??"",500,true)}{field("sampleAnswer.codeExcerpt","Code excerpt",details.sampleAnswer?.codeExcerpt??"",2000,true,false)}{field("sampleAnswer.body","Full sample answer",details.sampleAnswer?.body??"",10000,true)}<FormField label="I own this sample and have removed private information." required error={errors.sampleOwnershipConfirmed?.join(" ")}>{control=><input {...control} className="dm-checkbox" name="sampleOwnershipConfirmed" type="checkbox"/>}</FormField></>}</fieldset>
    {message&&<ErrorMessage message={message}/>}{errors._form&&<ErrorMessage message={errors._form.join(" ")}/>}
    <Button type="submit" disabled={pending}>{pending?"Saving details…":"Save public details"}</Button>
    {saved&&<SaveConfirmation message="Public details saved."/>}
  </form>;
}
