'use client';

import { useMemo, useState } from 'react';
import { useAppData } from '@/lib/data-context';
import { formatCurrency } from '@/lib/formatters';
import type { InventoryItem, Warehouse } from '@/lib/types';
import { Card } from '../common/Card';

interface InventoryFormState {
  sku: string;
  name: string;
  description: string;
  unitPrice: string;
  quantity: string;
  preferredWarehouseId: string;
  reorderPoint: string;
}

const EMPTY_INVENTORY_FORM: InventoryFormState = {
  sku: '',
  name: '',
  description: '',
  unitPrice: '',
  quantity: '',
  preferredWarehouseId: '',
  reorderPoint: '',
};

interface WarehouseFormState {
  name: string;
  location: string;
  manager: string;
}

const EMPTY_WAREHOUSE_FORM: WarehouseFormState = {
  name: '',
  location: '',
  manager: '',
};

export function Inventory() {
  const {
    warehouses,
    inventoryItems,
    adjustInventoryStock,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    addWarehouse,
    updateWarehouse,
    deleteWarehouse,
    inventoryLedger,
    settings,
  } = useAppData();

  const [inventoryForm, setInventoryForm] = useState(EMPTY_INVENTORY_FORM);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [warehouseForm, setWarehouseForm] = useState(EMPTY_WAREHOUSE_FORM);
  const [warehouseError, setWarehouseError] = useState<string | null>(null);
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});

  const lowStockItems = useMemo(() => {
    return inventoryItems.filter(
      (item) =>
        item.reorderPoint !== undefined &&
        item.reorderPoint !== null &&
        item.reorderPoint > 0 &&
        item.quantity <= item.reorderPoint,
    );
  }, [inventoryItems]);

  const totalStockValue = useMemo(
    () =>
      inventoryItems.reduce(
        (acc, item) => acc + item.unitPrice * (item.quantity ?? 0),
        0,
      ),
    [inventoryItems],
  );

  const startInventoryEdit = (id: string) => {
    const item = inventoryItems.find((inventory) => inventory.id === id);
    if (!item) return;
    setInventoryForm({
      sku: item.sku,
      name: item.name,
      description: item.description ?? '',
      unitPrice: item.unitPrice.toString(),
      quantity: item.quantity.toString(),
      preferredWarehouseId: item.preferredWarehouseId ?? '',
      reorderPoint: (item.reorderPoint ?? '').toString(),
    });
    setEditingItemId(id);
  };

  const startWarehouseEdit = (id: string) => {
    const warehouse = warehouses.find((warehouseItem) => warehouseItem.id === id);
    if (!warehouse) return;
    setWarehouseForm({
      name: warehouse.name,
      location: warehouse.location ?? '',
      manager: warehouse.manager ?? '',
    });
    setEditingWarehouseId(id);
  };

  const handleInventorySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInventoryError(null);
    if (!inventoryForm.name.trim() || !inventoryForm.sku.trim()) {
      setInventoryError('SKU and Name are required.');
      return;
    }
    const unitPrice = parseFloat(inventoryForm.unitPrice || '0');
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      setInventoryError('Enter a valid unit price.');
      return;
    }
    const quantity = parseFloat(inventoryForm.quantity || '0');
    if (Number.isNaN(quantity) || quantity < 0) {
      setInventoryError('Quantity must be zero or greater.');
      return;
    }
    const reorderPoint = parseFloat(inventoryForm.reorderPoint || '0');
    try {
      const payload = {
        sku: inventoryForm.sku.toUpperCase(),
        name: inventoryForm.name,
        description: inventoryForm.description,
        unitPrice,
        quantity,
        preferredWarehouseId: inventoryForm.preferredWarehouseId || undefined,
        reorderPoint: Number.isNaN(reorderPoint) ? undefined : reorderPoint,
        stockByWarehouse: buildStockByWarehouse(
          inventoryForm.preferredWarehouseId,
          quantity,
          warehouses,
        ),
      };
      if (editingItemId) {
        await updateInventoryItem(editingItemId, payload);
      } else {
        await addInventoryItem(payload);
      }
      setInventoryForm(EMPTY_INVENTORY_FORM);
      setEditingItemId(null);
    } catch (error) {
      setInventoryError(error instanceof Error ? error.message : 'Unable to save inventory item.');
    }
  };

  const handleWarehouseSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWarehouseError(null);
    if (!warehouseForm.name.trim()) {
      setWarehouseError('Warehouse name is required.');
      return;
    }
    try {
      if (editingWarehouseId) {
        await updateWarehouse(editingWarehouseId, warehouseForm);
      } else {
        await addWarehouse(warehouseForm);
      }
      setWarehouseForm(EMPTY_WAREHOUSE_FORM);
      setEditingWarehouseId(null);
    } catch (error) {
      setWarehouseError(error instanceof Error ? error.message : 'Unable to save warehouse.');
    }
  };

  const performAdjustment = async (item: InventoryItem, warehouse: Warehouse) => {
    const delta = parseFloat(adjustments[`${item.id}-${warehouse.id}`] || '0');
    if (!delta || Number.isNaN(delta)) return;
    await adjustInventoryStock(
      item.id,
      warehouse.id,
      delta,
      `Manual adjustment (${delta > 0 ? 'Increase' : 'Decrease'})`,
      new Date().toISOString(),
    );
    setAdjustments((prev) => ({ ...prev, [`${item.id}-${warehouse.id}`]: '' }));
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.8fr_1.2fr]">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard label="Inventory Items" value={inventoryItems.length.toString()} />
          <SummaryCard
            label="Stock Value"
            value={formatCurrency(totalStockValue, settings)}
            status="good"
          />
          <SummaryCard
            label="Low Stock Alerts"
            value={lowStockItems.length.toString()}
            status={lowStockItems.length > 0 ? 'warning' : 'good'}
          />
        </div>

        <Card
          title="Inventory Catalogue"
          description="Track stock across warehouses, monitor reorder points, and action replenishment."
        >
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-primary/10 text-left text-xs font-semibold uppercase tracking-wide text-primary">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Warehouse Distribution</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Reorder</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {inventoryItems.map((item) => (
                  <tr key={item.id} className={lowStockItems.includes(item) ? 'bg-warning/10' : ''}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.sku}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      <ul className="space-y-2 text-xs">
                        {warehouses.map((warehouse) => (
                          <li
                            key={warehouse.id}
                            className="rounded-xl bg-primary/5 px-3 py-2 text-slate-600"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800">{warehouse.name}</span>
                              <span>{item.stockByWarehouse[warehouse.id] ?? 0} units</span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                type="number"
                                step="1"
                                inputMode="numeric"
                                value={adjustments[`${item.id}-${warehouse.id}`] ?? ''}
                                onChange={(event) =>
                                  setAdjustments((prev) => ({
                                    ...prev,
                                    [`${item.id}-${warehouse.id}`]: event.target.value,
                                  }))
                                }
                                placeholder="+/-"
                                className="w-24 rounded-xl border border-border px-3 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                              <button
                                type="button"
                                onClick={() => performAdjustment(item, warehouse)}
                                className="rounded-xl bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/20"
                              >
                                Adjust
                              </button>
                            </div>
                          </li>
                        ))}
                        {warehouses.length === 0 && (
                          <li className="rounded-xl bg-primary/5 px-3 py-2 text-xs text-slate-600">
                            Define warehouses to distribute stock.
                          </li>
                        )}
                      </ul>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatCurrency(item.unitPrice, settings)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {item.reorderPoint ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => startInventoryEdit(item.id)}
                          className="rounded-xl border border-transparent px-3 py-1 font-semibold text-primary transition hover:bg-primary/10"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteInventoryItem(item.id)}
                          className="rounded-xl border border-transparent px-3 py-1 font-semibold text-danger transition hover:bg-danger/10"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {inventoryItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                      No inventory recorded yet. Use the form to add your first item.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title="Inventory Ledger"
          description="Chronological record of every stock movement across warehouses."
        >
          <div className="max-h-96 overflow-y-auto text-sm">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead className="sticky top-0 bg-white text-left text-xs font-semibold uppercase tracking-wide text-primary">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2">Warehouse</th>
                  <th className="px-4 py-2 text-right">Quantity Δ</th>
                  <th className="px-4 py-2">Reference</th>
                </tr>
              </thead>
              <tbody>
                {inventoryLedger
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((ledger) => {
                    const item = inventoryItems.find((inventory) => inventory.id === ledger.inventoryId);
                    const warehouse = warehouses.find((w) => w.id === ledger.warehouseId);
                    return (
                      <tr key={ledger.id} className="rounded-xl bg-primary/5">
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(ledger.date).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {item?.name ?? 'Item removed'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {warehouse?.name ?? 'Warehouse removed'}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold ${ledger.quantityDelta >= 0 ? 'text-primary' : 'text-danger'}`}
                        >
                          {ledger.quantityDelta >= 0 ? '+' : ''}
                          {ledger.quantityDelta}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{ledger.reference}</td>
                      </tr>
                    );
                  })}
                {inventoryLedger.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card
          title={editingItemId ? 'Edit Inventory Item' : 'Add Inventory Item'}
          description="Assign items to warehouses, configure reorder points, and maintain valuation."
        >
          <form className="space-y-4" onSubmit={handleInventorySubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                SKU
                <input
                  required
                  value={inventoryForm.sku}
                  onChange={(event) =>
                    setInventoryForm((prev) => ({ ...prev, sku: event.target.value }))
                  }
                  className="rounded-xl border border-border px-3 py-2 uppercase focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Name
                <input
                  required
                  value={inventoryForm.name}
                  onChange={(event) =>
                    setInventoryForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Description
              <textarea
                rows={3}
                value={inventoryForm.description}
                onChange={(event) =>
                  setInventoryForm((prev) => ({ ...prev, description: event.target.value }))
                }
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Unit Price
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={inventoryForm.unitPrice}
                  onChange={(event) =>
                    setInventoryForm((prev) => ({ ...prev, unitPrice: event.target.value }))
                  }
                  className="rounded-xl border border-border px-3 py-2 text-right focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Quantity
                <input
                  type="number"
                  step="1"
                  min="0"
                  inputMode="decimal"
                  value={inventoryForm.quantity}
                  onChange={(event) =>
                    setInventoryForm((prev) => ({ ...prev, quantity: event.target.value }))
                  }
                  className="rounded-xl border border-border px-3 py-2 text-right focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Preferred Warehouse
                <select
                  value={inventoryForm.preferredWarehouseId}
                  onChange={(event) =>
                    setInventoryForm((prev) => ({
                      ...prev,
                      preferredWarehouseId: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Reorder Point
                <input
                  type="number"
                  step="1"
                  min="0"
                  inputMode="decimal"
                  value={inventoryForm.reorderPoint}
                  onChange={(event) =>
                    setInventoryForm((prev) => ({ ...prev, reorderPoint: event.target.value }))
                  }
                  className="rounded-xl border border-border px-3 py-2 text-right focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
            </div>
            {inventoryError && <p className="text-sm font-medium text-danger">{inventoryError}</p>}
            <div className="flex items-center justify-between gap-3">
              {editingItemId && (
                <button
                  type="button"
                  onClick={() => {
                    setInventoryForm(EMPTY_INVENTORY_FORM);
                    setEditingItemId(null);
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
                {editingItemId ? 'Update Inventory' : 'Add Inventory'}
              </button>
            </div>
          </form>
        </Card>

        <Card
          title={editingWarehouseId ? 'Edit Warehouse' : 'Add Warehouse'}
          description="Set up warehouse network to enable stock allocation and multi-location visibility."
        >
          <form className="space-y-4" onSubmit={handleWarehouseSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Name
              <input
                required
                value={warehouseForm.name}
                onChange={(event) =>
                  setWarehouseForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Location
              <input
                value={warehouseForm.location}
                onChange={(event) =>
                  setWarehouseForm((prev) => ({ ...prev, location: event.target.value }))
                }
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Warehouse Manager
              <input
                value={warehouseForm.manager}
                onChange={(event) =>
                  setWarehouseForm((prev) => ({ ...prev, manager: event.target.value }))
                }
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            {warehouseError && <p className="text-sm font-medium text-danger">{warehouseError}</p>}
            <div className="flex items-center justify-between gap-3">
              {editingWarehouseId && (
                <button
                  type="button"
                  onClick={() => {
                    setWarehouseForm(EMPTY_WAREHOUSE_FORM);
                    setEditingWarehouseId(null);
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
                {editingWarehouseId ? 'Update Warehouse' : 'Add Warehouse'}
              </button>
            </div>
          </form>
        </Card>

        <Card title="Warehouses" description="Active storage locations with quick editing controls.">
          <div className="max-h-80 overflow-y-auto text-sm">
            <table className="min-w-full text-left">
              <thead className="sticky top-0 bg-primary/10 text-xs font-semibold uppercase tracking-wide text-primary">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Manager</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {warehouses.map((warehouse) => (
                  <tr key={warehouse.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{warehouse.name}</td>
                    <td className="px-4 py-3 text-slate-600">{warehouse.location || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{warehouse.manager || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => startWarehouseEdit(warehouse.id)}
                          className="rounded-xl border border-transparent px-3 py-1 font-semibold text-primary transition hover:bg-primary/10"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteWarehouse(warehouse.id)}
                          className="rounded-xl border border-transparent px-3 py-1 font-semibold text-danger transition hover:bg-danger/10"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {warehouses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                      No warehouses configured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function buildStockByWarehouse(
  preferredWarehouseId: string,
  quantity: number,
  warehouses: Warehouse[],
) {
  if (!preferredWarehouseId) return {};
  const warehouseExists = warehouses.some((warehouse) => warehouse.id === preferredWarehouseId);
  if (!warehouseExists) return {};
  return {
    [preferredWarehouseId]: quantity,
  };
}

interface SummaryCardProps {
  label: string;
  value: string;
  status?: 'good' | 'warning';
}

function SummaryCard({ label, value, status }: SummaryCardProps) {
  return (
    <article
      className={`rounded-3xl border border-white/40 bg-gradient-to-br p-5 text-white shadow-lg ${
        status === 'warning'
          ? 'from-danger to-warning'
          : status === 'good'
            ? 'from-primary to-accent'
            : 'from-slate-600 to-slate-800'
      }`}
    >
      <p className="text-xs uppercase tracking-wider text-white/80">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </article>
  );
}
