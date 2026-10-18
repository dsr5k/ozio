import React from 'react';
import { BarChart3, TrendingUp, TrendingDown, Users, Building, Download, Calendar } from 'lucide-react';
import { Invoice, PurchaseBill, Expense, Customer, Supplier } from '../types/index.ts';
import { formatINR } from '../lib/gst.ts';

interface ReportsViewProps {
  invoices: Invoice[];
  purchaseBills: PurchaseBill[];
  expenses: Expense[];
  customers: Customer[];
  suppliers: Supplier[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  invoices,
  purchaseBills,
  expenses,
  customers,
  suppliers,
}) => {
  const totalSales = invoices.reduce((sum, i) => sum + i.total_amount, 0);
  const totalPurchases = purchaseBills.reduce((sum, b) => sum + b.total_amount, 0);
  const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netEarnings = totalSales - (totalPurchases + totalExp);

  // Customer revenue breakdown
  const customerRevenue = customers.map((c) => {
    const custInvs = invoices.filter((i) => i.customer_id === c.id);
    const rev = custInvs.reduce((s, i) => s + i.total_amount, 0);
    return {
      name: c.company_name || c.name,
      revenue: rev,
      percentage: totalSales > 0 ? (rev / totalSales) * 100 : 0,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Supplier spending breakdown
  const supplierSpend = suppliers.map((s) => {
    const suppBills = purchaseBills.filter((b) => b.supplier_id === s.id);
    const spend = suppBills.reduce((sum, b) => sum + b.total_amount, 0);
    return {
      name: s.name,
      category: s.category,
      spend,
      percentage: totalPurchases > 0 ? (spend / totalPurchases) * 100 : 0,
    };
  }).sort((a, b) => b.spend - a.spend);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Financial Reports & Profitability Analytics</h3>
          <p className="text-xs text-slate-500 mt-0.5">Canonical transaction reporting derived strictly from database ledgers</p>
        </div>

        <a
          href="/api/integrations/export/csv"
          download="ozio-financial-report.csv"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span>Export Complete Financial Register</span>
        </a>
      </div>

      {/* P&L Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Billed Sales</span>
          <p className="text-xl font-bold text-slate-900 mt-2">{formatINR(totalSales)}</p>
          <span className="text-[11px] text-emerald-600 font-medium">100% Topline Revenue</span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Direct Procurement</span>
          <p className="text-xl font-bold text-slate-900 mt-2">{formatINR(totalPurchases)}</p>
          <span className="text-[11px] text-slate-500">
            {totalSales > 0 ? ((totalPurchases / totalSales) * 100).toFixed(1) : 0}% of sales
          </span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operational Expenses</span>
          <p className="text-xl font-bold text-slate-900 mt-2">{formatINR(totalExp)}</p>
          <span className="text-[11px] text-slate-500">
            {totalSales > 0 ? ((totalExp / totalSales) * 100).toFixed(1) : 0}% of sales
          </span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Operational Profit</span>
          <p className={`text-xl font-bold mt-2 ${netEarnings >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatINR(netEarnings)}
          </p>
          <span className="text-[11px] font-bold text-emerald-600">
            Margin: {totalSales > 0 ? ((netEarnings / totalSales) * 100).toFixed(1) : 0}%
          </span>
        </div>
      </div>

      {/* Customer & Supplier Distributions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Revenue Concentration */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900">Revenue by Customer Entity</h4>
            <span className="text-xs font-semibold text-slate-400">{customers.length} Clients</span>
          </div>

          <div className="mt-4 space-y-4">
            {customerRevenue.map((c, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-800">{c.name}</span>
                  <span className="font-bold text-slate-900">{formatINR(c.revenue)} ({c.percentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${c.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vendor Procurement Spending */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900">Spending by Vendor / Supplier</h4>
            <span className="text-xs font-semibold text-slate-400">{suppliers.length} Vendors</span>
          </div>

          <div className="mt-4 space-y-4">
            {supplierSpend.map((s, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">{s.name}</span>
                    <span className="text-[10px] text-slate-400 block">{s.category}</span>
                  </div>
                  <span className="font-bold text-slate-900">{formatINR(s.spend)} ({s.percentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-600 h-full rounded-full transition-all"
                    style={{ width: `${s.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
