import { BookingReview } from "./review";
import "../../mentor.css";
import "../../bookings.css";
export const dynamic="force-dynamic";
export const metadata={title:"Review booking | DevMentor",robots:{index:false,follow:false}};
export default async function BookPage({params,searchParams}:{params:Promise<{mentorSlug:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 const {mentorSlug}=await params,query=await searchParams;
 return <main className="dm-booking"><BookingReview slug={mentorSlug} slot={typeof query.slot==="string"?query.slot:""} duration={query.duration==="50"?50:25}/></main>;
}
