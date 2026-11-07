"use client";
import { useEffect, useRef } from "react";
/** Reveal confirmed persistence beside the save action, including after resource reloads. */
export function SaveConfirmation({message}:{message:string}) {
  const ref=useRef<HTMLParagraphElement>(null);
  useEffect(()=>{ref.current?.focus();},[message]);
  return <p ref={ref} tabIndex={-1} role="status" className="dm-save-confirmation"><strong>{message}</strong> Your changes have been saved successfully.</p>;
}
