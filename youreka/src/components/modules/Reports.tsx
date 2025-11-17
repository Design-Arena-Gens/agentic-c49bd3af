'use client';

import { useMemo, useState } from 'react';
import { useAppData } from '@/lib/data-context';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { Account, LedgerEntry, TrialBalanceLine } from '@/lib/types';
import { createTablePdf } from '@/lib/pdf';
import { Card } from '../common/Card';

type ReportType = 'profit-loss' | 'balance-sheet' | 'trial-balance' | 'ledger';

export function Reports() {
  const { journalEntries, accounts, settings } = useAppData();
  const [activeReport, setActiveReport] = useState<ReportType>('profit-loss');
  const [fromDate, setFromDate] = useState(
    () => new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
  );
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [ledgerAccountId, setLedgerAccountId] = useState(accounts[0]?.id ?? '');

  const reportPayload = useMemo(() => {
    return buildReports({
      entries: journalEntries,
      accounts,
      fromDate,
      toDate,
    });
  }, [journalEntries, accounts, fromDate, toDate]);

  const ledgerEntries = useMemo(() => {
    const account = accounts.find((acc) => acc.id === ledgerAccountId);
    if (!account) return [];
    return buildLedgerEntries(journalEntries, account, fromDate, toDate);
  }, [ledgerAccountId, accounts, journalEntries, fromDate, toDate]);

  const handleDownload = async (format: 'pdf' | 'csv') => {
    switch (activeReport) {
      case 'profit-loss':
        await downloadPnL(reportPayload.pnl, format, settings?.profile.firmName);
        break;
      case 'balance-sheet':
        await downloadBalanceSheet(reportPayload.balanceSheet, format, settings?.profile.firmName);
        break;
      case 'trial-balance':
        await downloadTrialBalance(reportPayload.trialBalance, format, settings?.profile.firmName);
        break;
      case 'ledger': {
        const account = accounts.find((acc) => acc.id === ledgerAccountId);
        if (account) {
          await downloadLedger(account, ledgerEntries, format, settings?.profile.firmName);
        }
        break;
      }
      default:
        break;
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="Reporting"
        description="Generate statutory financial statements, export data, and validate compliance with audit-ready trails."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownload('pdf')}
              className="rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-card transition hover:shadow-lg"
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={() => handleDownload('csv')}
              className="rounded-2xl border border-primary/40 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10"
            >
              Download CSV
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border border-primary/40 bg-primary/10 p-1">
            {[
              { id: 'profit-loss', label: 'Profit & Loss' },
              { id: 'balance-sheet', label: 'Balance Sheet' },
              { id: 'trial-balance', label: 'Trial Balance' },
              { id: 'ledger', label: 'Ledger' },
            ].map((report) => {
              const isActive = report.id === activeReport;
              return (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setActiveReport(report.id as ReportType)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${isActive ? 'bg-gradient-to-r from-primary to-accent text-white shadow-card' : 'text-primary hover:bg-white'}`}
                >
                  {report.label}
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              From
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="rounded-xl border border-border px-3 py-1 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              To
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="rounded-xl border border-border px-3 py-1 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            {activeReport === 'ledger' && (
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Account
                <select
                  value={ledgerAccountId}
                  onChange={(event) => setLedgerAccountId(event.target.value)}
                  className="rounded-xl border border-border px-3 py-1 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-border bg-white p-6 shadow-inner">
          {activeReport === 'profit-loss' && (
            <ProfitAndLossView
              report={reportPayload.pnl}
              settings={settings}
            />
          )}
          {activeReport === 'balance-sheet' && (
            <BalanceSheetView
              report={reportPayload.balanceSheet}
              settings={settings}
            />
          )}
          {activeReport === 'trial-balance' && (
            <TrialBalanceView
              report={reportPayload.trialBalance}
              settings={settings}
            />
          )}
          {activeReport === 'ledger' && (
            <LedgerView
              account={accounts.find((acc) => acc.id === ledgerAccountId)}
              entries={ledgerEntries}
              settings={settings}
            />
          )}
        </div>
      </Card>
    </div>
  );
}

interface ReportBuilderInput {
  entries: ReturnType<typeof useAppData>['journalEntries'];
  accounts: Account[];
  fromDate: string;
  toDate: string;
}

function buildReports({ entries, accounts, fromDate, toDate }: ReportBuilderInput) {
  const filteredEntries = entries.filter(
    (entry) => entry.date >= fromDate && entry.date <= toDate,
  );
  const balances = computeAccountBalances(filteredEntries);

  const pnlRevenues = accounts
    .filter((account) => account.type === 'Revenue')
    .map((account) => ({
      account,
      amount: -(balances.get(account.id) ?? 0),
    }));
  const pnlExpenses = accounts
    .filter((account) => account.type === 'Expense')
    .map((account) => ({
      account,
      amount: balances.get(account.id) ?? 0,
    }));

  const revenueTotal = pnlRevenues.reduce((acc, item) => acc + item.amount, 0);
  const expenseTotal = pnlExpenses.reduce((acc, item) => acc + item.amount, 0);

  const pnl = {
    periodStart: fromDate,
    periodEnd: toDate,
    revenueTotal,
    expenseTotal,
    grossProfit: revenueTotal - expenseTotal,
    netProfit: revenueTotal - expenseTotal,
    revenueAccounts: pnlRevenues,
    expenseAccounts: pnlExpenses,
  };

  const balanceAggregations = {
    assets: accounts
      .filter((account) => account.type === 'Asset')
      .map((account) => ({
        account,
        amount: balances.get(account.id) ?? 0,
      })),
    liabilities: accounts
      .filter((account) => account.type === 'Liability')
      .map((account) => ({
        account,
        amount: -(balances.get(account.id) ?? 0),
      })),
    equity: accounts
      .filter((account) => account.type === 'Equity')
      .map((account) => ({
        account,
        amount: -(balances.get(account.id) ?? 0),
      })),
  };

  const balanceSheet = {
    periodEnd: toDate,
    assets: balanceAggregations.assets,
    liabilities: balanceAggregations.liabilities,
    equity: balanceAggregations.equity,
    totals: {
      assetTotal: balanceAggregations.assets.reduce((acc, item) => acc + item.amount, 0),
      liabilityTotal: balanceAggregations.liabilities.reduce((acc, item) => acc + item.amount, 0),
      equityTotal: balanceAggregations.equity.reduce((acc, item) => acc + item.amount, 0),
    },
  };

  const trialBalanceLines: TrialBalanceLine[] = accounts.map((account) => {
    const balance = balances.get(account.id) ?? 0;
    return {
      account,
      debit: balance > 0 ? balance : 0,
      credit: balance < 0 ? -balance : 0,
    };
  });

  const trialBalance = {
    periodStart: fromDate,
    periodEnd: toDate,
    lines: trialBalanceLines,
    totalDebit: trialBalanceLines.reduce((acc, line) => acc + line.debit, 0),
    totalCredit: trialBalanceLines.reduce((acc, line) => acc + line.credit, 0),
  };

  return {
    pnl,
    balanceSheet,
    trialBalance,
  };
}

function computeAccountBalances(entries: ReturnType<typeof useAppData>['journalEntries']) {
  const map = new Map<string, number>();
  for (const entry of entries) {
    for (const line of entry.lines) {
      map.set(line.accountId, (map.get(line.accountId) ?? 0) + line.debit - line.credit);
    }
  }
  return map;
}

function buildLedgerEntries(
  entries: ReturnType<typeof useAppData>['journalEntries'],
  account: Account,
  fromDate: string,
  toDate: string,
): LedgerEntry[] {
  const relevantEntries = entries
    .filter((entry) => entry.date >= fromDate && entry.date <= toDate)
    .sort((a, b) => a.date.localeCompare(b.date));
  const ledger: LedgerEntry[] = [];
  let balance = 0;
  for (const entry of relevantEntries) {
    for (const line of entry.lines.filter((line) => line.accountId === account.id)) {
      balance += line.debit - line.credit;
      ledger.push({
        accountId: account.id,
        accountName: account.name,
        date: entry.date,
        description: line.description ?? entry.narration,
        reference: entry.reference,
        debit: line.debit,
        credit: line.credit,
        balance,
      });
    }
  }
  return ledger;
}

function ProfitAndLossView({
  report,
  settings,
}: {
  report: ReturnType<typeof buildReports>['pnl'];
  settings: ReturnType<typeof useAppData>['settings'];
}) {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Profit & Loss Statement</h2>
        <p className="text-sm text-slate-500">
          Period: {formatDate(report.periodStart, settings)} – {formatDate(report.periodEnd, settings)}
        </p>
      </header>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
            Revenue
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {report.revenueAccounts.map(({ account, amount }) => (
              <li key={account.id} className="flex items-center justify-between">
                <span>{account.name}</span>
                <span>{formatCurrency(amount, settings)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-primary/20 pt-3 text-right text-sm font-semibold text-primary">
            Total: {formatCurrency(report.revenueTotal, settings)}
          </p>
        </div>
        <div className="rounded-2xl border border-danger/20 bg-danger/5 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-danger">
            Expenses
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {report.expenseAccounts.map(({ account, amount }) => (
              <li key={account.id} className="flex items-center justify-between">
                <span>{account.name}</span>
                <span>{formatCurrency(amount, settings)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-danger/20 pt-3 text-right text-sm font-semibold text-danger">
            Total: {formatCurrency(report.expenseTotal, settings)}
          </p>
        </div>
      </section>
      <section className="rounded-2xl border border-accent/20 bg-accent/10 p-4 text-right">
        <p className="text-sm font-semibold text-slate-600">
          Net Profit
        </p>
        <p className="mt-2 text-2xl font-semibold text-accent">
          {formatCurrency(report.netProfit, settings)}
        </p>
      </section>
    </div>
  );
}

function BalanceSheetView({
  report,
  settings,
}: {
  report: ReturnType<typeof buildReports>['balanceSheet'];
  settings: ReturnType<typeof useAppData>['settings'];
}) {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Balance Sheet</h2>
        <p className="text-sm text-slate-500">
          As on {formatDate(report.periodEnd, settings)}
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-3">
        <BalanceBlock
          title="Assets"
          entries={report.assets}
          total={report.totals.assetTotal}
          settings={settings}
        />
        <BalanceBlock
          title="Liabilities"
          entries={report.liabilities}
          total={report.totals.liabilityTotal}
          settings={settings}
        />
        <BalanceBlock
          title="Equity"
          entries={report.equity}
          total={report.totals.equityTotal}
          settings={settings}
        />
      </div>
    </div>
  );
}

function BalanceBlock({
  title,
  entries,
  total,
  settings,
}: {
  title: string;
  entries: { account: Account; amount: number }[];
  total: number;
  settings: ReturnType<typeof useAppData>['settings'];
}) {
  return (
    <section className="rounded-2xl border border-border bg-slate-50/70 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        {entries.map(({ account, amount }) => (
          <li key={account.id} className="flex items-center justify-between">
            <span>{account.name}</span>
            <span>{formatCurrency(amount, settings)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-border pt-3 text-right text-sm font-semibold text-primary">
        Total: {formatCurrency(total, settings)}
      </p>
    </section>
  );
}

function TrialBalanceView({
  report,
  settings,
}: {
  report: ReturnType<typeof buildReports>['trialBalance'];
  settings: ReturnType<typeof useAppData>['settings'];
}) {
  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Trial Balance</h2>
        <p className="text-sm text-slate-500">
          Period: {formatDate(report.periodStart, settings)} – {formatDate(report.periodEnd, settings)}
        </p>
      </header>
      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-primary/10 text-left text-xs font-semibold uppercase tracking-wide text-primary">
            <tr>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3 text-right">Debit</th>
              <th className="px-4 py-3 text-right">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {report.lines.map((line) => (
              <tr key={line.account.id}>
                <td className="px-4 py-3 text-slate-700">{line.account.name}</td>
                <td className="px-4 py-3 text-right text-primary">
                  {formatCurrency(line.debit, settings)}
                </td>
                <td className="px-4 py-3 text-right text-danger">
                  {formatCurrency(line.credit, settings)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-primary/5 text-sm font-semibold text-primary">
            <tr>
              <td className="px-4 py-3 text-right uppercase text-xs text-slate-500">Totals</td>
              <td className="px-4 py-3 text-right">
                {formatCurrency(report.totalDebit, settings)}
              </td>
              <td className="px-4 py-3 text-right">
                {formatCurrency(report.totalCredit, settings)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function LedgerView({
  account,
  entries,
  settings,
}: {
  account?: Account;
  entries: LedgerEntry[];
  settings: ReturnType<typeof useAppData>['settings'];
}) {
  if (!account) {
    return <p className="text-sm text-slate-500">Select an account to view ledger movements.</p>;
  }
  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">{account.name} Ledger</h2>
        <p className="text-sm text-slate-500">Running account balance with debit/credit splits.</p>
      </header>
      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-primary/10 text-left text-xs font-semibold uppercase tracking-wide text-primary">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Debit</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {entries.map((entry) => (
              <tr key={`${entry.reference}-${entry.date}-${entry.debit}-${entry.credit}`}>
                <td className="px-4 py-3 text-slate-700">{formatDate(entry.date, settings)}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{entry.reference}</td>
                <td className="px-4 py-3 text-slate-600">{entry.description}</td>
                <td className="px-4 py-3 text-right text-primary">
                  {formatCurrency(entry.debit, settings)}
                </td>
                <td className="px-4 py-3 text-right text-danger">
                  {formatCurrency(entry.credit, settings)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">
                  {formatCurrency(entry.balance, settings)}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  No ledger activity for the selected period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function downloadPnL(
  pnl: ReturnType<typeof buildReports>['pnl'],
  format: 'pdf' | 'csv',
  firmName = 'YOUREKA by QUAZENTA',
) {
  if (format === 'csv') {
    const rows = [
      ['Profit & Loss Statement'],
      ['Firm', firmName],
      ['Period', `${pnl.periodStart} - ${pnl.periodEnd}`],
      [],
      ['Revenue'],
      ...pnl.revenueAccounts.map(({ account, amount }) => [account.name, amount.toFixed(2)]),
      ['Total Revenue', pnl.revenueTotal.toFixed(2)],
      [],
      ['Expenses'],
      ...pnl.expenseAccounts.map(({ account, amount }) => [account.name, amount.toFixed(2)]),
      ['Total Expenses', pnl.expenseTotal.toFixed(2)],
      [],
      ['Net Profit', pnl.netProfit.toFixed(2)],
    ];
    downloadCsv('profit-and-loss.csv', rows);
  } else {
    const rows = [
      { label: 'Revenue', amount: '' },
      ...pnl.revenueAccounts.map(({ account, amount }) => ({
        label: `  ${account.name}`,
        amount: amount.toFixed(2),
      })),
      { label: 'Total Revenue', amount: pnl.revenueTotal.toFixed(2) },
      { label: '', amount: '' },
      { label: 'Expenses', amount: '' },
      ...pnl.expenseAccounts.map(({ account, amount }) => ({
        label: `  ${account.name}`,
        amount: amount.toFixed(2),
      })),
      { label: 'Total Expenses', amount: pnl.expenseTotal.toFixed(2) },
    ];
    await createTablePdf({
      title: firmName,
      subtitle: `Profit & Loss Statement • Period: ${pnl.periodStart} – ${pnl.periodEnd}`,
      columns: [
        { key: 'label', label: 'Account', width: 320 },
        { key: 'amount', label: 'Amount', width: 160, align: 'right' },
      ],
      rows,
      footer: { label: 'Net Profit', amount: pnl.netProfit.toFixed(2) },
      fileName: 'profit-and-loss.pdf',
    });
  }
}

async function downloadBalanceSheet(
  balanceSheet: ReturnType<typeof buildReports>['balanceSheet'],
  format: 'pdf' | 'csv',
  firmName = 'YOUREKA by QUAZENTA',
) {
  if (format === 'csv') {
    const rows = [
      ['Balance Sheet'],
      ['Firm', firmName],
      ['As on', balanceSheet.periodEnd],
      [],
      ['Assets', 'Amount'],
      ...balanceSheet.assets.map(({ account, amount }) => [account.name, amount.toFixed(2)]),
      ['Total Assets', balanceSheet.totals.assetTotal.toFixed(2)],
      [],
      ['Liabilities', 'Amount'],
      ...balanceSheet.liabilities.map(({ account, amount }) => [
        account.name,
        amount.toFixed(2),
      ]),
      ['Total Liabilities', balanceSheet.totals.liabilityTotal.toFixed(2)],
      [],
      ['Equity', 'Amount'],
      ...balanceSheet.equity.map(({ account, amount }) => [
        account.name,
        amount.toFixed(2),
      ]),
      ['Total Equity', balanceSheet.totals.equityTotal.toFixed(2)],
    ];
    downloadCsv('balance-sheet.csv', rows);
  } else {
    const rows = [
      { section: 'Assets', account: '', amount: '' },
      ...balanceSheet.assets.map(({ account, amount }) => ({
        section: '',
        account: account.name,
        amount: amount.toFixed(2),
      })),
      { section: 'Total Assets', account: '', amount: balanceSheet.totals.assetTotal.toFixed(2) },
      { section: '', account: '', amount: '' },
      { section: 'Liabilities', account: '', amount: '' },
      ...balanceSheet.liabilities.map(({ account, amount }) => ({
        section: '',
        account: account.name,
        amount: amount.toFixed(2),
      })),
      {
        section: 'Total Liabilities',
        account: '',
        amount: balanceSheet.totals.liabilityTotal.toFixed(2),
      },
      { section: '', account: '', amount: '' },
      { section: 'Equity', account: '', amount: '' },
      ...balanceSheet.equity.map(({ account, amount }) => ({
        section: '',
        account: account.name,
        amount: amount.toFixed(2),
      })),
      {
        section: 'Total Equity',
        account: '',
        amount: balanceSheet.totals.equityTotal.toFixed(2),
      },
    ];

    await createTablePdf({
      title: firmName,
      subtitle: `Balance Sheet • As on ${balanceSheet.periodEnd}`,
      columns: [
        { key: 'section', label: 'Section', width: 120 },
        { key: 'account', label: 'Account', width: 260 },
        { key: 'amount', label: 'Amount', width: 160, align: 'right' },
      ],
      rows,
      fileName: 'balance-sheet.pdf',
    });
  }
}

async function downloadTrialBalance(
  trialBalance: ReturnType<typeof buildReports>['trialBalance'],
  format: 'pdf' | 'csv',
  firmName = 'YOUREKA by QUAZENTA',
) {
  if (format === 'csv') {
    const rows = [
      ['Trial Balance'],
      ['Firm', firmName],
      ['Period', `${trialBalance.periodStart} - ${trialBalance.periodEnd}`],
      [],
      ['Account', 'Debit', 'Credit'],
      ...trialBalance.lines.map((line) => [
        line.account.name,
        line.debit.toFixed(2),
        line.credit.toFixed(2),
      ]),
      ['Total', trialBalance.totalDebit.toFixed(2), trialBalance.totalCredit.toFixed(2)],
    ];
    downloadCsv('trial-balance.csv', rows);
  } else {
    await createTablePdf({
      title: firmName,
      subtitle: `Trial Balance • Period: ${trialBalance.periodStart} – ${trialBalance.periodEnd}`,
      columns: [
        { key: 'account', label: 'Account', width: 260 },
        { key: 'debit', label: 'Debit', width: 120, align: 'right' },
        { key: 'credit', label: 'Credit', width: 120, align: 'right' },
      ],
      rows: trialBalance.lines.map((line) => ({
        account: line.account.name,
        debit: line.debit.toFixed(2),
        credit: line.credit.toFixed(2),
      })),
      footer: {
        account: 'Total',
        debit: trialBalance.totalDebit.toFixed(2),
        credit: trialBalance.totalCredit.toFixed(2),
      },
      fileName: 'trial-balance.pdf',
    });
  }
}

async function downloadLedger(
  account: Account,
  entries: LedgerEntry[],
  format: 'pdf' | 'csv',
  firmName = 'YOUREKA by QUAZENTA',
) {
  if (format === 'csv') {
    const rows = [
      ['Ledger'],
      ['Firm', firmName],
      ['Account', account.name],
      [],
      ['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'],
      ...entries.map((entry) => [
        entry.date,
        entry.reference ?? '',
        entry.description ?? '',
        entry.debit.toFixed(2),
        entry.credit.toFixed(2),
        entry.balance.toFixed(2),
      ]),
    ];
    downloadCsv(`${account.name}-ledger.csv`, rows);
  } else {
    await createTablePdf({
      title: firmName,
      subtitle: `${account.name} Ledger`,
      columns: [
        { key: 'date', label: 'Date', width: 90 },
        { key: 'reference', label: 'Reference', width: 90 },
        { key: 'description', label: 'Description', width: 180 },
        { key: 'debit', label: 'Debit', width: 70, align: 'right' },
        { key: 'credit', label: 'Credit', width: 70, align: 'right' },
        { key: 'balance', label: 'Balance', width: 80, align: 'right' },
      ],
      rows: entries.map((entry) => ({
        date: entry.date,
        reference: entry.reference ?? '',
        description: entry.description ?? '',
        debit: entry.debit.toFixed(2),
        credit: entry.credit.toFixed(2),
        balance: entry.balance.toFixed(2),
      })),
      fileName: `${account.name}-ledger.pdf`,
    });
  }
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csvContent = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function csvEscape(value: string | number) {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
