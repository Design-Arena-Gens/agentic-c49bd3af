import type { ReactNode } from "react";

interface SidebarLink {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
}

interface SidebarProps {
  links: SidebarLink[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function Sidebar({ links, activeId, onSelect }: SidebarProps) {
  return (
    <nav
      aria-label="Primary"
      className="flex h-full flex-col gap-2 rounded-3xl border border-border bg-surface p-5"
    >
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Modules
        </p>
      </div>
      <ul className="flex flex-1 flex-col gap-1">
        {links.map((link) => {
          const isActive = link.id === activeId;
          return (
            <li key={link.id}>
              <button
                type="button"
                onClick={() => onSelect(link.id)}
                className={`group flex w-full flex-col gap-1 rounded-2xl px-4 py-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary ${isActive ? "bg-gradient-to-r from-primary to-accent text-white shadow-card" : "hover:bg-primary/10"}`}
              >
                <div className="flex items-center gap-3 text-sm font-semibold">
                  <span
                    aria-hidden="true"
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${isActive ? "bg-white/20" : "bg-primary/10 text-primary"}`}
                  >
                    {link.icon}
                  </span>
                  <span>{link.label}</span>
                </div>
                <p
                  className={`text-xs leading-relaxed ${isActive ? "text-white/80" : "text-slate-500 group-hover:text-slate-700"}`}
                >
                  {link.description}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
