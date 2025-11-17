'use client';

import { useMemo, useState } from 'react';
import { useAppData } from '@/lib/data-context';
import type { PartyType } from '@/lib/types';
import { Card } from '../common/Card';

interface PartyFormState {
  type: PartyType;
  name: string;
  address: string;
  contact: string;
  email: string;
  gstin: string;
  creditTerms: string;
}

const EMPTY_FORM: PartyFormState = {
  type: 'customer',
  name: '',
  address: '',
  contact: '',
  email: '',
  gstin: '',
  creditTerms: '',
};

export function PartyManagement() {
  const { parties, addParty, updateParty, deleteParty } = useAppData();
  const [formState, setFormState] = useState<PartyFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<PartyType>('customer');
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredParties = useMemo(() => {
    return parties
      .filter((party) => party.type === activeTab)
      .filter((party) => {
        const needle = searchTerm.trim().toLowerCase();
        if (!needle) return true;
        return (
          party.name.toLowerCase().includes(needle) ||
          party.contact?.toLowerCase().includes(needle) ||
          party.email?.toLowerCase().includes(needle) ||
          party.gstin?.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [parties, activeTab, searchTerm]);

  const startEdit = (id: string) => {
    const party = parties.find((p) => p.id === id);
    if (!party) return;
    setFormState({
      type: party.type,
      name: party.name,
      address: party.address ?? '',
      contact: party.contact ?? '',
      email: party.email ?? '',
      gstin: party.gstin ?? '',
      creditTerms: party.creditTerms ?? '',
    });
    setActiveTab(party.type);
    setEditingId(id);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!formState.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (formState.email && !/^\S+@\S+\.\S+$/.test(formState.email)) {
      setFormError('Enter a valid email address.');
      return;
    }
    try {
      if (editingId) {
        await updateParty(editingId, formState);
      } else {
        await addParty(formState);
      }
      setFormState({ ...EMPTY_FORM, type: activeTab });
      setEditingId(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save party.');
    }
  };

  const handleCancel = () => {
    setFormState({ ...EMPTY_FORM, type: activeTab });
    setEditingId(null);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card
        title="Party Registry"
        description="Manage sundry debtors and creditors with validation, GSTIN tracking, and credit terms."
        actions={
          <div className="inline-flex rounded-full border border-primary/40 bg-primary/10 p-1">
            {(['customer', 'vendor'] satisfies PartyType[]).map((type) => {
              const isActive = type === activeTab;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setActiveTab(type);
                    setFormState((prev) => ({ ...prev, type }));
                    setEditingId(null);
                  }}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${isActive ? 'bg-gradient-to-r from-primary to-accent text-white shadow-card' : 'text-primary hover:bg-white'}`}
                >
                  {type === 'customer' ? 'Customers' : 'Vendors'}
                </button>
              );
            })}
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              type="search"
              placeholder={`Search ${activeTab === 'customer' ? 'customer' : 'vendor'}...`}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-72 rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-xs text-slate-500">
              {filteredParties.length} {activeTab === 'customer' ? 'customers' : 'vendors'} listed
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-primary/10 text-left text-xs font-semibold uppercase tracking-wide text-primary">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">GSTIN</th>
                  <th className="px-4 py-3">Credit Terms</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {filteredParties.map((party) => (
                  <tr key={party.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{party.name}</div>
                      {party.address && (
                        <div className="text-xs text-slate-500">{party.address}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{party.contact || '—'}</div>
                      <div className="text-xs text-primary">{party.email || 'No email'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{party.gstin || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{party.creditTerms || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => startEdit(party.id)}
                          className="rounded-xl border border-transparent px-3 py-1 font-semibold text-primary transition hover:bg-primary/10"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteParty(party.id)}
                          className="rounded-xl border border-transparent px-3 py-1 font-semibold text-danger transition hover:bg-danger/10"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredParties.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                      No records yet. Use the form to add your first{' '}
                      {activeTab === 'customer' ? 'customer' : 'vendor'}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Card
        title={editingId ? 'Edit Party' : `Add ${activeTab === 'customer' ? 'Customer' : 'Vendor'}`}
        description="Capture statutory information with inline validation and accessibility-first layout."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Name
            <input
              required
              value={formState.name}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, name: event.target.value }))
              }
              className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Address
            <textarea
              rows={3}
              value={formState.address}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, address: event.target.value }))
              }
              className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Contact Number
              <input
                value={formState.contact}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, contact: event.target.value }))
                }
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                value={formState.email}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, email: event.target.value }))
                }
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              GSTIN
              <input
                value={formState.gstin}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, gstin: event.target.value.toUpperCase() }))
                }
                placeholder="22AAAAA0000A1Z5"
                className="rounded-xl border border-border px-3 py-2 uppercase focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Credit Terms
              <input
                value={formState.creditTerms}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, creditTerms: event.target.value }))
                }
                placeholder="Net 30"
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>
          {formError && <p className="text-sm font-medium text-danger">{formError}</p>}
          <div className="flex items-center justify-between gap-3">
            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-primary/10"
              >
                Cancel Edit
              </button>
            )}
            <button
              type="submit"
              className="ml-auto rounded-2xl bg-gradient-to-r from-primary to-accent px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:shadow-lg"
            >
              {editingId ? 'Update Party' : 'Add Party'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
