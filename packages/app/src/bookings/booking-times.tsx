"use client";
import { useEffect, useState } from "react";
export function BookingTime({instant}:{instant:string}) {
 const [zone,setZone]=useState("UTC");useEffect(()=>{queueMicrotask(()=>setZone(Intl.DateTimeFormat().resolvedOptions().timeZone));},[]);
 return <time dateTime={instant}>{new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:zone}).format(new Date(instant))} ({zone}) · {instant} (UTC)</time>;
}
