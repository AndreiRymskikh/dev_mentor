"use client";
import { useRef, useState } from "react";
import { apiCall, type ApiResult } from "@devmentor/ui/backend/api";
import type { BookingMutationResult } from "@devmentor/core/validators/bookings";
const key="devmentor.booking-attempt";
/** A timeout is not failure. Freeze that intent and reconcile using the original key. */
export function useBookingCommand() {
 const attempt=useRef<{path:string;body:string}|null>(null),[pending,setPending]=useState(false),[uncertain,setUncertain]=useState(false);
 async function execute(path:string,input:Record<string,unknown>):Promise<ApiResult<BookingMutationResult>> {
  if(pending)return {ok:false,error:{code:"PENDING",message:"Please wait."}};
  setPending(true);
  try {
   if(!attempt.current) {
    const intent=JSON.stringify(input);
    let stored:unknown=null;try{stored=JSON.parse(sessionStorage.getItem(key)??"null");}catch{stored=null;}
    const retained=stored&&typeof stored==="object"&&"intent" in stored&&stored.intent===intent&&"path" in stored&&stored.path===path&&"body" in stored&&typeof stored.body==="string"&&stored.body.length<8192?stored.body:null;
    const body=retained??JSON.stringify({...input,requestId:crypto.randomUUID()});attempt.current={path,body};
    // Never persist private cancellation reasons. Existing-record mutations reconcile in memory.
    if(path==="/api/bookings")try{sessionStorage.setItem(key,JSON.stringify({path,intent,body}));}catch{ /* Memory retry remains available with storage denied. */ }
   }
   const result=await apiCall<BookingMutationResult>(attempt.current.path,{method:"POST",body:attempt.current.body});
   const unknown=!result.ok&&["NETWORK_ERROR","INVALID_RESPONSE","INTERNAL_ERROR","SERVICE_UNAVAILABLE"].includes(result.error.code);
   setUncertain(unknown);
   if(!unknown){attempt.current=null;try{sessionStorage.removeItem(key);}catch{ /* No retained attempt is required after an authoritative result. */ }}
   return unknown?{ok:false,error:{code:"OUTCOME_UNKNOWN",message:"Outcome unknown. Retry this same attempt to reconcile before changing your booking."}}:result;
  }finally{setPending(false);}
 }
 return {execute,pending,uncertain};
}
