"use client";
import { useRef, useState, type ReactNode } from "react";
import { CalendarDays, UserRound, House, Users, FileText, Menu, X } from "lucide-react";
import { Link } from "../../components/ui/link";
import { Button } from "../../components/ui/button";

export interface WorkspaceFrameProps {
  identity: string;
  roles: readonly string[];
  current: "account" | "mentor" | "operator" | "users";
  signOut: ReactNode;
  children: ReactNode;
}
export function WorkspaceFrame({ identity, roles, current, signOut, children }: WorkspaceFrameProps) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  function close() { setOpen(false); trigger.current?.focus(); }
  const items = [
    { key: "account", label: "My sessions", href: "/account", icon: CalendarDays },
    { key: "catalog", label: "Browse mentors", reason: "The mentor catalog is not available yet.", icon: UserRound },
    ...(roles.includes("mentor") ? [
      { key: "mentor", label: "Mentor home", href: "/mentor", icon: House },
      { key: "profile", label: "Mentor profile", href: "/mentor/profile", icon: UserRound },
      { key: "notes", label: "Private notes", reason: "Private notes are not available yet.", icon: FileText },
    ] : []),
    ...(roles.includes("administrator") ? [
      { key: "operator", label: "Operator home", href: "/admin/workspace", icon: House },
      { key: "users", label: "Users", href: "/admin/users", icon: Users },
    ] : []),
  ];
  return <div className="dm-workspace" data-navigation-open={open} onKeyDown={event => { if (event.key === "Escape" && open) { event.preventDefault(); close(); } }}>
    <aside id="workspace-navigation" className="dm-workspace-sidebar" aria-label="Workspace navigation">
      <Link href="/" className="dm-brand">DevMentor</Link><p className="dm-help">Workspace</p>
      <Button className="dm-nav-close" variant="text" onClick={close} aria-label="Close navigation"><X aria-hidden="true" /></Button>
      <nav aria-label="Workspace">{items.map(item => <div key={item.key}>{item.href ? <Link href={item.href} aria-current={current === item.key ? "page" : undefined} onClick={() => setOpen(false)}><item.icon aria-hidden="true" />{item.label}</Link> : <div className="dm-nav-unavailable"><span aria-disabled="true"><item.icon aria-hidden="true" />{item.label}</span><small>{item.reason}</small></div>}</div>)}</nav>
      <div className="dm-workspace-identity"><p>Signed in as</p><Link href="/account">{identity}</Link><p>{roles.map(role => role === "developer" ? "Mentee" : role === "administrator" ? "Operator" : "Mentor").join(" · ")}</p></div>
    </aside>
    <div className="dm-workspace-body"><header><button ref={trigger} type="button" className="dm-nav-trigger dm-focus" aria-label="Open navigation" aria-expanded={open} aria-controls="workspace-navigation" onClick={() => setOpen(true)}><Menu aria-hidden="true" /></button><span>Your DevMentor workspace</span>{signOut}</header><main className="dm-workspace-content">{children}</main></div>
  </div>;
}
