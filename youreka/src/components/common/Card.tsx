import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({
  title,
  description,
  actions,
  children,
  className = "",
}: CardProps) {
  return (
    <section
      className={`rounded-2xl border border-border bg-surface p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg ${className}`}
    >
      {(title || description || actions) && (
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-slate-600">{description}</p>
            )}
          </div>
          {actions}
        </header>
      )}
      <div>{children}</div>
    </section>
  );
}
