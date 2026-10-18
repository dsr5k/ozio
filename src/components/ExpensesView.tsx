import React, { useState } from 'react';
import { Plus, Receipt, Search, CheckCircle2, AlertTriangle, Trash2, X, CreditCard, Tag } from 'lucide-react';
import { Expense, Customer } from '../types/index.ts';
import { api } from '../lib/api.ts';
import { formatINR } from '../lib/gst.ts';

interface ExpensesViewProps {
  expenses: Expense[];
  customers: Customer[];
  onRefresh: () => void;
}

const CATEGORIES = [
  'Software & Cloud',
  'Travel & Lodging',
  'Office Supplies',
  'Marketing & Advertising',
  'Utilities & Broadband',
  'Meals & Entertainment',
  'Professional & Legal Fees',
  'Hardware & Equipment',
];

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  customers,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form State
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState<number>(5000);
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Corporate Card');
  const [description, setDescription] = useState('');
  const [isBillable, setIsBillable] = useState(false);
  const [customerId, setCustomerId] = useState<string>('');
  const [gstAmount, setGstAmount] = useState<number>(0);

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (amount <= 0) {
      setActionError('Expense amount must be greater than zero.');
      return;
    }

    try {
      await api.createExpense({
        category,
        amount: Number(amount),
        expense_date: expenseDate,
        payment_method: paymentMethod,
        description,
        is_billable: isBillable,
        customer_id: isBillable && customerId ? customerId : null,
        status: 'recorded',
        gst_amount: Number(gstAmount),
        receipt_url: null,
      });

      setActionSuccess(`Expense of ${formatINR(amount)} logged successfully.`);
      setModalOpen(false);
      setDescription('');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to record expense');
    }
  };

  const handleDelete = async (id: string, desc: string) => {
    if (!confirm(`Delete expense "${desc}"?`)) return;
    try {
      await api.deleteExpense(id);
      setActionSuccess('Expense deleted.');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete expense');
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesCat = selectedCategory === 'all' || e.category === selectedCategory;
    const matchesQuery =
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

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

      {/* Overview & Quick Category Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Recorded Operational Expenses</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatINR(totalExpense)}</p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Log New Expense</span>
        </button>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by description or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs py-2 px-3 bg-white rounded-lg border border-slate-200 text-slate-700 font-medium"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Category & Description</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Payment Method</th>
                <th className="px-6 py-3.5">Billable Client</th>
                <th className="px-6 py-3.5">GST Included</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{exp.description}</p>
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {exp.category}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-slate-600 font-medium">
                    {exp.expense_date}
                  </td>

                  <td className="px-6 py-4 text-slate-700 font-medium">
                    {exp.payment_method}
                  </td>

                  <td className="px-6 py-4">
                    {exp.is_billable && exp.customer ? (
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {exp.customer.name}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Non-billable</span>
                    )}
                  </td>

                  <td className="px-6 py-4 font-mono text-slate-600">
                    {exp.gst_amount > 0 ? formatINR(exp.gst_amount) : '₹0.00'}
                  </td>

                  <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                    {formatINR(exp.amount)}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(exp.id, exp.description)}
                      title="Delete Expense"
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Log Operational Expense</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="py-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expense Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Cloud bandwidth & GitHub licenses"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setAmount(val);
                      // Auto estimate 18% GST portion
                      setGstAmount(Math.round((val - val / 1.18) * 100) / 100);
                    }}
                    className="w-full p-2.5 rounded-lg border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                  >
                    <option value="Corporate Card">Corporate Card</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="UPI">Corporate UPI</option>
                    <option value="Petty Cash">Petty Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">GST Tax Component (₹)</label>
                <input
                  type="number"
                  value={gstAmount}
                  onChange={(e) => setGstAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isBillable"
                    checked={isBillable}
                    onChange={(e) => setIsBillable(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <label htmlFor="isBillable" className="font-semibold text-slate-800">
                    Billable to Client / Customer
                  </label>
                </div>

                {isBillable && (
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 text-[11px]">Select Client</label>
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="">Select customer...</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.company_name})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
