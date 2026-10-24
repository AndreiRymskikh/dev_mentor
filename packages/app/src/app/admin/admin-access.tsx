import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { withScope } from "@devmentor/core/container";
import { ForbiddenError } from "@devmentor/core/http";
import { readSessionCookie } from "../../auth/session-cookie";
import { Link } from "@devmentor/ui/components/ui/link";
import type { ReactNode } from "react";
import type { AdminUsersPage } from "@devmentor/core/validators/users";
export async function adminAccess(render: (id: string, users: AdminUsersPage) => ReactNode) {
  let result;
  try {
    const token = readSessionCookie({ headers: await headers() });
    result = await withScope(async ({ sessionService, adminUsersService }) => {
      const principal = await sessionService.resolve(token);
      if (!principal) return null;
      if (!principal.roles.includes("administrator")) throw new ForbiddenError();
      return { id: principal.id, users: await adminUsersService.list(principal.id, {}) };
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return <main><h1>Access denied</h1><p>Administrator access is required.</p><Link href="/account">Your account</Link></main>;
    return <main role="alert"><h1>Administration temporarily unavailable</h1><Link href="/admin/users">Try again</Link></main>;
  }
  if (!result) redirect("/login");
  return render(result.id, result.users);
}
