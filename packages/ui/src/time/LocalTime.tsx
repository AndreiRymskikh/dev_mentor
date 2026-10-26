"use client";
import { useSyncExternalStore } from "react";
export function formatInstant(value: string, timeZone = "UTC") {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(value));
}
const subscribe = () => () => undefined;
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverZone = () => "UTC";
export function LocalTime({ value }: { value: string }) {
  const zone = useSyncExternalStore(subscribe, browserZone, serverZone);
  return <time dateTime={value}>{formatInstant(value, zone)} ({zone})</time>;
}
