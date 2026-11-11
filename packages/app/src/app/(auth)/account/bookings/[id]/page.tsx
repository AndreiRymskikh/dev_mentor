import { PrivateContent } from "../../../../../auth/private-content";
import { BookingDetailPanel } from "./detail";
import "../../../../mentor.css";
import "../../../../bookings.css";
export const dynamic="force-dynamic";
export const metadata={title:"Private booking | DevMentor",robots:{index:false,follow:false}};
export default async function BookingPage({params}:{params:Promise<{id:string}>}) {return <PrivateContent><main className="dm-booking"><BookingDetailPanel id={(await params).id}/></main></PrivateContent>;}
