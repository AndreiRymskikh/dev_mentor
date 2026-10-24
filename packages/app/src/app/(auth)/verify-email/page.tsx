import type { Metadata } from "next";
import { ActionForm } from "../action-form";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verify email | DevMentor", referrer: "no-referrer", robots: { index: false, follow: false } };
export default function VerifyEmailPage() { return <ActionForm mode="verify" />; }
