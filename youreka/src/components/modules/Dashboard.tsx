'use client';

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { useMemo } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { useAppData } from '@/lib/data-context';
import { formatCurrency, formatDate, formatNumber } from '@/lib/formatters';
import type { JournalEntry } from '@/lib/types';
import { Card } from '../common/Card';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
);

export function Dashboard() {
  const { journalEntries, invoices, accounts, settings, parties } = useAppData();

  const metrics = useMemo(() => buildDashboardMetrics(journalEntries, accounts), [
    journalEntries,
    accounts,
  ]);

  const revenueVsExpenseChart = useMemo(
    () => ({
      labels: metrics.monthly.map((m) => m.label),
      datasets: [
        {
          label: 'Revenue',
          data: metrics.monthly.map((m) => m.revenue),
          backgroundColor: 'rgba(30, 136, 229, 0.75)',
          borderRadius: 12,
        },
        {
          label: 'Expense',
          data: metrics.monthly.map((m) => m.expense),
          backgroundColor: 'rgba(239, 83, 80, 0.75)',
          borderRadius: 12,
        },
      ],
    }),
    [metrics.monthly],
  );

  const cashFlowChart = useMemo(
    () => ({
      labels: metrics.monthly.map((m) => m.label),
      datasets: [
        {
          label: 'Net Profit',
          data: metrics.monthly.map((m) => m.profit),
          borderColor: '#26a69a',
          backgroundColor: 'rgba(38, 166, 154, 0.25)',
          fill: true,
          tension: 0.35,
        },
      ],
    }),
    [metrics.monthly],
  );

  const customerContribution = useMemo(() => {
    const totals = new Map<string, number>();
    for (const invoice of invoices) {
      totals.set(invoice.customerId, (totals.get(invoice.customerId) ?? 0) + invoice.total);
    }
    const sorted = Array.from(totals.entries())
      .map(([partyId, amount]) => ({
        partyName: parties.find((party) => party.id === partyId)?.name ?? 'Unknown',
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
    const totalAmount = sorted.reduce((acc, item) => acc + item.amount, 0);
    return {
      labels: sorted.map((item) => item.partyName),
      datasets: [
        {
          data: sorted.map((item) => item.amount),
          backgroundColor: sorted.map((_, index) => chartPalette[index % chartPalette.length]),
        },
      ],
      totalAmount,
    };
  }, [invoices, parties]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="grid gap-6 xl:col-span-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(metrics.summary.revenue, settings)}
            caption="Recognised revenue YTD"
            accent="from-primary to-primary-light"
          />
          <MetricCard
            title="Total Expenses"
            value={formatCurrency(metrics.summary.expense, settings)}
            caption="Operating expenses YTD"
            accent="from-danger to-danger"
          />
          <MetricCard
            title="Net Profit"
            value={formatCurrency(metrics.summary.profit, settings)}
            caption="After expenses"
            accent="from-accent to-primary"
          />
          <MetricCard
            title="Gross Margin"
            value={`${formatNumber(metrics.summary.margin)}%`}
            caption="Revenue vs costs"
            accent="from-warning to-primary-light"
          />
        </div>

        <Card
          title="Revenue vs Expenses"
          description="Monthly profitability trends offering a quick comparision of earning and spending patterns."
        >
          <div className="h-80">
            <Bar
              data={revenueVsExpenseChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: {
                    position: 'top',
                    labels: { font: { family: 'Open Sans' } },
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) =>
                        formatCurrency(
                          typeof context.raw === 'number'
                            ? context.raw
                            : Number(context.raw ?? 0),
                          settings,
                        ),
                    },
                  },
                },
                scales: {
                  x: { grid: { display: false } },
                  y: {
                    ticks: {
                      callback: (value) =>
                        typeof value === 'number'
                          ? formatCurrency(value, settings)
                          : String(value),
                    },
                  },
                },
              }}
            />
          </div>
        </Card>

        <Card
          title="Profitability Trend"
          description="Rolling monthly net profit helping you anticipate cash requirements."
        >
          <div className="h-80">
            <Line
              data={cashFlowChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' },
                  tooltip: {
                    callbacks: {
                      label: (context) =>
                        formatCurrency(
                          typeof context.raw === 'number'
                            ? context.raw
                            : Number(context.raw ?? 0),
                          settings,
                        ),
                    },
                  },
                },
                scales: {
                  y: {
                    ticks: {
                      callback: (value) =>
                        typeof value === 'number'
                          ? formatCurrency(value, settings)
                          : String(value),
                    },
                  },
                },
              }}
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card
          title="Top Customers"
          description="Contribution of top customers to revenue."
        >
          <div className="h-80">
            <Pie
              data={customerContribution}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                  tooltip: {
                    callbacks: {
                      label: (context) =>
                        formatCurrency(
                          typeof context.raw === 'number'
                            ? context.raw
                            : Number(context.raw ?? 0),
                          settings,
                        ),
                    },
                  },
                },
              }}
            />
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Total captured: {formatCurrency(customerContribution.totalAmount, settings)}
          </p>
        </Card>

        <Card
          title="Recent Transactions"
          description="Latest journal entries with drill down for rapid validation."
        >
          <div className="max-h-80 overflow-y-auto text-sm">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead className="sticky top-0 bg-surface">
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Reference</th>
                  <th className="px-4 py-2">Accounts</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentEntries.map((entry) => (
                  <tr key={entry.id} className="rounded-xl bg-primary/5 align-top shadow-sm">
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(entry.date, settings)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{entry.reference}</span>
                      <p className="text-xs text-slate-500">{entry.narration}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <ul className="space-y-1">
                        {entry.lines.map((line) => {
                          const account = accounts.find((acc) => acc.id === line.accountId);
                          return (
                            <li key={line.id} className="flex justify-between gap-2">
                              <span>{account?.name ?? 'Account removed'}</span>
                              <span className="text-xs uppercase text-slate-500">
                                {line.debit > 0 ? 'Dr' : 'Cr'}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">
                      {formatCurrency(
                        entry.lines.reduce((acc, line) => acc + line.debit, 0),
                        settings,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

const chartPalette = [
  '#1e88e5',
  '#26a69a',
  '#43a047',
  '#ffb300',
  '#ef5350',
  '#8e24aa',
];

interface MetricCardProps {
  title: string;
  value: string;
  caption: string;
  accent: string;
}

function MetricCard({ title, value, caption, accent }: MetricCardProps) {
  return (
    <article
      className={`rounded-3xl border border-white/40 bg-gradient-to-br ${accent} p-5 text-white shadow-lg`}
    >
      <p className="text-xs uppercase tracking-wider text-white/80">{title}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-xs text-white/80">{caption}</p>
    </article>
  );
}

interface MonthlyMetric {
  label: string;
  revenue: number;
  expense: number;
  profit: number;
}

interface DashboardMetrics {
  summary: {
    revenue: number;
    expense: number;
    profit: number;
    margin: number;
  };
  monthly: MonthlyMetric[];
  recentEntries: JournalEntry[];
}

function buildDashboardMetrics(
  entries: JournalEntry[],
  accounts: AppDataContextValue['accounts'],
): DashboardMetrics {
  const revenueAccounts = accounts.filter((account) => account.type === 'Revenue').map((a) => a.id);
  const expenseAccounts = accounts.filter((account) => account.type === 'Expense').map((a) => a.id);

  const monthlyAggregator = new Map<string, MonthlyMetric>();
  let revenue = 0;
  let expense = 0;

  const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  for (const entry of sortedEntries) {
    const monthKey = entry.date.slice(0, 7);
    const bucket =
      monthlyAggregator.get(monthKey) ??
      monthlyAggregator
        .set(monthKey, {
          label: new Date(entry.date).toLocaleDateString('en-IN', {
            month: 'short',
            year: 'numeric',
          }),
          revenue: 0,
          expense: 0,
          profit: 0,
        })
        .get(monthKey)!;

    let entryRevenue = 0;
    let entryExpense = 0;

    for (const line of entry.lines) {
      if (revenueAccounts.includes(line.accountId)) {
        entryRevenue += line.credit - line.debit;
      }
      if (expenseAccounts.includes(line.accountId)) {
        entryExpense += line.debit - line.credit;
      }
    }

    revenue += entryRevenue;
    expense += entryExpense;

    bucket.revenue += entryRevenue;
    bucket.expense += entryExpense;
    bucket.profit = bucket.revenue - bucket.expense;
  }

  for (const bucket of monthlyAggregator.values()) {
    bucket.profit = bucket.revenue - bucket.expense;
  }

  const monthly = Array.from(monthlyAggregator.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value);

  const profit = revenue - expense;
  const margin = revenue === 0 ? 0 : (profit / revenue) * 100;

  return {
    summary: { revenue, expense, profit, margin },
    monthly,
    recentEntries: sortedEntries.slice(0, 8),
  };
}

type AppDataContextValue = ReturnType<typeof useAppData>;
