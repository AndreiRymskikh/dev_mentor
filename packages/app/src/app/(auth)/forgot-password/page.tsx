import { AuthFrame } from "@devmentor/ui/backend/frames";
import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Password recovery | DevMentor" };
export default function ForgotPasswordPage() { return <AuthFrame><AuthForm mode="forgot" /></AuthFrame>; }
