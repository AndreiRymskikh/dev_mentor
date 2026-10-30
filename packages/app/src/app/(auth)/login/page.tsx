import { AuthFrame } from "@devmentor/ui/backend/frames";
import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Login | DevMentor" };
export default function LoginPage() { return <AuthFrame><AuthForm mode="login" /></AuthFrame>; }
