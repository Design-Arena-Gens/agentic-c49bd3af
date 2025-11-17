'use client';

import { useMemo, useState } from 'react';
import { Dashboard } from '@/components/modules/Dashboard';
import { Inventory } from '@/components/modules/Inventory';
import { Invoicing } from '@/components/modules/Invoicing';
import { Journal } from '@/components/modules/Journal';
import { PartyManagement } from '@/components/modules/PartyManagement';
import { Reports } from '@/components/modules/Reports';
import { Settings } from '@/components/modules/Settings';
import { Sidebar } from '@/components/navigation/Sidebar';
import { Topbar } from '@/components/navigation/Topbar';
import { DataProvider, useAppData } from '@/lib/data-context';

const modules = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Bird’s-eye view of business health with interactive analytics.',
    icon: <ModuleIcon variant="dashboard" />,
    component: Dashboard,
  },
  {
    id: 'journal',
    label: 'Journal',
    description: 'Post and audit double-entry transactions with validation.',
    icon: <ModuleIcon variant="journal" />,
    component: Journal,
  },
  {
    id: 'parties',
    label: 'Party Management',
    description: 'Maintain customers, vendors, and statutory details.',
    icon: <ModuleIcon variant="parties" />,
    component: PartyManagement,
  },
  {
    id: 'inventory',
    label: 'Inventory',
    description: 'Manage stock across warehouses and monitor reorder points.',
    icon: <ModuleIcon variant="inventory" />,
    component: Inventory,
  },
  {
    id: 'invoicing',
    label: 'Invoicing',
    description: 'Issue invoices with automated ledger postings and PDFs.',
    icon: <ModuleIcon variant="invoicing" />,
    component: Invoicing,
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'Generate financial statements comparable to Tally Prime.',
    icon: <ModuleIcon variant="reports" />,
    component: Reports,
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Configure firm profile, security, and application defaults.',
    icon: <ModuleIcon variant="settings" />,
    component: Settings,
  },
] as const;

type ModuleId = (typeof modules)[number]['id'];

export default function Home() {
  return (
    <DataProvider>
      <ApplicationShell />
    </DataProvider>
  );
}

function ApplicationShell() {
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const { loading, settings } = useAppData();

  const ActiveModule = useMemo(
    () => modules.find((module) => module.id === activeModule)?.component ?? Dashboard,
    [activeModule],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eef5ff] via-[#f6fbff] to-[#f0fff9] p-6 text-slate-900">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="order-2 xl:order-1">
          <Sidebar
            links={modules.map(({ id, label, description, icon }) => ({
              id,
              label,
              description,
              icon,
            }))}
            activeId={activeModule}
            onSelect={(id) => setActiveModule(id as ModuleId)}
          />
        </aside>

        <main className="order-1 flex flex-col gap-6 xl:order-2">
          <Topbar
            title="YOUREKA by QUAZENTA"
            subtitle={settings?.profile.firmName ?? 'Modern accounting cockpit'}
            rightSlot={
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
                Inspired by Tally Prime
              </span>
            }
            actions={
              <span className="rounded-full bg-white/20 px-4 py-1 text-xs font-semibold text-white">
                {new Date().toLocaleString()}
              </span>
            }
          />

          <section
            aria-live="polite"
            className="rounded-3xl border border-border bg-transparent"
          >
            <div className="rounded-3xl border border-white bg-white/90 p-6 shadow-xl backdrop-blur">
              {loading ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      Initialising secure ledger…
                    </p>
                    <p className="text-xs text-slate-500">
                      Setting up IndexedDB stores and seeding system accounts.
                    </p>
                  </div>
                </div>
              ) : (
                <ActiveModule />
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function ModuleIcon({ variant }: { variant: ModuleId }) {
  switch (variant) {
    case 'dashboard':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" className="fill-current">
          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
        </svg>
      );
    case 'journal':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" className="fill-current">
          <path d="M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2zm0 15-5-2.18L7 18V5h10v13z" />
        </svg>
      );
    case 'parties':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" className="fill-current">
          <path d="M12 12c2.21 0 4-1.79 4-4S14.21 4 12 4 8 5.79 8 8s1.79 4 4 4zm6 2h-1.26A6.963 6.963 0 0 0 12 12a6.963 6.963 0 0 0-4.74 2H6c-1.1 0-2 .9-2 2v3h16v-3c0-1.1-.9-2-2-2z" />
        </svg>
      );
    case 'inventory':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" className="fill-current">
          <path d="m21 16-8 5-8-5V8l8-5 8 5v8zm-8-9.74L7 9.54v4.92l6 3.74 6-3.74V9.54l-6-3.28z" />
        </svg>
      );
    case 'invoicing':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" className="fill-current">
          <path d="M19 2H9a2 2 0 0 0-2 2v3h2V4h10v16H9v-3H7v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
          <path d="M11 12h7v2h-7zm0-4h7v2h-7zM5 10H2v2h3v2h2v-2h3v-2H7V8H5z" />
        </svg>
      );
    case 'reports':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" className="fill-current">
          <path d="M19 3H5a2 2 0 0 0-2 2v14l4-4h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-7 9H8V8h4v4zm6 0h-4V5h4v7z" />
        </svg>
      );
    case 'settings':
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" className="fill-current">
          <path d="M19.14 12.936c.036-.303.056-.612.056-.936s-.02-.633-.056-.936l2.037-1.582a.5.5 0 0 0 .12-.64l-1.928-3.338a.5.5 0 0 0-.607-.22l-2.397.96a7.013 7.013 0 0 0-1.62-.936L14.5 2.5h-5l-.249 2.388a7.013 7.013 0 0 0-1.62.936l-2.397-.96a.5.5 0 0 0-.607.22L2.7 8.422a.5.5 0 0 0 .12.64L4.857 10.644A7.21 7.21 0 0 0 4.8 11.98c0 .324.02.633.056.936L2.82 14.498a.5.5 0 0 0-.12.64l1.928 3.338a.5.5 0 0 0 .607.22l2.397-.96a7.013 7.013 0 0 0 1.62.936L9.5 21.5h5l.249-2.388a7.013 7.013 0 0 0 1.62-.936l2.397.96a.5.5 0 0 0 .607-.22l1.928-3.338a.5.5 0 0 0-.12-.64l-2.237-1.562zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" />
        </svg>
      );
  }
}
