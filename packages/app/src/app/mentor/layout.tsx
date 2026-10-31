import type { ReactNode } from "react";
import { PrivateContent } from "../../auth/private-content";
export default function MentorLayout({ children }: { children: ReactNode }) { return <PrivateContent>{children}</PrivateContent>; }
