import React, { useState } from 'react';
import {
  Plus,
  FileDown,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Trash2,
  X,
  CreditCard,
  Building,
} from 'lucide-react';
import { Invoice, Customer, InvoiceItem, BusinessProfile, InvoiceStatus } from '../types/index.ts';
import { formatINR, numberToWordsINR, isInterStateTransaction, calculateItemTax } from '../lib/gst.ts';
import { api } from '../lib/api.ts';
import { generateInvoicePDF } from '../lib/pdf/generate-invoice-pdf.ts';

interface InvoicesViewProps {
  invoices: Invoice[];
  customers: Customer[];
  profile: BusinessProfile | null;
  onRefresh: () => void;
  createModalOpen: boolean;
  setCreateModalOpen: (open: boolean) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  customers,
  profile,
  onRefresh,
  createModalOpen,
  setCreateModalOpen,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // New Invoice Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    `${profile?.invoice_prefix || 'APX-2026-'}${Math.floor(100 + Math.random() * 900)}`
  );
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [paymentTerms, setPaymentTerms] = useState<string>('Net 15 Days');
  const [notes, setNotes] = useState<string>(profile?.invoice_notes || 'Thank you for your business!');
  const [lineItems, setLineItems] = useState<
    Array<{
      description: string;
      hsn_sac: string;
      quantity: number;
      unit: string;
      unit_price: number;
      discount_percent: number;
      gst_rate: number;
    }>
  >([
    {
      description: 'Consulting & Financial Engineering Services',
      hsn_sac: '998314',
      quantity: 1,
      unit: 'NOS',
      unit_price: 50000,
      discount_percent: 0,
      gst_rate: 18,
    },
  ]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];
  const isInterState = selectedCustomer && profile
    ? isInterStateTransaction(profile.state_code, selectedCustomer.state_code)
    : false;

  // Real-time calculated totals for creation form
  let formTaxable = 0;
  let formCgst = 0;
  let formSgst = 0;
  let formIgst = 0;

  for (const item of lineItems) {
    const discountedPrice = item.unit_price * (1 - (item.discount_percent || 0) / 100);
    const taxableVal = item.quantity * discountedPrice;
    const tax = calculateItemTax(taxableVal, item.gst_rate, isInterState);
    formTaxable += tax.taxableValue;
    formCgst += tax.cgstAmount;
    formSgst += tax.sgstAmount;
    formIgst += tax.igstAmount;
  }

  const formTotalTax = formCgst + formSgst + formIgst;
  const formGrandTotal = formTaxable + formTotalTax;

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
    const custName = inv.customer?.company_name || inv.customer?.name || '';
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      custName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleDownloadPDF = (invoice: Invoice) => {
    if (!profile) return;
    try {
      const doc = generateInvoicePDF(invoice, profile);
      doc.save(`${invoice.invoice_number}_Tax_Invoice.pdf`);
    } catch (err: any) {
      console.error('PDF generation failed:', err);
      setActionError('Failed to generate PDF: ' + err.message);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!selectedCustomerId) {
      setActionError('Please select a customer.');
      return;
    }

    try {
      const itemsPayload = lineItems.map((item) => {
        const discountedPrice = item.unit_price * (1 - (item.discount_percent || 0) / 100);
        const taxableVal = item.quantity * discountedPrice;
        const tax = calculateItemTax(taxableVal, item.gst_rate, isInterState);
        return {
          description: item.description,
          hsn_sac: item.hsn_sac,
          quantity: Number(item.quantity),
          unit: item.unit,
          unit_price: Number(item.unit_price),
          discount_percent: Number(item.discount_percent || 0),
          taxable_value: tax.taxableValue,
          gst_rate: Number(item.gst_rate),
          cgst_rate: tax.cgstRate,
          cgst_amount: tax.cgstAmount,
          sgst_rate: tax.sgstRate,
          sgst_amount: tax.sgstAmount,
          igst_rate: tax.igstRate,
          igst_amount: tax.igstAmount,
          total_amount: tax.totalAmount,
        };
      });

      const newInv = await api.createInvoice(
        {
          customer_id: selectedCustomerId,
          invoice_number: invoiceNumber,
          issue_date: issueDate,
          due_date: dueDate,
          subtotal: formTaxable,
          taxable_amount: formTaxable,
          cgst_amount: formCgst,
          sgst_amount: formSgst,
          igst_amount: formIgst,
          total_tax: formTotalTax,
          discount_amount: 0,
          total_amount: formGrandTotal,
          amount_paid: 0,
          status: 'sent',
          payment_terms: paymentTerms,
          notes: notes,
          is_interstate: isInterState,
        },
        itemsPayload
      );

      setActionSuccess(`Sales Invoice ${newInv.invoice_number} created successfully!`);
      setCreateModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create invoice');
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentModalInvoice) return;
    setActionError(null);

    try {
      await api.recordInvoicePayment(
        paymentModalInvoice.id,
        paymentAmount,
        paymentDate,
        `Payment recorded via finance dashboard`
      );
      setActionSuccess(`Payment of ${formatINR(paymentAmount)} recorded for ${paymentModalInvoice.invoice_number}`);
      setPaymentModalInvoice(null);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to record payment');
    }
  };

  const handleDeleteInvoice = async (id: string, num: string) => {
    if (!confirm(`Are you sure you want to delete invoice ${num}?`)) return;
    try {
      await api.deleteInvoice(id);
      setActionSuccess(`Invoice ${num} deleted.`);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete invoice');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Action alerts */}
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
            <AlertCircle className="w-4 h-4 text-rose-600" />
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
              placeholder="Search by invoice number or client name..."
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
            <option value="all">All Invoices</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="sent">Sent</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/integrations/export/csv"
            download="ozio-sales-register.csv"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Invoice #</th>
                <th className="px-6 py-3.5">Customer (Client)</th>
                <th className="px-6 py-3.5">Dates</th>
                <th className="px-6 py-3.5">Tax Details</th>
                <th className="px-6 py-3.5">Total Amount</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No sales invoices found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-blue-600 font-mono">{inv.invoice_number}</p>
                      <span className="text-[10px] text-slate-400">
                        {inv.is_interstate ? 'Inter-state (IGST)' : 'Intra-state (CGST+SGST)'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">
                        {inv.customer?.company_name || inv.customer?.name || 'Customer'}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        GSTIN: {inv.customer?.gstin || 'Unregistered'}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-700">Issued: {inv.issue_date}</p>
                      <p className="text-[11px] text-slate-400">Due: {inv.due_date}</p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">Taxable: {formatINR(inv.taxable_amount)}</p>
                      <p className="text-[11px] text-slate-500">Tax: {formatINR(inv.total_tax)}</p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-sm">{formatINR(inv.total_amount)}</p>
                      {inv.amount_paid > 0 && inv.amount_paid < inv.total_amount && (
                        <p className="text-[10px] text-emerald-600 font-semibold">
                          Paid: {formatINR(inv.amount_paid)}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        inv.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'unpaid' || inv.status === 'sent'
                          ? 'bg-amber-100 text-amber-800'
                          : inv.status === 'overdue'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleDownloadPDF(inv)}
                          title="Download Tax Invoice PDF"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>

                        {inv.status !== 'paid' && (
                          <button
                            onClick={() => {
                              setPaymentModalInvoice(inv);
                              setPaymentAmount(inv.total_amount - (inv.amount_paid || 0));
                            }}
                            title="Record Payment"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => setViewInvoice(inv)}
                          title="View Invoice Details"
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteInvoice(inv.id, inv.invoice_number)}
                          title="Delete Invoice"
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
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

      {/* Record Payment Modal */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Record Payment for {paymentModalInvoice.invoice_number}</h3>
              <button onClick={() => setPaymentModalInvoice(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div>
                <span className="text-slate-500">Invoice Total:</span>
                <p className="text-sm font-bold text-slate-900">{formatINR(paymentModalInvoice.total_amount)}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Amount Received (₹)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setPaymentModalInvoice(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Preview Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Tax Invoice {viewInvoice.invoice_number}</h3>
                <p className="text-xs text-slate-500">Billed to {viewInvoice.customer?.company_name || viewInvoice.customer?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPDF(viewInvoice)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-sm"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
                <button onClick={() => setViewInvoice(null)} className="text-slate-400 hover:text-slate-700 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="py-6 space-y-6 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-400 block font-medium">Billed To (Customer):</span>
                  <p className="font-bold text-slate-900 text-sm">{viewInvoice.customer?.company_name || viewInvoice.customer?.name}</p>
                  <p className="text-slate-600 mt-1">{viewInvoice.customer?.billing_address}</p>
                  <p className="font-mono text-slate-500">GSTIN: {viewInvoice.customer?.gstin || 'Unregistered'}</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Invoice Summary:</span>
                  <p className="text-slate-700">Issue Date: <strong>{viewInvoice.issue_date}</strong></p>
                  <p className="text-slate-700">Due Date: <strong>{viewInvoice.due_date}</strong></p>
                  <p className="text-slate-700">Payment Terms: <strong>{viewInvoice.payment_terms}</strong></p>
                  <p className="text-slate-700">Supply Classification: <strong>{viewInvoice.is_interstate ? 'Inter-state (IGST)' : 'Intra-state (CGST+SGST)'}</strong></p>
                </div>
              </div>

              {/* Items */}
              <table className="w-full text-left border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5">HSN/SAC</th>
                    <th className="p-2.5">Qty</th>
                    <th className="p-2.5">Rate</th>
                    <th className="p-2.5">Taxable</th>
                    <th className="p-2.5">GST Rate</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(viewInvoice.items || []).map((it) => (
                    <tr key={it.id}>
                      <td className="p-2.5 font-medium text-slate-900">{it.description}</td>
                      <td className="p-2.5 font-mono text-slate-500">{it.hsn_sac || '-'}</td>
                      <td className="p-2.5">{it.quantity} {it.unit}</td>
                      <td className="p-2.5">{formatINR(it.unit_price)}</td>
                      <td className="p-2.5">{formatINR(it.taxable_value)}</td>
                      <td className="p-2.5">{it.gst_rate}%</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">{formatINR(it.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-slate-500 block font-medium">Amount in Words:</span>
                  <p className="italic text-slate-700">{numberToWordsINR(viewInvoice.total_amount)}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-slate-500">Taxable Value: <strong className="text-slate-800">{formatINR(viewInvoice.taxable_amount)}</strong></p>
                  <p className="text-slate-500">Total Tax: <strong className="text-slate-800">{formatINR(viewInvoice.total_tax)}</strong></p>
                  <p className="text-base font-bold text-blue-700">Grand Total: {formatINR(viewInvoice.total_amount)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create GST Tax Invoice</h3>
                <p className="text-xs text-slate-500">Compliant with Section 46 of Indian CGST/SGST Acts</p>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="py-6 space-y-6 text-xs">
              {/* Header Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Customer</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg border border-slate-200 font-medium"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name || c.name} ({c.state_code})
                      </option>
                    ))}
                  </select>
                  {selectedCustomer && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      GSTIN: {selectedCustomer.gstin || 'None'} | State: {selectedCustomer.state} (Code: {selectedCustomer.state_code})
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Place of Supply Classification</label>
                  <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 font-semibold text-slate-700">
                    {isInterState ? 'Inter-State (IGST 18%)' : 'Intra-State (CGST 9% + SGST 9%)'}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
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
                    required
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              {/* Dynamic Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs">Line Items</h4>
                  <button
                    type="button"
                    onClick={() =>
                      setLineItems([
                        ...lineItems,
                        {
                          description: 'Software Engineering Sprint Module',
                          hsn_sac: '998314',
                          quantity: 1,
                          unit: 'NOS',
                          unit_price: 25000,
                          discount_percent: 0,
                          gst_rate: 18,
                        },
                      ])
                    }
                    className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Line Item</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {lineItems.map((item, index) => (
                    <div key={index} className="p-3 bg-slate-50/50 flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-[200px]">
                        <input
                          type="text"
                          placeholder="Item Description"
                          value={item.description}
                          onChange={(e) => {
                            const updated = [...lineItems];
                            updated[index].description = e.target.value;
                            setLineItems(updated);
                          }}
                          required
                          className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>

                      <div className="w-24">
                        <input
                          type="text"
                          placeholder="HSN/SAC"
                          value={item.hsn_sac}
                          onChange={(e) => {
                            const updated = [...lineItems];
                            updated[index].hsn_sac = e.target.value;
                            setLineItems(updated);
                          }}
                          className="w-full p-2 rounded-lg border border-slate-200 bg-white font-mono"
                        />
                      </div>

                      <div className="w-16">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...lineItems];
                            updated[index].quantity = Number(e.target.value);
                            setLineItems(updated);
                          }}
                          required
                          className="w-full p-2 rounded-lg border border-slate-200 bg-white text-center"
                        />
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          placeholder="Rate (₹)"
                          value={item.unit_price}
                          onChange={(e) => {
                            const updated = [...lineItems];
                            updated[index].unit_price = Number(e.target.value);
                            setLineItems(updated);
                          }}
                          required
                          className="w-full p-2 rounded-lg border border-slate-200 bg-white text-right"
                        />
                      </div>

                      <div className="w-20">
                        <select
                          value={item.gst_rate}
                          onChange={(e) => {
                            const updated = [...lineItems];
                            updated[index].gst_rate = Number(e.target.value);
                            setLineItems(updated);
                          }}
                          className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        disabled={lineItems.length === 1}
                        onClick={() => {
                          const updated = lineItems.filter((_, i) => i !== index);
                          setLineItems(updated);
                        }}
                        className="text-rose-500 hover:text-rose-700 p-1.5 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Form Summary */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-slate-500 block font-medium">Grand Total in Words:</span>
                  <p className="italic text-slate-700">{numberToWordsINR(formGrandTotal)}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-slate-600">Taxable: <strong>{formatINR(formTaxable)}</strong></p>
                  <p className="text-slate-600">GST Tax: <strong>{formatINR(formTotalTax)}</strong></p>
                  <p className="text-base font-bold text-blue-700">Total: {formatINR(formGrandTotal)}</p>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20"
                >
                  Create & Issue Tax Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
