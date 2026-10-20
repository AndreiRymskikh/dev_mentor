import type { ReactNode } from "react";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-background text-foreground font-sans">
      {children}
    </div>
  );
}
