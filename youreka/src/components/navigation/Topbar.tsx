import type { ReactNode } from "react";

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  rightSlot?: ReactNode;
}

export function Topbar({
  title,
  subtitle,
  actions,
  rightSlot,
}: TopbarProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-transparent bg-gradient-to-r from-primary to-accent p-6 text-white shadow-card">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-white/80">{subtitle}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center">
        {actions && <div className="flex items-center gap-2">{actions}</div>}
        {rightSlot}
      </div>
    </header>
  );
}
