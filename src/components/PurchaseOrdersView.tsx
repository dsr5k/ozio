import React, { useState } from 'react';
import { Plus, ShoppingBag, Search, CheckCircle2, AlertTriangle, Clock, Trash2, X, FileText, ArrowRight, Check } from 'lucide-react';
import { PurchaseOrder, Supplier, PurchaseOrderItem, BusinessProfile } from '../types/index.ts';
import { formatINR, isInterStateTransaction, calculateItemTax } from '../lib/gst.ts';
import { api } from '../lib/api.ts';

interface PurchaseOrdersViewProps {
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  profile: BusinessProfile | null;
  onRefresh: () => void;
}

export const PurchaseOrdersView: React.FC<PurchaseOrdersViewProps> = ({
  purchaseOrders,
  suppliers,
  profile,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [poNumber, setPoNumber] = useState<string>(`PO-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [poDate, setPoDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('Standard commercial purchase order');
  const [items, setItems] = useState<
    Array<{
      description: string;
      hsn_sac: string;
      quantity: number;
      unit: string;
      unit_price: number;
      gst_rate: number;
    }>
  >([
    {
      description: 'Enterprise Cloud Server Infrastructure & Bandwidth',
      hsn_sac: '998315',
      quantity: 1,
      unit: 'NOS',
      unit_price: 65000,
      gst_rate: 18,
    },
  ]);

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];
  const isInterState = selectedSupplier && profile
    ? isInterStateTransaction(profile.state_code, selectedSupplier.state_code)
    : false;

  let formTaxable = 0;
  let formTax = 0;

  for (const it of items) {
    const taxableVal = it.quantity * it.unit_price;
    const tax = calculateItemTax(taxableVal, it.gst_rate, isInterState);
    formTaxable += tax.taxableValue;
    formTax += tax.totalTax;
  }

  const formGrandTotal = formTaxable + formTax;

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!selectedSupplierId) {
      setActionError('Please select a supplier.');
      return;
    }

    try {
      let cgstTotal = 0;
      let sgstTotal = 0;
      let igstTotal = 0;

      const itemsPayload = items.map((it) => {
        const taxableVal = it.quantity * it.unit_price;
        const tax = calculateItemTax(taxableVal, it.gst_rate, isInterState);
        cgstTotal += tax.cgstAmount;
        sgstTotal += tax.sgstAmount;
        igstTotal += tax.igstAmount;
        return {
          description: it.description,
          hsn_sac: it.hsn_sac,
          quantity: Number(it.quantity),
          unit: it.unit,
          unit_price: Number(it.unit_price),
          taxable_value: tax.taxableValue,
          gst_rate: Number(it.gst_rate),
          cgst_amount: tax.cgstAmount,
          sgst_amount: tax.sgstAmount,
          igst_amount: tax.igstAmount,
          total_amount: tax.totalAmount,
        };
      });

      const newPO = await api.createPurchaseOrder(
        {
          supplier_id: selectedSupplierId,
          po_number: poNumber,
          po_date: poDate,
          delivery_date: deliveryDate,
          taxable_amount: formTaxable,
          cgst_amount: cgstTotal,
          sgst_amount: sgstTotal,
          igst_amount: igstTotal,
          total_tax: formTax,
          total_amount: formGrandTotal,
          status: 'issued',
          notes,
        },
        itemsPayload
      );

      setActionSuccess(`Purchase Order ${newPO.po_number} created and issued to ${selectedSupplier?.name}!`);
      setCreateModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create Purchase Order');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.updatePurchaseOrderStatus(id, status);
      setActionSuccess(`Purchase Order status updated to "${status}".`);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string, num: string) => {
    if (!confirm(`Delete Purchase Order ${num}?`)) return;
    try {
      await api.deletePurchaseOrder(id);
      setActionSuccess(`Purchase Order ${num} deleted.`);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete PO');
    }
  };

  const filteredPOs = purchaseOrders.filter((po) => {
    const matchesStatus = filterStatus === 'all' || po.status === filterStatus;
    const suppName = po.supplier?.company_name || po.supplier?.name || '';
    const matchesQuery =
      po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      suppName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  const totalPOValue = purchaseOrders.reduce((sum, p) => sum + p.total_amount, 0);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Purchase Orders</span>
          <p className="text-2xl font-bold text-slate-900 mt-2">{purchaseOrders.length}</p>
          <span className="text-[11px] text-slate-400">Total volume</span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Committed Spend</span>
          <p className="text-2xl font-bold text-indigo-700 mt-2">{formatINR(totalPOValue)}</p>
          <span className="text-[11px] text-slate-400">Authorized spend</span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Issued & Pending Delivery</span>
          <p className="text-2xl font-bold text-amber-600 mt-2">
            {purchaseOrders.filter((p) => p.status === 'issued').length}
          </p>
          <span className="text-[11px] text-amber-600">Awaiting vendor receipt</span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fulfilled & Billed</span>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {purchaseOrders.filter((p) => p.status === 'billed').length}
          </p>
          <span className="text-[11px] text-emerald-600">2-Way matched to purchase bill</span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by PO number or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs py-2 px-3 bg-white rounded-lg border border-slate-200 text-slate-700 font-medium"
          >
            <option value="all">All Status</option>
            <option value="issued">Issued</option>
            <option value="received">Received</option>
            <option value="billed">Billed</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Create Purchase Order</span>
        </button>
      </div>

      {/* PO Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">PO #</th>
                <th className="px-6 py-3.5">Supplier (Vendor)</th>
                <th className="px-6 py-3.5">Dates</th>
                <th className="px-6 py-3.5">Taxable Value</th>
                <th className="px-6 py-3.5">GST Tax</th>
                <th className="px-6 py-3.5">Total Amount</th>
                <th className="px-6 py-3.5">Status & Match</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 font-mono">{po.po_number}</p>
                      <span className="text-[10px] text-slate-400">{po.items?.length || 1} item(s)</span>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{po.supplier?.company_name || po.supplier?.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        GSTIN: {po.supplier?.gstin || 'Unregistered'}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-700">Issued: {po.po_date}</p>
                      <p className="text-[11px] text-slate-400">Due: {po.delivery_date || 'N/A'}</p>
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-800">
                      {formatINR(po.taxable_amount)}
                    </td>

                    <td className="px-6 py-4 text-emerald-600 font-medium">
                      {formatINR(po.total_tax)}
                    </td>

                    <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                      {formatINR(po.total_amount)}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        po.status === 'billed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : po.status === 'received'
                          ? 'bg-blue-100 text-blue-800'
                          : po.status === 'issued'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {po.status}
                      </span>
                      {po.matched_purchase_bill_id && (
                        <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                          ✓ Matched Bill
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {po.status === 'issued' && (
                          <button
                            onClick={() => handleUpdateStatus(po.id, 'received')}
                            className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-[11px] font-semibold"
                          >
                            Mark Received
                          </button>
                        )}
                        {po.status === 'received' && (
                          <button
                            onClick={() => handleUpdateStatus(po.id, 'billed')}
                            className="px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded text-[11px] font-semibold"
                          >
                            Mark Billed
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(po.id, po.po_number)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create PO Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Create Official Purchase Order</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="py-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Vendor (Supplier)</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg border border-slate-200 font-medium"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.state_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PO Number</label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supply Tax Classification</label>
                  <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 font-semibold text-slate-700">
                    {isInterState ? 'Inter-state (IGST 18%)' : 'Intra-state (CGST 9% + SGST 9%)'}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PO Date</label>
                  <input
                    type="date"
                    value={poDate}
                    onChange={(e) => setPoDate(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Delivery Date</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Notes / Instructions</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs mb-2">Ordered Items</h4>
                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex gap-3 items-center">
                      <input
                        type="text"
                        placeholder="Item Description"
                        value={it.description}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].description = e.target.value;
                          setItems(updated);
                        }}
                        className="flex-1 p-2 rounded-lg border border-slate-200 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="HSN/SAC"
                        value={it.hsn_sac}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].hsn_sac = e.target.value;
                          setItems(updated);
                        }}
                        className="w-24 p-2 rounded-lg border border-slate-200 bg-white font-mono"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].quantity = Number(e.target.value);
                          setItems(updated);
                        }}
                        className="w-16 p-2 rounded-lg border border-slate-200 bg-white text-center"
                      />
                      <input
                        type="number"
                        placeholder="Unit Price"
                        value={it.unit_price}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].unit_price = Number(e.target.value);
                          setItems(updated);
                        }}
                        className="w-24 p-2 rounded-lg border border-slate-200 bg-white text-right"
                      />
                      <select
                        value={it.gst_rate}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].gst_rate = Number(e.target.value);
                          setItems(updated);
                        }}
                        className="w-20 p-2 rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex justify-between">
                <div>
                  <span className="text-slate-500">Taxable Value:</span>
                  <p className="font-bold text-slate-800">{formatINR(formTaxable)}</p>
                </div>
                <div>
                  <span className="text-slate-500">GST Component:</span>
                  <p className="font-bold text-emerald-700">{formatINR(formTax)}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Total Purchase Order:</span>
                  <p className="text-base font-bold text-indigo-700">{formatINR(formGrandTotal)}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Issue Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
