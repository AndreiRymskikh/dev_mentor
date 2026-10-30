import { AuthFrame } from "@devmentor/ui/backend/frames";
import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Register | DevMentor" };
export default function RegisterPage() { return <AuthFrame><AuthForm mode="register" /></AuthFrame>; }
