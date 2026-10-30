import type { ReactNode } from "react";
import { Link } from "../../components/ui/link";

export function AuthFrame({ children }: { children: ReactNode }) {
  return <main className="dm-auth"><Link className="dm-brand" href="/">DevMentor</Link><section className="dm-auth-card">{children}</section><footer>Text mentoring for developers.</footer></main>;
}
