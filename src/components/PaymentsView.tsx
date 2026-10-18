import React, { useState } from 'react';
import {
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  Download,
  Filter,
  X,
  FileCheck,
} from 'lucide-react';
import { PaymentRecord, Customer, Supplier, Invoice, PurchaseBill } from '../types/index.ts';
import { formatINR } from '../lib/gst.ts';
import { api } from '../lib/api.ts';

interface PaymentsViewProps {
  payments: PaymentRecord[];
  customers: Customer[];
  suppliers: Supplier[];
  invoices: Invoice[];
  purchaseBills: PurchaseBill[];
  onRefresh: () => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  payments,
  customers,
  suppliers,
  invoices,
  purchaseBills,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form State
  const [type, setType] = useState<'inflow' | 'outflow'>('inflow');
  const [counterpartyId, setCounterpartyId] = useState<string>('');
  const [amount, setAmount] = useState<number>(10000);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'NEFT/RTGS' | 'UPI' | 'Corporate Card' | 'Cheque' | 'Net Banking'>('NEFT/RTGS');
  const [referenceNumber, setReferenceNumber] = useState<string>(`UTR-2026-${Math.floor(100000 + Math.random() * 900000)}`);
  const [notes, setNotes] = useState<string>('Bank transaction payment');

  const totalInflows = payments
    .filter((p) => p.type === 'inflow')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalOutflows = payments
    .filter((p) => p.type === 'outflow')
    .reduce((sum, p) => sum + p.amount, 0);

  const netLiquidity = totalInflows - totalOutflows;

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    let partyName = 'Counterparty';
    if (type === 'inflow') {
      const cust = customers.find((c) => c.id === counterpartyId);
      partyName = cust?.company_name || cust?.name || 'Customer';
    } else {
      const supp = suppliers.find((s) => s.id === counterpartyId);
      partyName = supp?.name || 'Supplier';
    }

    try {
      await api.createPayment({
        payment_date: paymentDate,
        type,
        amount: Number(amount),
        counterparty_name: partyName,
        counterparty_type: type === 'inflow' ? 'customer' : 'supplier',
        counterparty_id: counterpartyId,
        reference_number: referenceNumber,
        payment_method: paymentMethod,
        status: 'reconciled',
        notes,
      });

      setActionSuccess(`Payment of ${formatINR(amount)} recorded and reconciled!`);
      setCreateModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to record payment');
    }
  };

  const handleReconcile = async (id: string) => {
    try {
      await api.reconcilePayment(id);
      setActionSuccess('Payment reconciled against bank statement.');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to reconcile payment');
    }
  };

  const handleDelete = async (id: string, ref: string) => {
    if (!confirm(`Delete payment record ${ref}?`)) return;
    try {
      await api.deletePayment(id);
      setActionSuccess(`Payment ${ref} deleted.`);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete payment');
    }
  };

  const filteredPayments = payments.filter((p) => {
    const matchesType = filterType === 'all' || p.type === filterType;
    const matchesQuery =
      p.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.counterparty_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesQuery;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto text-xs">
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center justify-between font-medium">
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
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Recorded Inflows</span>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{formatINR(totalInflows)}</p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 mt-1 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Customer remittances</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Recorded Outflows</span>
          <p className="text-2xl font-bold text-slate-900 mt-2">{formatINR(totalOutflows)}</p>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1 font-medium">
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Vendor disbursements</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Cash Movement</span>
          <p className={`text-2xl font-bold mt-2 ${netLiquidity >= 0 ? 'text-blue-700' : 'text-rose-600'}`}>
            {formatINR(netLiquidity)}
          </p>
          <span className="text-[11px] text-slate-400">Total settled liquidity</span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reconciled Status</span>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {payments.filter((p) => p.status === 'reconciled').length} / {payments.length}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">Verified against bank UTRs</span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by UTR, reference, or counterparty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs py-2 px-3 bg-white rounded-lg border border-slate-200 text-slate-700 font-medium"
          >
            <option value="all">All Movements</option>
            <option value="inflow">Inflows (Receipts)</option>
            <option value="outflow">Outflows (Disbursements)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/integrations/export/ledger"
            download="ozio-payments-ledger.csv"
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-semibold shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export Ledger CSV</span>
          </a>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Payments Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Date & Type</th>
                <th className="px-6 py-3.5">Counterparty</th>
                <th className="px-6 py-3.5">Reference / UTR</th>
                <th className="px-6 py-3.5">Payment Method</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Reconciliation</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold ${
                        p.type === 'inflow' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {p.type === 'inflow' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{p.payment_date}</p>
                        <span className={`text-[10px] font-bold uppercase ${
                          p.type === 'inflow' ? 'text-emerald-700' : 'text-slate-500'
                        }`}>
                          {p.type === 'inflow' ? 'Inflow (Receipt)' : 'Outflow (Disbursed)'}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{p.counterparty_name}</p>
                    <span className="text-[10px] text-slate-400 capitalize">{p.counterparty_type}</span>
                  </td>

                  <td className="px-6 py-4 font-mono text-slate-700 font-semibold">
                    {p.reference_number}
                  </td>

                  <td className="px-6 py-4 text-slate-700 font-medium">
                    {p.payment_method}
                  </td>

                  <td className="px-6 py-4">
                    <p className={`font-bold text-sm ${p.type === 'inflow' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {p.type === 'inflow' ? '+' : '-'}{formatINR(p.amount)}
                    </p>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      p.status === 'reconciled'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {p.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {p.status !== 'reconciled' && (
                        <button
                          onClick={() => handleReconcile(p.id)}
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-semibold"
                        >
                          Reconcile
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(p.id, p.reference_number)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Record Commercial Payment</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="py-4 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Movement Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('inflow')}
                    className={`py-2 rounded-lg font-bold transition-all ${
                      type === 'inflow'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Inflow (Receipt)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('outflow')}
                    className={`py-2 rounded-lg font-bold transition-all ${
                      type === 'outflow'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Outflow (Disbursement)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select {type === 'inflow' ? 'Customer' : 'Supplier'}
                </label>
                <select
                  required
                  value={counterpartyId}
                  onChange={(e) => setCounterpartyId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 font-medium"
                >
                  <option value="">Select counterparty...</option>
                  {type === 'inflow'
                    ? customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.company_name || c.name}
                        </option>
                      ))
                    : suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-200 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Channel</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                  >
                    <option value="NEFT/RTGS">NEFT/RTGS</option>
                    <option value="UPI">Corporate UPI</option>
                    <option value="Corporate Card">Corporate Card</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">UTR / Ref Number</label>
                  <input
                    type="text"
                    required
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Narration</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
                >
                  Confirm & Post Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
