import React from 'react';
import { Share2, Download, CheckCircle2, ExternalLink, FileCode, Sheet, Layers } from 'lucide-react';

export const IntegrationsView: React.FC = () => {
  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto text-xs">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">ERP & Accounting Integrations</h3>
        <p className="text-slate-500 mt-1">
          Synchronize sales registers, vendor bills, and GST data with industry accounting packages.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tally Prime XML Export */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                <FileCode className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                Functional Export
              </span>
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Tally Prime XML Export</h4>
            <p className="text-slate-500 mt-1">
              Exports sales vouchers formatted strictly according to Tally XML schema for direct import into Tally Prime or ERP 9.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <a
              href="/api/integrations/export/tally-xml"
              download="ozio-tally-export.xml"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition-all shadow-sm shadow-orange-600/20"
            >
              <Download className="w-4 h-4" />
              <span>Download Tally XML File</span>
            </a>
          </div>
        </div>

        {/* Zoho Books / Odoo CSV */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                Functional Export
              </span>
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Zoho Books & Odoo CSV</h4>
            <p className="text-slate-500 mt-1">
              Standardized CSV format containing B2B sales invoices, tax components, customer GSTINs, and payment states.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <a
              href="/api/integrations/export/csv"
              download="ozio-sales-register.csv"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-sm shadow-blue-600/20"
            >
              <Download className="w-4 h-4" />
              <span>Download Standard CSV</span>
            </a>
          </div>
        </div>

        {/* Google Sheets Sync */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between opacity-80">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Sheet className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                API Unconnected
              </span>
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Google Sheets Live Sync</h4>
            <p className="text-slate-500 mt-1">
              Stream live sales invoices and purchase bills directly to a Google Sheets workbook via Google Workspace OAuth.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              disabled
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-400 font-semibold cursor-not-allowed text-center"
            >
              OAuth Credentials Pending
            </button>
          </div>
        </div>

        {/* Webhooks & ERP Rest API */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between opacity-80">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Share2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                Webhook Ready
              </span>
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Inbound & Outbound Webhooks</h4>
            <p className="text-slate-500 mt-1">
              Trigger outbound HTTP POST notifications to custom ERP endpoints whenever an invoice is paid or bill is approved.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              disabled
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-400 font-semibold cursor-not-allowed text-center"
            >
              Enterprise Plan Required
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
