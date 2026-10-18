import React from 'react';
import { UploadCloud, Plus, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { NavTab } from './Sidebar.tsx';

interface HeaderProps {
  currentTab: NavTab;
  onOpenUpload: () => void;
  onOpenCreateInvoice: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Financial Operations Command',
    subtitle: 'Unified real-time financial metrics, receivables, cash flow & GST summaries',
  },
  'ai-documents': {
    title: 'AI Document Ingestion & Verification',
    subtitle: 'Multimodal OCR, automated field extraction, duplicate checking & financial posting',
  },
  invoices: {
    title: 'Sales Invoicing & Receivables',
    subtitle: 'GST-compliant tax invoices, client billing, PDF generation & payment tracking',
  },
  'purchase-bills': {
    title: 'Purchase Bills & Vendor Payables',
    subtitle: 'Track incoming vendor invoices, itemized procurement & Input Tax Credit (ITC)',
  },
  suppliers: {
    title: 'Vendors & Suppliers Management',
    subtitle: 'Canonical supplier directory, GSTIN records, transaction histories & ledger reconciliation',
  },
  customers: {
    title: 'Customers Directory',
    subtitle: 'Client entities, registered GSTINs, intra/inter-state state codes & sales history',
  },
  expenses: {
    title: 'Expense Management',
    subtitle: 'Categorized operational spending, receipt attachments & reimbursable client costs',
  },
  gst: {
    title: 'GST & Tax Intelligence',
    subtitle: 'GSTR-1 sales register, Input Tax Credit (ITC) reconciliation & GSTR-3B summary',
  },
  reports: {
    title: 'Financial Reports & Analytics',
    subtitle: 'Profit & loss, customer revenue distribution, aging receivables & export schedules',
  },
  automations: {
    title: 'Automations & Review Rules',
    subtitle: 'High-value purchase bill approval rules, AI confidence thresholds & reminder triggers',
  },
  integrations: {
    title: 'Accounting Integrations & Sync',
    subtitle: 'Export to Tally Prime XML, Zoho Books CSV, Odoo ERP & Google Sheets',
  },
  settings: {
    title: 'Business Profile & Tax Settings',
    subtitle: 'Company legal details, 15-character GSTIN, bank details & invoice templates',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenUpload,
  onOpenCreateInvoice,
  onRefresh,
  isRefreshing,
}) => {
  const info = TAB_TITLES[currentTab] || { title: 'Ozio', subtitle: 'Financial Operations' };

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{info.title}</h2>
          <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
            FY 2026-27
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{info.subtitle}</p>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh Financial Data"
          className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
        </button>

        <button
          onClick={onOpenUpload}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition-all shadow-sm"
        >
          <UploadCloud className="w-4 h-4 text-indigo-600" />
          <span>Ingest Document</span>
        </button>

        <button
          onClick={onOpenCreateInvoice}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold transition-all shadow-sm shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Invoice</span>
        </button>
      </div>
    </header>
  );
};
