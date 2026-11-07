import { z } from "zod";
export const SessionLanguages = [{value:"en",label:"English"},{value:"pl",label:"Polish"},{value:"fr",label:"French"},{value:"de",label:"German"},{value:"es",label:"Spanish"},{value:"uk",label:"Ukrainian"},{value:"ru",label:"Russian"},{value:"pt",label:"Portuguese"},{value:"it",label:"Italian"},{value:"ja",label:"Japanese"},{value:"zh",label:"Chinese"}] as const;
const text=(max:number,label:string)=>z.string().trim().min(1,`${label} is required.`).max(max);
const item=z.strictObject({title:text(100,"Title"),description:text(500,"Description")});
const ordered=(max:number)=>z.array(item).max(max).refine(items=>new Set(items.map(item=>item.title.toLowerCase())).size===items.length,"Use distinct titles.");
export function validTimeZone(value:string):boolean {try{const zone=new Intl.DateTimeFormat("en",{timeZone:value}).resolvedOptions().timeZone;return !/^[+-]/.test(zone);}catch{return false;}}
export const mentorDetailsUpdateSchema=z.strictObject({
  sessionLanguage:z.enum(SessionLanguages.map(option=>option.value)).nullable().optional(),
  mentorTimeZone:text(100,"Mentor timezone").refine(validTimeZone,"Use a valid IANA timezone, such as Europe/Warsaw.").nullable().optional(),
  helpTopics:ordered(6).optional(),
  sampleAnswer:z.strictObject({title:text(160,"Sample title"),intro:text(500,"Sample introduction"),codeExcerpt:z.string().max(2000),body:text(10000,"Full sample answer")}).nullable().optional(),
  sampleOwnershipConfirmed:z.literal(true,{error:"Confirm you own this public sample and have removed private information."}).optional(),
  sessionSteps:ordered(5).optional(),
}).refine(value=>!value.sampleAnswer||value.sampleOwnershipConfirmed===true,{path:["sampleOwnershipConfirmed"],message:"Confirm you own this public sample and have removed private information."});
export type PublicMentorProfileDetails={sessionLanguage:string|null;mentorTimeZone:string|null;helpTopics:{title:string;description:string}[];sampleAnswer:{title:string;intro:string;codeExcerpt:string;body:string}|null;sessionSteps:{title:string;description:string}[]};
