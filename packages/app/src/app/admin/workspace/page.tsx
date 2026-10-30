import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { WorkspaceFrame } from "@devmentor/ui/backend/frames";
import { Link } from "@devmentor/ui/components/ui/link";
import { LogoutButton } from "../../(auth)/account/logout-button";
import { adminAccess } from "../admin-access";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Operator workspace | DevMentor", robots: { index: false, follow: false } };
export default async function OperatorPage() {
  return adminAccess((_id, _users, identity, roles) => <WorkspaceFrame identity={identity} roles={roles} current="operator" signOut={<LogoutButton />}><h1>Operator workspace</h1><section className="dm-workspace-panel grid gap-group"><ShieldCheck aria-hidden="true" /><h2>Manage workspace access</h2><p>Only administrators can grant operator access. Verified users can choose to become mentors from their account.</p><Link className="dm-button dm-button-primary dm-size-default dm-primary-link" href="/admin/users">View users</Link></section></WorkspaceFrame>);
}
