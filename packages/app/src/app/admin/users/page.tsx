import { Workspace } from "../../workspace";
import { LogoutButton } from "../../(auth)/account/logout-button";
import type { Metadata } from "next";
import { adminAccess } from "../admin-access";
import { UsersList } from "./users-list";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Users | DevMentor", robots: { index: false, follow: false } };
export default async function UsersPage() { return adminAccess((id, users, identity, roles) => <Workspace identity={identity} roles={roles} current="users" signOut={<LogoutButton />}><UsersList actorId={id} initial={users} /></Workspace>); }
