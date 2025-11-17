'use client';

import { useMemo, useState } from 'react';
import { useAppData } from '@/lib/data-context';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type {
  Invoice,
  InvoiceLine,
  InventoryItem,
  ProfileSettings,
  Warehouse,
} from '@/lib/types';
import { createInvoicePdf } from '@/lib/pdf';
import { Card } from '../common/Card';

type DraftInvoiceLine = {
  tempId: string;
  inventoryId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
  warehouseId: string;
};

const emptyDraftLine = (): DraftInvoiceLine => ({
  tempId: crypto.randomUUID(),
  inventoryId: '',
  description: '',
  quantity: '1',
  unitPrice: '',
  discount: '0',
  taxRate: '0',
  warehouseId: '',
});

export function Invoicing() {
  const {
    parties,
    inventoryItems,
    warehouses,
    addInvoice,
    invoices,
    updateInvoiceStatus,
    deleteInvoice,
    settings,
  } = useAppData();
  const customers = parties.filter((party) => party.type === 'customer');

  const [draft, setDraft] = useState({
    invoiceNumber: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, '0')}`,
    date: new Date().toISOString().slice(0, 10),
    dueDate: '',
    customerId: customers[0]?.id ?? '',
    billingAddress: customers[0]?.address ?? '',
    shippingAddress: customers[0]?.address ?? '',
    lines: [emptyDraftLine()],
    notes: 'Thank you for your business!',
  });
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const totals = useMemo(() => computeTotals(draft.lines, inventoryItems), [draft.lines, inventoryItems]);

  const handleLineChange = (id: string, field: keyof DraftInvoiceLine, value: string) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => (line.tempId === id ? { ...line, [field]: value } : line)),
    }));
  };

  const addLine = () => {
    setDraft((prev) => ({ ...prev, lines: [...prev.lines, emptyDraftLine()] }));
  };

  const removeLine = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.length === 1 ? prev.lines : prev.lines.filter((line) => line.tempId !== id),
    }));
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find((party) => party.id === customerId);
    setDraft((prev) => ({
      ...prev,
      customerId,
      billingAddress: customer?.address ?? '',
      shippingAddress: customer?.address ?? '',
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!draft.customerId) {
      setError('Select a customer for the invoice.');
      return;
    }
    if (draft.lines.some((line) => !line.inventoryId)) {
      setError('Each line requires an inventory item.');
      return;
    }
    if (totals.subtotal <= 0) {
      setError('Invoice must contain at least one billable line.');
      return;
    }
    setIsGenerating(true);
    try {
      const enrichedLines: InvoiceLine[] = draft.lines.map((line) => ({
        id: crypto.randomUUID(),
        inventoryId: line.inventoryId,
        description: line.description,
        quantity: parseFloat(line.quantity || '0'),
        unitPrice: parseFloat(line.unitPrice || '0'),
        discount: parseFloat(line.discount || '0'),
        taxRate: parseFloat(line.taxRate || '0'),
        warehouseId: line.warehouseId || undefined,
      }));
      const invoicePayload: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'> = {
        invoiceNumber: draft.invoiceNumber,
        date: draft.date,
        dueDate: draft.dueDate || undefined,
        customerId: draft.customerId,
        billingAddress: draft.billingAddress,
        shippingAddress: draft.shippingAddress,
        lines: enrichedLines,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        status: 'issued',
      };
      await addInvoice(invoicePayload);
      await downloadInvoicePdf(
        {
          invoiceNumber: invoicePayload.invoiceNumber,
          date: invoicePayload.date,
          dueDate: invoicePayload.dueDate,
          billingAddress: invoicePayload.billingAddress,
          shippingAddress: invoicePayload.shippingAddress,
          lines: enrichedLines,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          taxTotal: totals.taxTotal,
          total: totals.total,
        },
        customers.find((party) => party.id === draft.customerId)?.name ?? 'Customer',
        inventoryItems,
        warehouses,
        settings?.profile.firmName ?? 'YOUREKA by QUAZENTA',
        settings?.profile,
        draft.notes,
      );
      setDraft({
        invoiceNumber: `INV-${new Date().getFullYear()}-${String(invoices.length + 2).padStart(4, '0')}`,
        date: new Date().toISOString().slice(0, 10),
        dueDate: '',
        customerId: customers[0]?.id ?? '',
        billingAddress: customers[0]?.address ?? '',
        shippingAddress: customers[0]?.address ?? '',
        lines: [emptyDraftLine()],
        notes: 'Thank you for your business!',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create invoice.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <Card
        title="Invoice Builder"
        description="Generate GST-compliant invoices with automated journal postings and inventory reconciliation."
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-4">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 md:col-span-2">
              Customer
              <select
                value={draft.customerId}
                onChange={(event) => handleCustomerChange(event.target.value)}
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Invoice #
              <input
                value={draft.invoiceNumber}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, invoiceNumber: event.target.value }))
                }
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Date
              <input
                type="date"
                value={draft.date}
                onChange={(event) => setDraft((prev) => ({ ...prev, date: event.target.value }))}
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Due Date
              <input
                type="date"
                value={draft.dueDate}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, dueDate: event.target.value }))
                }
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Billing Address
              <textarea
                rows={3}
                value={draft.billingAddress}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, billingAddress: event.target.value }))
                }
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Shipping Address
              <textarea
                rows={3}
                value={draft.shippingAddress}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, shippingAddress: event.target.value }))
                }
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-primary/10 text-left text-xs font-semibold uppercase tracking-wide text-primary">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">Discount %</th>
                  <th className="px-4 py-3 text-right">Tax %</th>
                  <th className="px-4 py-3">Warehouse</th>
                  <th className="px-4 py-3 text-right">Line Total</th>
                  <th className="px-4 py-3 text-right" aria-label="actions">
                    &nbsp;
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {draft.lines.map((line) => {
                  const selectedItem = inventoryItems.find((item) => item.id === line.inventoryId);
                  const quantity = parseFloat(line.quantity || '0');
                  const rate = parseFloat(line.unitPrice || `${selectedItem?.unitPrice ?? 0}`);
                  const discount = parseFloat(line.discount || '0');
                  const taxRate = parseFloat(line.taxRate || '0');
                  const lineTotal = calculateLineTotal(quantity, rate, discount, taxRate);
                  return (
                    <tr key={line.tempId} className="align-top">
                      <td className="px-4 py-3">
                        <select
                          value={line.inventoryId}
                          onChange={(event) => {
                            const inventoryId = event.target.value;
                            const inventory = inventoryItems.find((item) => item.id === inventoryId);
                            handleLineChange(line.tempId, 'inventoryId', inventoryId);
                            if (inventory) {
                              handleLineChange(
                                line.tempId,
                                'unitPrice',
                                inventory.unitPrice.toString(),
                              );
                              handleLineChange(
                                line.tempId,
                                'warehouseId',
                                inventory.preferredWarehouseId ?? '',
                              );
                            }
                          }}
                          className="w-full rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                          required
                        >
                          <option value="">Select item</option>
                          {inventoryItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.sku} — {item.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(event) =>
                            handleLineChange(line.tempId, 'description', event.target.value)
                          }
                          placeholder="Optional description"
                          className="w-full rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          inputMode="decimal"
                          value={line.quantity}
                          onChange={(event) =>
                            handleLineChange(line.tempId, 'quantity', event.target.value)
                          }
                          className="w-full rounded-xl border border-border px-3 py-2 text-right focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={line.unitPrice}
                          onChange={(event) =>
                            handleLineChange(line.tempId, 'unitPrice', event.target.value)
                          }
                          className="w-full rounded-xl border border-border px-3 py-2 text-right focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={line.discount}
                          onChange={(event) =>
                            handleLineChange(line.tempId, 'discount', event.target.value)
                          }
                          className="w-full rounded-xl border border-border px-3 py-2 text-right focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={line.taxRate}
                          onChange={(event) =>
                            handleLineChange(line.tempId, 'taxRate', event.target.value)
                          }
                          className="w-full rounded-xl border border-border px-3 py-2 text-right focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={line.warehouseId}
                          onChange={(event) => handleLineChange(line.tempId, 'warehouseId', event.target.value)}
                          className="w-full rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          <option value="">Auto</option>
                          {warehouses.map((warehouse) => (
                            <option key={warehouse.id} value={warehouse.id}>
                              {warehouse.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">
                        {formatCurrency(lineTotal, settings)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeLine(line.tempId)}
                          className="rounded-xl border border-transparent px-3 py-1 text-xs font-semibold text-danger transition hover:bg-danger/10"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-primary/5 text-sm">
                <tr>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={addLine}
                      className="rounded-xl border border-primary/30 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
                    >
                      Add Line
                    </button>
                  </td>
                  <td colSpan={6} className="px-4 py-3 text-right uppercase text-xs text-slate-500">
                    Subtotal
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-primary">
                    {formatCurrency(totals.subtotal, settings)}
                  </td>
                </tr>
                <tr>
                  <td />
                  <td colSpan={6} className="px-4 py-3 text-right uppercase text-xs text-slate-500">
                    Discounts
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-danger">
                    {formatCurrency(totals.discountTotal, settings)}
                  </td>
                </tr>
                <tr>
                  <td />
                  <td colSpan={6} className="px-4 py-3 text-right uppercase text-xs text-slate-500">
                    Tax
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-primary">
                    {formatCurrency(totals.taxTotal, settings)}
                  </td>
                </tr>
                <tr>
                  <td />
                  <td colSpan={6} className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right text-xl font-semibold text-primary">
                    {formatCurrency(totals.total, settings)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Notes
            <textarea
              rows={4}
              value={draft.notes}
              onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
              className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>

          {error && <p className="text-sm font-medium text-danger">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Inventory and journal entries update automatically once invoice is generated.
            </p>
            <button
              type="submit"
              disabled={isGenerating}
              className="rounded-2xl bg-gradient-to-r from-primary to-accent px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? 'Generating…' : 'Generate Invoice'}
            </button>
          </div>
        </form>
      </Card>

      <Card
        title="Invoices"
        description="Track receivables, update payment status, and download PDF copies instantly."
      >
        <div className="max-h-[720px] overflow-y-auto text-sm">
          <table className="min-w-full text-left">
            <thead className="sticky top-0 bg-primary/10 text-xs font-semibold uppercase tracking-wide text-primary">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {invoices
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((invoice) => {
                  const customer = customers.find((party) => party.id === invoice.customerId);
                  return (
                    <tr key={invoice.id}>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{customer?.name ?? 'Customer removed'}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(invoice.date, settings)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">
                        {formatCurrency(invoice.total, settings)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <select
                          value={invoice.status}
                          onChange={(event) =>
                            updateInvoiceStatus(
                              invoice.id,
                              event.target.value as Invoice['status'],
                            )
                          }
                          className="rounded-xl border border-border px-3 py-1 text-xs font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          <option value="draft">Draft</option>
                          <option value="issued">Issued</option>
                          <option value="paid">Paid</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              downloadInvoicePdf(
                                invoice,
                                customer?.name ?? 'Customer',
                                inventoryItems,
                                warehouses,
                                settings?.profile.firmName ?? 'YOUREKA by QUAZENTA',
                                settings?.profile,
                              )
                            }
                            className="rounded-xl border border-transparent px-3 py-1 font-semibold text-primary transition hover:bg-primary/10"
                          >
                            Download
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteInvoice(invoice.id)}
                            className="rounded-xl border border-transparent px-3 py-1 font-semibold text-danger transition hover:bg-danger/10"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                    No invoices generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function calculateLineTotal(quantity: number, rate: number, discount: number, taxRate: number) {
  const base = quantity * rate;
  const discountAmount = base * (discount / 100);
  const taxable = base - discountAmount;
  const taxAmount = taxable * (taxRate / 100);
  return taxable + taxAmount;
}

function computeTotals(lines: DraftInvoiceLine[], inventoryItems: InventoryItem[]) {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  for (const line of lines) {
    const quantity = parseFloat(line.quantity || '0');
    if (!quantity) continue;
    const inventory = inventoryItems.find((item) => item.id === line.inventoryId);
    const rate = parseFloat(line.unitPrice || `${inventory?.unitPrice ?? 0}`);
    const discount = parseFloat(line.discount || '0');
    const taxRate = parseFloat(line.taxRate || '0');
    const base = quantity * rate;
    const discountAmount = base * (discount / 100);
    const taxable = base - discountAmount;
    const taxAmount = taxable * (taxRate / 100);
    subtotal += taxable;
    discountTotal += discountAmount;
    taxTotal += taxAmount;
  }
  return {
    subtotal,
    discountTotal,
    taxTotal,
    total: subtotal + taxTotal,
  };
}

async function downloadInvoicePdf(
  invoice: {
    invoiceNumber: string;
    date: string;
    dueDate?: string;
    billingAddress?: string;
    shippingAddress?: string;
    lines: InvoiceLine[];
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    total: number;
  },
  customerName: string,
  inventoryItems: InventoryItem[],
  warehouses: Warehouse[],
  firmName: string,
  profile?: ProfileSettings,
  notes?: string,
) {
  const lines = invoice.lines.map((line) => {
    const inventory = inventoryItems.find((item) => item.id === line.inventoryId);
    const warehouse = warehouses.find((wh) => wh.id === line.warehouseId);
    const descriptionParts = [
      line.description?.trim() || '',
      warehouse?.name ? `Warehouse: ${warehouse.name}` : '',
    ].filter(Boolean);
    const description =
      descriptionParts.join(' • ') || inventory?.name || 'Invoice line item';
    const quantity = line.quantity;
    const unitPrice = line.unitPrice;
    const discount = line.discount ?? 0;
    const taxRate = line.taxRate ?? 0;
    const amount = calculateLineTotal(quantity, unitPrice, discount, taxRate);
    return {
      description,
      quantity,
      unitPrice,
      taxRate,
      amount,
    };
  });

  const firmContact = [profile?.phone, profile?.email].filter(Boolean).join(' • ');

  await createInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    date: invoice.date,
    dueDate: invoice.dueDate,
    billingAddress: invoice.billingAddress,
    shippingAddress: invoice.shippingAddress,
    customerName,
    firmName,
    firmAddress: profile?.address,
    firmContact: firmContact || undefined,
    totals: {
      subtotal: invoice.subtotal,
      discountTotal: invoice.discountTotal,
      taxTotal: invoice.taxTotal,
      total: invoice.total,
    },
    lines,
    notes,
  });
}
