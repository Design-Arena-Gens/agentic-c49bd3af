'use client';

import { useMemo, useState } from 'react';
import { useAppData } from '@/lib/data-context';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { AccountType, JournalLine } from '@/lib/types';
import { Card } from '../common/Card';

type DraftLine = {
  tempId: string;
  accountId: string;
  description: string;
  debit: string;
  credit: string;
};

const ACCOUNT_TYPES: AccountType[] = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

export function Journal() {
  const {
    accounts,
    journalEntries,
    addJournalEntry,
    deleteJournalEntry,
    addAccount,
    updateAccount,
    deleteAccount,
    settings,
  } = useAppData();

  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [entryForm, setEntryForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    reference: '',
    narration: '',
    lines: [
      createEmptyLine(),
      createEmptyLine(),
    ] satisfies DraftLine[],
  });
  const [entryError, setEntryError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [accountForm, setAccountForm] = useState({
    name: '',
    code: '',
    type: 'Asset' as AccountType,
    description: '',
  });
  const [accountError, setAccountError] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    return journalEntries.filter((entry) => {
      const matchesSearch =
        searchTerm.trim().length === 0 ||
        entry.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.narration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.lines.some((line) => {
          const account = accounts.find((acc) => acc.id === line.accountId);
          return account?.name.toLowerCase().includes(searchTerm.toLowerCase());
        });
      const matchesFrom = !fromDate || entry.date >= fromDate;
      const matchesTo = !toDate || entry.date <= toDate;
      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [journalEntries, searchTerm, fromDate, toDate, accounts]);

  const debitTotal = entryForm.lines.reduce(
    (acc, line) => acc + parseFloat(line.debit || '0'),
    0,
  );
  const creditTotal = entryForm.lines.reduce(
    (acc, line) => acc + parseFloat(line.credit || '0'),
    0,
  );

  const isBalanced = Math.abs(debitTotal - creditTotal) < 0.01;

  const handleLineChange = (id: string, field: keyof DraftLine, value: string) => {
    setEntryForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => (line.tempId === id ? { ...line, [field]: value } : line)),
    }));
  };

  const handleAddLine = () => {
    setEntryForm((prev) => ({
      ...prev,
      lines: [...prev.lines, createEmptyLine()],
    }));
  };

  const handleRemoveLine = (id: string) => {
    setEntryForm((prev) => ({
      ...prev,
      lines: prev.lines.length <= 2 ? prev.lines : prev.lines.filter((line) => line.tempId !== id),
    }));
  };

  const handleEntrySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEntryError(null);
    if (!isBalanced) {
      setEntryError('Journal entry must be balanced. Adjust debit and credit values.');
      return;
    }
    const hasAccountGaps = entryForm.lines.some((line) => !line.accountId);
    if (hasAccountGaps) {
      setEntryError('Every line requires an account selection.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payloadLines: JournalLine[] = entryForm.lines.map((line) => ({
        id: crypto.randomUUID(),
        accountId: line.accountId,
        description: line.description,
        debit: parseFloat(line.debit || '0'),
        credit: parseFloat(line.credit || '0'),
      }));
      await addJournalEntry({
        date: entryForm.date,
        reference: entryForm.reference || `JRN-${Date.now()}`,
        narration: entryForm.narration,
        lines: payloadLines,
      });
      setEntryForm({
        date: new Date().toISOString().slice(0, 10),
        reference: '',
        narration: '',
        lines: [createEmptyLine(), createEmptyLine()],
      });
    } catch (error) {
      setEntryError(error instanceof Error ? error.message : 'Unable to save entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccountSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountError(null);
    if (!accountForm.name.trim()) {
      setAccountError('Account name is required.');
      return;
    }
    try {
      if (editingAccountId) {
        await updateAccount(editingAccountId, accountForm);
      } else {
        await addAccount({
          ...accountForm,
          isSystem: false,
        });
      }
      setAccountForm({
        name: '',
        code: '',
        type: 'Asset',
        description: '',
      });
      setEditingAccountId(null);
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Unable to save account.');
    }
  };

  const beginAccountEdit = (accountId: string) => {
    const account = accounts.find((acc) => acc.id === accountId);
    if (!account) return;
    setAccountForm({
      name: account.name,
      code: account.code,
      type: account.type,
      description: account.description ?? '',
    });
    setEditingAccountId(accountId);
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <Card
          title="New Journal Entry"
          description="Capture accounting transactions with real-time validation and intelligent account lookup."
        >
          <form className="space-y-5" onSubmit={handleEntrySubmit}>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Date
                <input
                  type="date"
                  required
                  value={entryForm.date}
                  onChange={(event) =>
                    setEntryForm((prev) => ({ ...prev, date: event.target.value }))
                  }
                  className="rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Reference
                <input
                  type="text"
                  placeholder="Auto-generated if blank"
                  value={entryForm.reference}
                  onChange={(event) =>
                    setEntryForm((prev) => ({ ...prev, reference: event.target.value }))
                  }
                  className="rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Narration
                <input
                  type="text"
                  placeholder="Add context (optional)"
                  value={entryForm.narration}
                  onChange={(event) =>
                    setEntryForm((prev) => ({ ...prev, narration: event.target.value }))
                  }
                  className="rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-primary/10 text-left text-xs font-semibold uppercase tracking-wide text-primary">
                  <tr>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Debit</th>
                    <th className="px-4 py-3 text-right">Credit</th>
                    <th className="px-4 py-3 text-right" aria-label="line actions">
                      &nbsp;
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {entryForm.lines.map((line) => (
                    <tr key={line.tempId} className="align-top">
                      <td className="px-4 py-3">
                        <div className="relative">
                          <input
                            list="account-datalist"
                            value={
                              accounts.find((acc) => acc.id === line.accountId)?.name ?? ''
                            }
                            onChange={(event) => {
                              const accountName = event.target.value;
                              const selected = accounts.find(
                                (acc) => acc.name.toLowerCase() === accountName.toLowerCase(),
                              );
                              handleLineChange(
                                line.tempId,
                                'accountId',
                                selected ? selected.id : '',
                              );
                            }}
                            onBlur={(event) => {
                              const accountName = event.target.value;
                              const selected = accounts.find(
                                (acc) => acc.name.toLowerCase() === accountName.toLowerCase(),
                              );
                              if (!selected) {
                                handleLineChange(line.tempId, 'accountId', '');
                              }
                            }}
                            placeholder="Search account..."
                            className="w-full rounded-xl border border-border px-3 py-2 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <datalist id="account-datalist">
                            {accounts.map((account) => (
                              <option key={account.id} value={account.name}>
                                {account.code} — {account.name}
                              </option>
                            ))}
                          </datalist>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(event) =>
                            handleLineChange(line.tempId, 'description', event.target.value)
                          }
                          placeholder="Optional line narration"
                          className="w-full rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={line.debit}
                          onChange={(event) => {
                            handleLineChange(line.tempId, 'debit', event.target.value);
                            if (parseFloat(event.target.value || '0') > 0) {
                              handleLineChange(line.tempId, 'credit', '');
                            }
                          }}
                          className="w-full rounded-xl border border-border px-3 py-2 text-right focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={line.credit}
                          onChange={(event) => {
                            handleLineChange(line.tempId, 'credit', event.target.value);
                            if (parseFloat(event.target.value || '0') > 0) {
                              handleLineChange(line.tempId, 'debit', '');
                            }
                          }}
                          className="w-full rounded-xl border border-border px-3 py-2 text-right focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.tempId)}
                          className="rounded-xl border border-transparent px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/10"
                          disabled={entryForm.lines.length <= 2}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-primary/5 text-sm font-semibold text-primary">
                  <tr>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={handleAddLine}
                        className="rounded-xl border border-primary/30 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
                      >
                        Add Line
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right uppercase text-xs text-slate-500">
                      Totals
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(debitTotal, settings)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(creditTotal, settings)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            {!isBalanced && (
              <p className="text-sm font-medium text-danger">
                Difference detected: {formatCurrency(debitTotal - creditTotal, settings)}
              </p>
            )}
            {entryError && <p className="text-sm font-medium text-danger">{entryError}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Entries automatically enforce double-entry bookkeeping.
              </p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-2xl bg-gradient-to-r from-primary to-accent px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Posting…' : 'Post Journal Entry'}
              </button>
            </div>
          </form>
        </Card>

        <Card
          title="Journal Ledger"
          description="Sortable, filterable view of every posting with drill-down across debit and credit legs."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Search reference, narration, account"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-64 rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          }
        >
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-primary/10 text-left text-xs font-semibold uppercase tracking-wide text-primary">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Lines</th>
                  <th className="px-4 py-3 text-right">Debit</th>
                  <th className="px-4 py-3 text-right">Credit</th>
                  <th className="px-4 py-3 text-right" aria-label="actions">
                    &nbsp;
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {filteredEntries.map((entry) => {
                  const debit = entry.lines.reduce((acc, line) => acc + line.debit, 0);
                  const credit = entry.lines.reduce((acc, line) => acc + line.credit, 0);
                  return (
                    <tr key={entry.id} className="align-top">
                      <td className="px-4 py-3">{formatDate(entry.date, settings)}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{entry.reference}</div>
                        <div className="text-xs text-slate-500">{entry.narration}</div>
                      </td>
                      <td className="px-4 py-3">
                        <ul className="space-y-2">
                          {entry.lines.map((line) => {
                            const account = accounts.find((acc) => acc.id === line.accountId);
                            return (
                              <li
                                key={line.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary/5 px-3 py-2 text-xs text-slate-600"
                              >
                                <div>
                                  <p className="font-medium text-slate-800">
                                    {account?.name ?? 'Account removed'}
                                  </p>
                                  {line.description && (
                                    <p className="text-slate-500">{line.description}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-primary">
                                    {line.debit > 0 ? `Dr ${line.debit.toFixed(2)}` : ''}
                                  </p>
                                  <p className="text-danger">
                                    {line.credit > 0 ? `Cr ${line.credit.toFixed(2)}` : ''}
                                  </p>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">
                        {formatCurrency(debit, settings)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-danger">
                        {formatCurrency(credit, settings)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => deleteJournalEntry(entry.id)}
                          className="rounded-xl border border-transparent px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/10"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card
          title={editingAccountId ? 'Edit Account' : 'Add Account'}
          description="Manage your chart of accounts. System accounts are protected from deletion."
        >
          <form className="space-y-4" onSubmit={handleAccountSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Account Name
              <input
                required
                value={accountForm.name}
                onChange={(event) =>
                  setAccountForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Account Code
              <input
                value={accountForm.code}
                onChange={(event) =>
                  setAccountForm((prev) => ({ ...prev, code: event.target.value }))
                }
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Type
              <select
                value={accountForm.type}
                onChange={(event) =>
                  setAccountForm((prev) => ({
                    ...prev,
                    type: event.target.value as AccountType,
                  }))
                }
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Description
              <textarea
                value={accountForm.description}
                onChange={(event) =>
                  setAccountForm((prev) => ({ ...prev, description: event.target.value }))
                }
                rows={3}
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            {accountError && <p className="text-sm font-medium text-danger">{accountError}</p>}
            <div className="flex items-center justify-between gap-3">
              {editingAccountId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingAccountId(null);
                    setAccountForm({
                      name: '',
                      code: '',
                      type: 'Asset',
                      description: '',
                    });
                  }}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-primary/10"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                className="ml-auto rounded-2xl bg-gradient-to-r from-primary to-accent px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:shadow-lg"
              >
                {editingAccountId ? 'Update Account' : 'Add Account'}
              </button>
            </div>
          </form>
        </Card>

        <Card
          title="Accounts"
          description="Complete chart of accounts. Protected system accounts are labelled."
        >
          <div className="max-h-[420px] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-primary/10 text-left text-xs font-semibold uppercase tracking-wide text-primary">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {account.name}{' '}
                      {account.isSystem && (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                          System
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{account.code}</td>
                    <td className="px-4 py-3 text-slate-600">{account.type}</td>
                    <td className="px-4 py-3 text-slate-600">{account.description}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => beginAccountEdit(account.id)}
                          className="rounded-xl border border-transparent px-3 py-1 font-semibold text-primary transition hover:bg-primary/10"
                        >
                          Edit
                        </button>
                        {!account.isSystem && (
                          <button
                            type="button"
                            onClick={() => deleteAccount(account.id)}
                            className="rounded-xl border border-transparent px-3 py-1 font-semibold text-danger transition hover:bg-danger/10"
                          >
                            Delete
                          </button>
                        )}
                      </div>
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

function createEmptyLine(): DraftLine {
  return {
    tempId: crypto.randomUUID(),
    accountId: '',
    description: '',
    debit: '',
    credit: '',
  };
}
