import { AuthFrame } from "@devmentor/ui/backend/frames";
import type { Metadata } from "next";
import { ActionForm } from "../action-form";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reset password | DevMentor", referrer: "no-referrer", robots: { index: false, follow: false } };
export default function ResetPasswordPage() { return <AuthFrame><ActionForm mode="reset" /></AuthFrame>; }
