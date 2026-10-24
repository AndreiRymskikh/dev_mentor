import { redirect } from "next/navigation";
import { adminAccess } from "./admin-access";
export const dynamic = "force-dynamic";
export default async function AdminPage() { return adminAccess(() => redirect("/admin/users")); }
