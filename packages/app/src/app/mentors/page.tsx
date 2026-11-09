import "../mentor.css";
import "../m/[slug]/public-profile.css";
import "./catalog.css";
import type { Metadata } from "next";
import { Catalog } from "./catalog";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {title: "Find a mentor | DevMentor"};
export default async function MentorsPage({searchParams}: {searchParams: Promise<{after?: string}>}) {
  const {after} = await searchParams;
  return <Catalog after={after}/>;
}
