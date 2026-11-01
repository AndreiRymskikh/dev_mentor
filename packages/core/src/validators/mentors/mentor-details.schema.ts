import { z } from "zod";
export const SessionLanguages = [{value:"en",label:"English"},{value:"pl",label:"Polish"},{value:"fr",label:"French"},{value:"de",label:"German"},{value:"es",label:"Spanish"},{value:"uk",label:"Ukrainian"},{value:"ru",label:"Russian"},{value:"pt",label:"Portuguese"},{value:"it",label:"Italian"},{value:"ja",label:"Japanese"},{value:"zh",label:"Chinese"}] as const;
const text=(max:number)=>z.string().trim().min(1).max(max);
const item=z.strictObject({title:text(100),description:text(500)});
const ordered=(max:number)=>z.array(item).max(max).refine(items=>new Set(items.map(item=>item.title.toLowerCase())).size===items.length,"Use distinct titles.");
export function validTimeZone(value:string):boolean {try{new Intl.DateTimeFormat("en",{timeZone:value});return true;}catch{return false;}}
export const mentorDetailsUpdateSchema=z.strictObject({
  sessionLanguage:z.enum(SessionLanguages.map(option=>option.value)).nullable().optional(),
  mentorTimeZone:text(100).refine(validTimeZone,"Use a valid IANA timezone, such as Europe/Warsaw.").nullable().optional(),
  helpTopics:ordered(6).optional(),
  sampleAnswer:z.strictObject({title:text(160),intro:text(500),codeExcerpt:z.string().max(2000),body:text(10000)}).nullable().optional(),
  sampleOwnershipConfirmed:z.literal(true,{error:"Confirm you own this public sample and have removed private information."}).optional(),
  sessionSteps:ordered(5).optional(),
}).refine(value=>!value.sampleAnswer||value.sampleOwnershipConfirmed===true,{path:["sampleOwnershipConfirmed"],message:"Confirm you own this public sample and have removed private information."});
export type PublicMentorProfileDetails={sessionLanguage:string|null;mentorTimeZone:string|null;helpTopics:{title:string;description:string}[];sampleAnswer:{title:string;intro:string;codeExcerpt:string;body:string}|null;sessionSteps:{title:string;description:string}[]};
