import React, { useState } from 'react';
import { Calculator, Download, CheckCircle2, ShieldCheck, FileText, ArrowRight, Table, Layers } from 'lucide-react';
import { GSTSummary, Invoice, PurchaseBill, BusinessProfile } from '../types/index.ts';
import { formatINR } from '../lib/gst.ts';

interface GSTIntelligenceViewProps {
  gstSummary: GSTSummary | null;
  invoices: Invoice[];
  purchaseBills: PurchaseBill[];
  profile: BusinessProfile | null;
}

export const GSTIntelligenceView: React.FC<GSTIntelligenceViewProps> = ({
  gstSummary,
  invoices,
  purchaseBills,
  profile,
}) => {
  const [activeTab, setActiveTab] = useState<'gstr3b' | 'gstr1' | 'gstr2b' | 'hsn'>('gstr3b');

  if (!gstSummary) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { outputGst, inputTaxCredit, netTaxPayable, hsnSummary } = gstSummary;

  const handleExportGSTR1 = () => {
    const csvRows = [
      ['GSTIN/UIN of Recipient', 'Receiver Name', 'Invoice Number', 'Invoice Date', 'Invoice Value', 'Place of Supply', 'Reverse Charge', 'Invoice Type', 'Rate', 'Taxable Value', 'Cess Amount'],
      ...invoices.filter((i) => i.status !== 'draft').map((inv) => [
        inv.customer?.gstin || 'URP',
        inv.customer?.company_name || inv.customer?.name,
        inv.invoice_number,
        inv.issue_date,
        inv.total_amount,
        `${inv.customer?.state_code || '27'}-${inv.customer?.state || 'Maharashtra'}`,
        'N',
        'Regular B2B',
        '18%',
        inv.taxable_amount,
        '0.00',
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GSTR1_Sales_Register_FY2026_${profile?.gstin || 'GST'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-blue-500/30 text-blue-300 font-mono text-xs">
                GSTIN: {profile?.gstin || '27AABCA1234F1Z5'}
              </span>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-400/30">
                Active & Filing Ready
              </span>
            </div>
            <h3 className="text-xl font-bold mt-2 tracking-tight">GST & Tax Intelligence Command Center</h3>
            <p className="text-xs text-blue-200 mt-1">
              Automated reconciliation of Output GST liabilities from Sales Invoices and Input Tax Credit (ITC) from verified Purchase Bills.
            </p>
          </div>

          <button
            onClick={handleExportGSTR1}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold shadow-lg shadow-blue-500/30 transition-all shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export GSTR-1 CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold space-x-8">
        <button
          onClick={() => setActiveTab('gstr3b')}
          className={`pb-3 transition-colors relative ${
            activeTab === 'gstr3b' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          GSTR-3B Tax Liability Computation
        </button>
        <button
          onClick={() => setActiveTab('gstr1')}
          className={`pb-3 transition-colors relative ${
            activeTab === 'gstr1' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          GSTR-1 Outward Supplies (Sales)
        </button>
        <button
          onClick={() => setActiveTab('gstr2b')}
          className={`pb-3 transition-colors relative ${
            activeTab === 'gstr2b' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Input Tax Credit (ITC - Purchases)
        </button>
        <button
          onClick={() => setActiveTab('hsn')}
          className={`pb-3 transition-colors relative ${
            activeTab === 'hsn' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          HSN / SAC Code Summary
        </button>
      </div>

      {/* GSTR-3B Computation */}
      {activeTab === 'gstr3b' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                1. Total Output Tax Liability
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-2">{formatINR(outputGst.totalTax)}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>CGST (Intra):</span>
                  <span className="font-semibold text-slate-700">{formatINR(outputGst.cgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST (Intra):</span>
                  <span className="font-semibold text-slate-700">{formatINR(outputGst.sgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IGST (Inter):</span>
                  <span className="font-semibold text-slate-700">{formatINR(outputGst.igst)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                2. Eligible Input Tax Credit (ITC)
              </span>
              <p className="text-2xl font-bold text-emerald-600 mt-2">-{formatINR(inputTaxCredit.totalTax)}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>CGST Credit:</span>
                  <span className="font-semibold text-emerald-700">{formatINR(inputTaxCredit.cgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST Credit:</span>
                  <span className="font-semibold text-emerald-700">{formatINR(inputTaxCredit.sgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IGST Credit:</span>
                  <span className="font-semibold text-emerald-700">{formatINR(inputTaxCredit.igst)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border-2 border-blue-600 shadow-sm bg-blue-50/20">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                3. Net Tax Payable (Cash Ledger)
              </span>
              <p className="text-2xl font-bold text-blue-700 mt-2">{formatINR(netTaxPayable)}</p>
              <p className="text-xs text-slate-500 mt-2">
                Payable via GST Portal PMT-06 challan before the 20th of the following month.
              </p>
            </div>
          </div>

          {/* GSTR-3B Table Format */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">Table 3.1 & Table 4 Summary Breakdown</h4>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="px-6 py-3.5">Classification</th>
                  <th className="px-6 py-3.5">Taxable Value</th>
                  <th className="px-6 py-3.5">IGST</th>
                  <th className="px-6 py-3.5">CGST</th>
                  <th className="px-6 py-3.5">SGST</th>
                  <th className="px-6 py-3.5 text-right">Total Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-6 py-4 font-bold text-slate-800">
                    3.1(a) Outward Taxable Supplies (Sales)
                  </td>
                  <td className="px-6 py-4">{formatINR(outputGst.taxableValue)}</td>
                  <td className="px-6 py-4">{formatINR(outputGst.igst)}</td>
                  <td className="px-6 py-4">{formatINR(outputGst.cgst)}</td>
                  <td className="px-6 py-4">{formatINR(outputGst.sgst)}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">{formatINR(outputGst.totalTax)}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-bold text-emerald-800">
                    4(A)(5) All Other Eligible ITC (Purchases)
                  </td>
                  <td className="px-6 py-4">{formatINR(inputTaxCredit.taxableValue)}</td>
                  <td className="px-6 py-4 text-emerald-700">{formatINR(inputTaxCredit.igst)}</td>
                  <td className="px-6 py-4 text-emerald-700">{formatINR(inputTaxCredit.cgst)}</td>
                  <td className="px-6 py-4 text-emerald-700">{formatINR(inputTaxCredit.sgst)}</td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-700">-{formatINR(inputTaxCredit.totalTax)}</td>
                </tr>
                <tr className="bg-slate-50/70 font-bold">
                  <td className="px-6 py-4 text-blue-900">
                    5. Net GST Payable in Cash
                  </td>
                  <td className="px-6 py-4">-</td>
                  <td className="px-6 py-4">{formatINR(Math.max(0, outputGst.igst - inputTaxCredit.igst))}</td>
                  <td className="px-6 py-4">{formatINR(Math.max(0, outputGst.cgst - inputTaxCredit.cgst))}</td>
                  <td className="px-6 py-4">{formatINR(Math.max(0, outputGst.sgst - inputTaxCredit.sgst))}</td>
                  <td className="px-6 py-4 text-right text-sm text-blue-700">{formatINR(netTaxPayable)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GSTR-1 Sales Register */}
      {activeTab === 'gstr1' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">GSTR-1 Outward B2B Sales Register</h4>
            <span className="text-xs text-slate-500 font-mono">Count: {invoices.length} invoices</span>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-6 py-3.5">Invoice #</th>
                <th className="px-6 py-3.5">Recipient GSTIN</th>
                <th className="px-6 py-3.5">Customer Name</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Taxable Value</th>
                <th className="px-6 py-3.5">CGST / SGST</th>
                <th className="px-6 py-3.5">IGST</th>
                <th className="px-6 py-3.5 text-right">Invoice Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-3.5 font-bold font-mono text-blue-600">{inv.invoice_number}</td>
                  <td className="px-6 py-3.5 font-mono text-slate-700">{inv.customer?.gstin || 'URP'}</td>
                  <td className="px-6 py-3.5 font-medium text-slate-800">{inv.customer?.company_name || inv.customer?.name}</td>
                  <td className="px-6 py-3.5 text-slate-500">{inv.issue_date}</td>
                  <td className="px-6 py-3.5">{formatINR(inv.taxable_amount)}</td>
                  <td className="px-6 py-3.5">
                    {inv.is_interstate ? '-' : `${formatINR(inv.cgst_amount)} + ${formatINR(inv.sgst_amount)}`}
                  </td>
                  <td className="px-6 py-3.5">
                    {inv.is_interstate ? formatINR(inv.igst_amount) : '-'}
                  </td>
                  <td className="px-6 py-3.5 text-right font-bold text-slate-900">{formatINR(inv.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* GSTR-2B Input Tax Credit */}
      {activeTab === 'gstr2b' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">GSTR-2B Inward Procurement & ITC Register</h4>
            <span className="text-xs text-slate-500 font-mono">Count: {purchaseBills.length} purchase bills</span>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-6 py-3.5">Bill #</th>
                <th className="px-6 py-3.5">Supplier GSTIN</th>
                <th className="px-6 py-3.5">Supplier Name</th>
                <th className="px-6 py-3.5">Bill Date</th>
                <th className="px-6 py-3.5">Taxable Value</th>
                <th className="px-6 py-3.5">Eligible ITC</th>
                <th className="px-6 py-3.5 text-right">Total Bill Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchaseBills.map((pb) => (
                <tr key={pb.id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-3.5 font-bold font-mono text-slate-900">{pb.bill_number}</td>
                  <td className="px-6 py-3.5 font-mono text-slate-700">{pb.supplier?.gstin || 'URP'}</td>
                  <td className="px-6 py-3.5 font-medium text-slate-800">{pb.supplier?.company_name || pb.supplier?.name}</td>
                  <td className="px-6 py-3.5 text-slate-500">{pb.bill_date}</td>
                  <td className="px-6 py-3.5">{formatINR(pb.taxable_amount)}</td>
                  <td className="px-6 py-3.5 font-bold text-emerald-600">{formatINR(pb.total_tax)}</td>
                  <td className="px-6 py-3.5 text-right font-bold text-slate-900">{formatINR(pb.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* HSN Summary */}
      {activeTab === 'hsn' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900">HSN / SAC Invoiced Goods & Services Summary</h4>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-6 py-3.5">HSN/SAC Code</th>
                <th className="px-6 py-3.5">Description</th>
                <th className="px-6 py-3.5">Total Quantity</th>
                <th className="px-6 py-3.5">Taxable Value</th>
                <th className="px-6 py-3.5">GST Rate</th>
                <th className="px-6 py-3.5 text-right">Total Tax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hsnSummary.map((hsn, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="px-6 py-3.5 font-bold font-mono text-indigo-600">{hsn.hsn_sac}</td>
                  <td className="px-6 py-3.5 text-slate-800">{hsn.description}</td>
                  <td className="px-6 py-3.5 font-medium">{hsn.totalQty}</td>
                  <td className="px-6 py-3.5 font-semibold text-slate-900">{formatINR(hsn.totalTaxable)}</td>
                  <td className="px-6 py-3.5">{hsn.gstRate}%</td>
                  <td className="px-6 py-3.5 text-right font-bold text-blue-700">{formatINR(hsn.totalTax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
