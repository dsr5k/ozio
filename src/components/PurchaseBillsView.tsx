import React, { useState } from 'react';
import {
  Plus,
  ShoppingBag,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  X,
  CreditCard,
  Building2,
  FileText,
} from 'lucide-react';
import { PurchaseBill, Supplier, PurchaseBillItem, BusinessProfile } from '../types/index.ts';
import { formatINR, isInterStateTransaction, calculateItemTax } from '../lib/gst.ts';
import { api } from '../lib/api.ts';

interface PurchaseBillsViewProps {
  bills: PurchaseBill[];
  suppliers: Supplier[];
  profile: BusinessProfile | null;
  onRefresh: () => void;
}

export const PurchaseBillsView: React.FC<PurchaseBillsViewProps> = ({
  bills,
  suppliers,
  profile,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [payModalBill, setPayModalBill] = useState<PurchaseBill | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Create Bill Form
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [billNumber, setBillNumber] = useState<string>(`BILL-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [billDate, setBillDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [category, setCategory] = useState<string>('Cloud Infrastructure & Hosting');
  const [notes, setNotes] = useState<string>('Vendor procurement bill');
  const [billItems, setBillItems] = useState<
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
      description: 'Monthly cloud hosting services & data bandwidth',
      hsn_sac: '998315',
      quantity: 1,
      unit: 'NOS',
      unit_price: 32000,
      gst_rate: 18,
    },
  ]);

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];
  const isInterState = selectedSupplier && profile
    ? isInterStateTransaction(profile.state_code, selectedSupplier.state_code)
    : false;

  let formTaxable = 0;
  let formCgst = 0;
  let formSgst = 0;
  let formIgst = 0;

  for (const item of billItems) {
    const taxableVal = item.quantity * item.unit_price;
    const tax = calculateItemTax(taxableVal, item.gst_rate, isInterState);
    formTaxable += tax.taxableValue;
    formCgst += tax.cgstAmount;
    formSgst += tax.sgstAmount;
    formIgst += tax.igstAmount;
  }

  const formTotalTax = formCgst + formSgst + formIgst;
  const formGrandTotal = formTaxable + formTotalTax;

  const filteredBills = bills.filter((b) => {
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    const suppName = b.supplier?.company_name || b.supplier?.name || '';
    const matchesSearch =
      b.bill_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      suppName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!selectedSupplierId) {
      setActionError('Please select a supplier.');
      return;
    }

    try {
      const itemsPayload = billItems.map((item) => {
        const taxableVal = item.quantity * item.unit_price;
        const tax = calculateItemTax(taxableVal, item.gst_rate, isInterState);
        return {
          description: item.description,
          hsn_sac: item.hsn_sac,
          quantity: Number(item.quantity),
          unit: item.unit,
          unit_price: Number(item.unit_price),
          taxable_value: tax.taxableValue,
          gst_rate: Number(item.gst_rate),
          cgst_amount: tax.cgstAmount,
          sgst_amount: tax.sgstAmount,
          igst_amount: tax.igstAmount,
          total_amount: tax.totalAmount,
        };
      });

      const newBill = await api.createPurchaseBill(
        {
          supplier_id: selectedSupplierId,
          bill_number: billNumber,
          bill_date: billDate,
          due_date: dueDate,
          taxable_amount: formTaxable,
          cgst_amount: formCgst,
          sgst_amount: formSgst,
          igst_amount: formIgst,
          total_tax: formTotalTax,
          total_amount: formGrandTotal,
          amount_paid: 0,
          status: 'unpaid',
          category: category,
          notes: notes,
        },
        itemsPayload
      );

      setActionSuccess(`Purchase Bill ${newBill.bill_number} recorded successfully!`);
      setCreateModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create purchase bill');
    }
  };

  const handleRecordPayment = async () => {
    if (!payModalBill) return;
    try {
      await api.recordPurchaseBillPayment(payModalBill.id, payAmount);
      setActionSuccess(`Payment of ${formatINR(payAmount)} recorded for Bill ${payModalBill.bill_number}`);
      setPayModalBill(null);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to record bill payment');
    }
  };

  const handleDeleteBill = async (id: string, num: string) => {
    if (!confirm(`Are you sure you want to delete purchase bill ${num}?`)) return;
    try {
      await api.deletePurchaseBill(id);
      setActionSuccess(`Bill ${num} deleted.`);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete bill');
    }
  };

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

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by bill number or vendor/supplier..."
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
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="approved">Approved</option>
          </select>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Record Purchase Bill</span>
        </button>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Bill #</th>
                <th className="px-6 py-3.5">Vendor (Supplier)</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Dates</th>
                <th className="px-6 py-3.5">Taxable / ITC</th>
                <th className="px-6 py-3.5">Total Amount</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No purchase bills found.
                  </td>
                </tr>
              ) : (
                filteredBills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 font-mono">{b.bill_number}</p>
                      <span className="text-[10px] text-slate-400">{b.items?.length || 1} item(s)</span>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{b.supplier?.company_name || b.supplier?.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        GSTIN: {b.supplier?.gstin || 'Unregistered'}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {b.category || 'General'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-700">Bill Date: {b.bill_date}</p>
                      <p className="text-[11px] text-slate-400">Due: {b.due_date || 'N/A'}</p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{formatINR(b.taxable_amount)}</p>
                      <p className="text-[11px] text-emerald-600 font-semibold">ITC Tax: {formatINR(b.total_tax)}</p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-sm">{formatINR(b.total_amount)}</p>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        b.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {b.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {b.status !== 'paid' && (
                          <button
                            onClick={() => {
                              setPayModalBill(b);
                              setPayAmount(b.total_amount - (b.amount_paid || 0));
                            }}
                            title="Record Payment to Supplier"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteBill(b.id, b.bill_number)}
                          title="Delete Bill"
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

      {/* Record Pay Modal */}
      {payModalBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
              Pay Supplier: {payModalBill.supplier?.name}
            </h3>
            <div className="py-4 space-y-4 text-xs">
              <div>
                <span className="text-slate-500">Bill Amount Due:</span>
                <p className="text-sm font-bold text-slate-900">{formatINR(payModalBill.total_amount)}</p>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount Paid (₹)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-slate-200 font-bold"
                />
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setPayModalBill(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Purchase Bill Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Record Vendor Purchase Bill</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBill} className="py-6 space-y-6 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Supplier (Vendor)</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Bill Number</label>
                  <input
                    type="text"
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                  >
                    <option value="Cloud Infrastructure & Hosting">Cloud Infrastructure & Hosting</option>
                    <option value="Hardware & Workstations">Hardware & Workstations</option>
                    <option value="Office Space & Utilities">Office Space & Utilities</option>
                    <option value="Professional & Legal Fees">Professional & Legal Fees</option>
                    <option value="General Supplies">General Supplies</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bill Date</label>
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tax Classification</label>
                  <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 font-semibold text-slate-700">
                    {isInterState ? 'Inter-state (IGST Credit)' : 'Intra-state (CGST+SGST Credit)'}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs mb-2">Item Details</h4>
                <div className="space-y-2">
                  {billItems.map((it, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex gap-3 items-center">
                      <input
                        type="text"
                        placeholder="Description"
                        value={it.description}
                        onChange={(e) => {
                          const updated = [...billItems];
                          updated[idx].description = e.target.value;
                          setBillItems(updated);
                        }}
                        className="flex-1 p-2 rounded-lg border border-slate-200 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="SAC/HSN"
                        value={it.hsn_sac}
                        onChange={(e) => {
                          const updated = [...billItems];
                          updated[idx].hsn_sac = e.target.value;
                          setBillItems(updated);
                        }}
                        className="w-24 p-2 rounded-lg border border-slate-200 bg-white font-mono"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) => {
                          const updated = [...billItems];
                          updated[idx].quantity = Number(e.target.value);
                          setBillItems(updated);
                        }}
                        className="w-16 p-2 rounded-lg border border-slate-200 bg-white text-center"
                      />
                      <input
                        type="number"
                        placeholder="Rate"
                        value={it.unit_price}
                        onChange={(e) => {
                          const updated = [...billItems];
                          updated[idx].unit_price = Number(e.target.value);
                          setBillItems(updated);
                        }}
                        className="w-24 p-2 rounded-lg border border-slate-200 bg-white text-right"
                      />
                      <select
                        value={it.gst_rate}
                        onChange={(e) => {
                          const updated = [...billItems];
                          updated[idx].gst_rate = Number(e.target.value);
                          setBillItems(updated);
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
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex justify-between text-xs">
                <div>
                  <span className="text-slate-500">Taxable Amount:</span>
                  <p className="font-bold text-slate-800">{formatINR(formTaxable)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Input Tax Credit (GST):</span>
                  <p className="font-bold text-emerald-700">{formatINR(formTotalTax)}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Gross Total Bill:</span>
                  <p className="text-base font-bold text-indigo-700">{formatINR(formGrandTotal)}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
                >
                  Save Purchase Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
