import type { ReactNode } from "react";
import { WorkspaceFrame, type WorkspaceNavigationItem } from "@devmentor/ui/backend/frames";
interface WorkspaceProps { identity: string; roles: readonly string[]; current: "account" | "mentor" | "operator" | "users" | "profile"; signOut: ReactNode; children: ReactNode }
/** Server composition supplies current-role navigation; the frame only presents it. */
export function Workspace({ identity, roles, ...props }: WorkspaceProps) {
  const navigation: WorkspaceNavigationItem[] = [
    { key: "account", label: "My sessions", href: "/account", icon: "calendar" },
    { key: "catalog", label: "Browse mentors", reason: "The mentor catalog is not available yet.", icon: "person" },
    ...(roles.includes("mentor") ? [
      { key: "mentor", label: "Mentor home", href: "/mentor", icon: "home" as const },
      { key: "profile", label: "Mentor profile", href: "/mentor/profile", icon: "person" as const },
      { key: "notes", label: "Private notes", reason: "Private notes are not available yet.", icon: "notes" as const },
    ] : []),
    ...(roles.includes("administrator") ? [
      { key: "operator", label: "Operator home", href: "/admin/workspace", icon: "home" as const },
      { key: "users", label: "Users", href: "/admin/users", icon: "users" as const },
    ] : []),
  ];
  return <WorkspaceFrame {...props} identity={identity} roles={roles.map(role => role === "developer" ? "Mentee" : role === "administrator" ? "Operator" : "Mentor")} navigation={navigation} />;
}
