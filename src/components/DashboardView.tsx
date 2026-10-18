import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  Receipt,
  FileText,
  Building2,
  Calendar,
} from 'lucide-react';
import { DashboardStats, Invoice, PurchaseBill } from '../types/index.ts';
import { formatINR } from '../lib/gst.ts';
import { NavTab } from './Sidebar.tsx';

interface DashboardViewProps {
  stats: DashboardStats | null;
  invoices: Invoice[];
  purchaseBills: PurchaseBill[];
  onNavigate: (tab: NavTab) => void;
  onOpenUpload: () => void;
  onOpenCreateInvoice: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  invoices,
  purchaseBills,
  onNavigate,
  onOpenUpload,
  onOpenCreateInvoice,
}) => {
  if (!stats) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const netCashFlow = stats.totalRevenue - (stats.totalPurchases + stats.totalExpenses);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* AI Review Banner (if any pending reviews) */}
      {stats.pendingReviewsCount > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                {stats.pendingReviewsCount} Extracted Financial Document{stats.pendingReviewsCount > 1 ? 's' : ''} Require Human Review
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                AI extraction detected items with confidence scores below the 85% threshold or validation discrepancies.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('documents')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            Review Queue →
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sales Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{formatINR(stats.totalRevenue)}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{stats.paidInvoicesCount} settled invoices</span>
          </div>
        </div>

        {/* Total Purchases & Expenses */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Purchases & Expenses</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {formatINR(stats.totalPurchases + stats.totalExpenses)}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
            <span>Bills: {formatINR(stats.totalPurchases)} | Exp: {formatINR(stats.totalExpenses)}</span>
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding Receivables</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">{formatINR(stats.outstandingReceivables)}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-500 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{stats.unpaidInvoicesCount} unpaid ({stats.overdueInvoicesCount} overdue)</span>
          </div>
        </div>

        {/* Net GST Liability */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net GST Liability</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-700 mt-2">{formatINR(stats.netGstPayable)}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
            <span>Output: {formatINR(stats.outputGst)} | ITC: {formatINR(stats.inputGstCredit)}</span>
          </div>
        </div>
      </div>

      {/* Cash Flow & Ledger Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Flow Analysis */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Financial Performance & Cash Flow</h3>
              <p className="text-xs text-slate-500 mt-0.5">Calculated across sales invoices, purchase bills, and operational expenses</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              netCashFlow >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}>
              Net Margin: {netCashFlow >= 0 ? '+' : ''}{formatINR(netCashFlow)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs font-medium text-slate-500">Invoiced Revenue</span>
              <p className="text-lg font-bold text-slate-900 mt-1">{formatINR(stats.totalRevenue)}</p>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full w-full"></div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs font-medium text-slate-500">Vendor Payables</span>
              <p className="text-lg font-bold text-slate-900 mt-1">{formatINR(stats.totalPayables)}</p>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, (stats.totalPayables / (stats.totalRevenue || 1)) * 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs font-medium text-slate-500">Net Operational Margin</span>
              <p className={`text-lg font-bold mt-1 ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatINR(netCashFlow)}
              </p>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full ${netCashFlow >= 0 ? 'bg-emerald-600' : 'bg-rose-600'}`}
                  style={{ width: `${Math.min(100, Math.max(10, (netCashFlow / (stats.totalRevenue || 1)) * 100))}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Quick GST Tax Position Bar */}
          <div className="mt-6 p-4 rounded-xl bg-blue-50/60 border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">GST Position & Input Tax Credit</span>
              <button
                onClick={() => onNavigate('gst')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                View Full GSTR Details →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500">Output GST (Collected):</span>
                <p className="font-semibold text-slate-800">{formatINR(stats.outputGst)}</p>
              </div>
              <div>
                <span className="text-slate-500">Input Tax Credit (ITC):</span>
                <p className="font-semibold text-emerald-700">-{formatINR(stats.inputGstCredit)}</p>
              </div>
              <div>
                <span className="text-slate-500">Net Tax Due to Govt:</span>
                <p className="font-bold text-blue-900">{formatINR(stats.netGstPayable)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions & AI Processing Status */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Quick Operations</h3>
            <div className="space-y-2.5">
              <button
                onClick={onOpenUpload}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-indigo-50 border border-indigo-100 hover:bg-indigo-100/70 text-indigo-900 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Ingest Document with AI</p>
                    <p className="text-[11px] text-indigo-600">Bills, POs, Receipts, Invoices</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-indigo-500" />
              </button>

              <button
                onClick={onOpenCreateInvoice}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100/70 text-blue-900 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Create GST Sales Invoice</p>
                    <p className="text-[11px] text-blue-600">With PDF generation & HSN codes</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-blue-500" />
              </button>

              <button
                onClick={() => onNavigate('expenses')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-900 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center font-bold">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Log Operational Expense</p>
                    <p className="text-[11px] text-slate-500">Attach receipts & categorize</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>AI Ingestion Engine</span>
            </div>
            <p className="text-xs text-slate-300 mt-2">
              Gemini 3.8 Flash automatically extracts counterparties, HSN/SAC codes, tax rates, and detects duplicate bills before posting to ledger.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Target Accuracy</span>
              <span className="font-semibold text-emerald-400">99.4% Validated</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Financial Activity</h3>
            <p className="text-xs text-slate-500 mt-0.5">Real-time audit log of invoices, bills, payments, and AI document ingestion</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {stats.recentActivity.map((act) => (
            <div key={act.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
              <div className="flex items-center gap-3.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  act.type === 'invoice_created'
                    ? 'bg-blue-50 text-blue-600'
                    : act.type === 'payment_received'
                    ? 'bg-emerald-50 text-emerald-600'
                    : act.type === 'ai_review_required'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-purple-50 text-purple-600'
                }`}>
                  {act.type === 'payment_received' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : act.type === 'ai_review_required' ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{act.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{act.description}</p>
                </div>
              </div>

              <div className="text-right">
                {act.amount !== undefined && (
                  <p className="text-xs font-bold text-slate-900">{formatINR(act.amount)}</p>
                )}
                <span className="text-[10px] text-slate-400">
                  {new Date(act.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
