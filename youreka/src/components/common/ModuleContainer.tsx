import type { ReactNode } from "react";

interface ModuleContainerProps {
  children: ReactNode;
}

export function ModuleContainer({ children }: ModuleContainerProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr]">{children}</div>
  );
}
