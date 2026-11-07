"use client";
import { useEffect, useRef, useState } from "react";
/** Reveal confirmed persistence beside the save action, including after resource reloads. */
export function SaveConfirmation({message}:{message:string}) {
  const ref=useRef<HTMLParagraphElement>(null),[visible,setVisible]=useState(true);
  useEffect(()=>{ref.current?.focus();const timeout=setTimeout(()=>setVisible(false),3000);return ()=>clearTimeout(timeout);},[]);
  return visible?<p ref={ref} tabIndex={-1} role="status" className="dm-save-confirmation"><strong>{message}</strong> Your changes have been saved successfully.</p>:null;
}
