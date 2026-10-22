import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { withScope } from "@devmentor/core/container";
import { readSessionCookie } from "../../../auth/session-cookie";
import { LogoutButton } from "./logout-button";
import { Link } from "@devmentor/ui/components/ui/link";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your account | DevMentor", robots: { index: false, follow: false } };
export default async function AccountPage() {
  let principal;
  try {
    const token = readSessionCookie({ headers: await headers() });
    principal = await withScope(({ sessionService }) => sessionService.resolve(token));
  } catch {
    return <div role="alert"><h1>Account temporarily unavailable</h1><p>We could not load your account. Please try again.</p><Link href="/account">Try again</Link></div>;
  }
  if (!principal) redirect("/login");
  return <div className="grid gap-group"><h1 className="text-3xl font-semibold">Your account</h1><p>{principal.displayName}</p><h2>Roles</h2><ul>{principal.roles.map((role) => <li key={role}>{role}</li>)}</ul><LogoutButton /></div>;
}
