import type { ReactNode } from "react";
import "./auth.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="dm-auth mx-auto w-full max-w-lg px-page-gutter py-section"><div className="rounded-panel border border-border-subtle bg-surface-card p-panel">{children}</div></main>;
}
