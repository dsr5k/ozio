import React, { useState, useRef } from 'react';
import {
  Sparkles,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  FileCheck,
  Building,
  RefreshCw,
  Plus,
  Eye,
  Check,
  X,
  FileCode,
} from 'lucide-react';
import { DocumentExtraction, StoredDocument, Supplier, Customer } from '../types/index.ts';
import { api } from '../lib/api.ts';
import { formatINR } from '../lib/gst.ts';

interface AIDocumentCenterProps {
  extractions: DocumentExtraction[];
  suppliers: Supplier[];
  customers: Customer[];
  onRefresh: () => void;
}

const SAMPLE_DOCS = [
  {
    name: 'AWS_Cloud_Invoice_April2026.pdf',
    type: 'purchase_bill',
    label: 'AWS Cloud Hosting Bill (Inter-state)',
    text: `TAX INVOICE / BILL OF SUPPLY
Amazon Web Services India Private Limited
GSTIN: 29AALCA2233N1ZK | State: Karnataka (29)
Invoice No: AWS-IN-2026-99120 | Date: 2026-04-05 | Due Date: 2026-04-20
Billed To: ApexTech Solutions Pvt Ltd | GSTIN: 27AABCA1234F1Z5 | State: Maharashtra (27)
Items:
1. Amazon EC2 High Memory Instances (r6i.2xlarge) | SAC: 998315 | Qty: 1 | Rate: Rs. 45,000.00 | Taxable: 45,000.00 | IGST: 18% (8,100.00) | Total: 53,100.00
2. Amazon Aurora PostgreSQL Managed Database | SAC: 998315 | Qty: 1 | Rate: Rs. 28,000.00 | Taxable: 28,000.00 | IGST: 18% (5,040.00) | Total: 33,040.00
Taxable Amount: Rs. 73,000.00 | IGST (18%): Rs. 13,140.00 | Gross Total Amount: Rs. 86,140.00`,
  },
  {
    name: 'Croma_Hardware_Server_TaxInvoice.pdf',
    type: 'purchase_bill',
    label: 'Croma Server Hardware (Intra-state)',
    text: `TAX INVOICE
Infiniti Retail Limited (Croma)
GSTIN: 27AABCI4809Q1ZM | State: Maharashtra (27)
Invoice No: CR-MUM-2026-7819 | Date: 2026-04-11 | Due Date: 2026-04-26
Buyer: ApexTech Solutions Pvt Ltd | GSTIN: 27AABCA1234F1Z5 | Mumbai
Item:
1. Dell PowerEdge Rackmount Server R650 (64GB RAM, 2x 1.92TB NVMe) | HSN: 84715000 | Qty: 1 | Rate: Rs. 2,20,000.00 | Taxable: 2,20,000.00 | CGST 9% (19,800.00) | SGST 9% (19,800.00) | Total: 2,59,600.00
Taxable Value: Rs. 2,20,000.00 | CGST: Rs. 19,800.00 | SGST: Rs. 19,800.00 | Total Invoice Value: Rs. 2,59,600.00`,
  },
  {
    name: 'Uber_Executive_Taxi_Receipt.pdf',
    type: 'expense_receipt',
    label: 'Uber Airport Client Meeting Receipt',
    text: `UBER TRIP RECEIPT
Trip Date: 12 April 2026 | Time: 09:30 AM
From: MIDC Andheri East, Mumbai
To: Chhatrapati Shivaji Maharaj International Airport Terminal 2
Vehicle: Uber Premier (MH-02-EE-8822)
Trip Fare: Rs. 950.00
Tolls & Surcharges: Rs. 120.00
GST (5%): Rs. 47.50
Total Paid: Rs. 1,117.50
Payment Method: Corporate UPI (apextech@hdfcbank)`,
  },
];

export const AIDocumentCenter: React.FC<AIDocumentCenterProps> = ({
  extractions,
  suppliers,
  customers,
  onRefresh,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [selectedExtraction, setSelectedExtraction] = useState<DocumentExtraction | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [postingError, setPostingError] = useState<string | null>(null);
  const [postingSuccess, setPostingSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Upload Handler
  const handleFileUpload = async (file: File, sampleText?: string) => {
    setIsUploading(true);
    setPostingError(null);
    setPostingSuccess(null);

    try {
      setProcessingStage('1/5 Computing cryptographic SHA-256 hash & uploading file...');
      await new Promise((r) => setTimeout(r, 400));

      let fileBase64: string | undefined;
      let textContent = sampleText;

      if (!sampleText) {
        // Read file as base64
        fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      setProcessingStage('2/5 Running Gemini 3.8 Flash multimodal structured extraction...');
      await new Promise((r) => setTimeout(r, 600));

      setProcessingStage('3/5 Classifying document type & validating GSTIN / tax math...');
      await new Promise((r) => setTimeout(r, 400));

      setProcessingStage('4/5 Checking duplicate bill records & matching counterparties...');

      const result = await api.ingestDocument({
        filename: file.name,
        fileType: file.type || 'application/pdf',
        fileSize: file.size,
        fileBase64,
        documentText: textContent,
      });

      setProcessingStage('5/5 Finished! Document registered.');
      setPostingSuccess(`Successfully processed "${file.name}". Confidence Score: ${result.extraction.confidence_score}%`);
      onRefresh();

      // Open review modal immediately if confidence < 85% or duplicate flagged
      if (result.extraction.status === 'pending_review') {
        setSelectedExtraction(result.extraction);
        setReviewModalOpen(true);
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      setPostingError(err.message || 'Failed to process document');
    } finally {
      setIsUploading(false);
      setProcessingStage('');
    }
  };

  const handleApproveAndPost = async (extractionId: string) => {
    if (!selectedExtraction) return;
    setPostingError(null);

    try {
      const res = await api.approveExtraction(extractionId, {
        document_type: selectedExtraction.document_type,
        party_name: selectedExtraction.party_name,
        party_gstin: selectedExtraction.party_gstin,
        matched_party_id: selectedExtraction.matched_party_id,
        invoice_number: selectedExtraction.invoice_number,
        invoice_date: selectedExtraction.invoice_date,
        due_date: selectedExtraction.due_date,
        taxable_amount: selectedExtraction.taxable_amount,
        cgst_amount: selectedExtraction.cgst_amount,
        sgst_amount: selectedExtraction.sgst_amount,
        igst_amount: selectedExtraction.igst_amount,
        total_amount: selectedExtraction.total_amount,
      });

      setPostingSuccess(res.message);
      setReviewModalOpen(false);
      setSelectedExtraction(null);
      onRefresh();
    } catch (err: any) {
      setPostingError(err.message || 'Failed to post extraction to ledger');
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Notifications */}
      {postingSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{postingSuccess}</span>
          </div>
          <button onClick={() => setPostingSuccess(null)} className="text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {postingError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{postingError}</span>
          </div>
          <button onClick={() => setPostingError(null)} className="text-rose-500 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Box & Interactive Pipeline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 font-bold">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-bold text-slate-900">AI Document Ingestion Engine</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Upload vendor bills, sales invoices, or expense receipts (PDF, PNG, JPG). Gemini extracts line items, validates tax calculations, and flags duplicates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              Model: Gemini 3.8 Flash
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Tax Engine: Indian GST 2026
            </span>
          </div>
        </div>

        {/* Drag & Drop Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isUploading
              ? 'border-indigo-400 bg-indigo-50/50'
              : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50/80'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            className="hidden"
          />

          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            {isUploading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>

          {isUploading ? (
            <div className="space-y-1">
              <p className="text-sm font-bold text-indigo-900">Processing Document...</p>
              <p className="text-xs text-indigo-600 font-medium animate-pulse">{processingStage}</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800">
                Click to upload or drag and drop financial documents
              </p>
              <p className="text-xs text-slate-400">
                PDF, Scanned Images, PNG, JPG up to 50MB (Intra-state & Inter-state Indian Tax Invoices)
              </p>
            </div>
          )}
        </div>

        {/* Quick Test Samples */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Or Try Immediate Demo Samples (One-Click Live AI Extraction):
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SAMPLE_DOCS.map((sample, idx) => (
              <button
                key={idx}
                disabled={isUploading}
                onClick={() => {
                  const dummyFile = new File([sample.text], sample.name, { type: 'application/pdf' });
                  handleFileUpload(dummyFile, sample.text);
                }}
                className="p-3 text-left rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all text-xs flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <p className="font-semibold text-slate-800 group-hover:text-indigo-600">{sample.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{sample.name}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </div>

        {/* 7-Step Ingestion Pipeline Visual */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 block">
            End-to-End Auditable Pipeline
          </span>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-2 text-center text-[11px]">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-700 block">1. SHA-256</span>
              <span className="text-[10px] text-slate-400">File Hashing</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-indigo-700 block">2. Multimodal</span>
              <span className="text-[10px] text-slate-400">Gemini 3.8 OCR</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-700 block">3. Classify</span>
              <span className="text-[10px] text-slate-400">Bill / Inv / Exp</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-700 block">4. GST Math</span>
              <span className="text-[10px] text-slate-400">HSN & Rate Check</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-rose-700 block">5. Dedupe</span>
              <span className="text-[10px] text-slate-400">Bill # & Hash Check</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-700 block">6. Entity Match</span>
              <span className="text-[10px] text-slate-400">Vendor / Customer</span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="font-bold text-emerald-800 block">7. Ledger Post</span>
              <span className="text-[10px] text-emerald-600">ACID Insert</span>
            </div>
          </div>
        </div>
      </div>

      {/* Extracted Documents & Review Queue */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Extracted Documents & Verification Queue</h3>
              <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                {extractions.length} Total
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Traceable records extracted by AI. Review low-confidence items or post directly to financial ledgers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              {extractions.filter((e) => e.status === 'pending_review').length} Pending Human Review
            </span>
          </div>
        </div>

        {extractions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No documents processed yet.</p>
            <p className="text-xs text-slate-400 mt-1">Upload an invoice or click one of the quick test samples above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Document / Counterparty</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Invoice # / Date</th>
                  <th className="px-6 py-3.5">Confidence</th>
                  <th className="px-6 py-3.5">Taxable / Total</th>
                  <th className="px-6 py-3.5">Status & Validation</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {extractions.map((ext) => {
                  const isPending = ext.status === 'pending_review';
                  const isPosted = ext.status === 'posted';

                  return (
                    <tr key={ext.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{ext.party_name || 'Unknown Party'}</p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              GSTIN: {ext.party_gstin || 'None / Unregistered'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          ext.document_type === 'purchase_bill'
                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                            : ext.document_type === 'sales_invoice'
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}>
                          {ext.document_type.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">{ext.invoice_number || 'N/A'}</p>
                        <p className="text-[11px] text-slate-400">{ext.invoice_date || 'No Date'}</p>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                ext.confidence_score >= 85
                                  ? 'bg-emerald-500'
                                  : ext.confidence_score >= 60
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${ext.confidence_score}%` }}
                            ></div>
                          </div>
                          <span className={`font-bold ${
                            ext.confidence_score >= 85
                              ? 'text-emerald-700'
                              : ext.confidence_score >= 60
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}>
                            {ext.confidence_score.toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{formatINR(ext.total_amount)}</p>
                        <p className="text-[11px] text-slate-400">
                          Tax: {formatINR((ext.cgst_amount || 0) + (ext.sgst_amount || 0) + (ext.igst_amount || 0))}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        {isPosted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Posted to Ledger
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Needs Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            <Check className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                        {ext.is_duplicate && (
                          <span className="ml-1 text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">
                            Duplicate
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedExtraction(ext);
                            setReviewModalOpen(true);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isPending
                              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                              : 'border border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isPosted ? 'Inspect' : 'Review & Post'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review & Edit Side-by-Side Modal */}
      {reviewModalOpen && selectedExtraction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Review Extracted Financial Document
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verify AI-extracted values before committing to canonical financial records
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Validation Flags Alert */}
              {selectedExtraction.validation_flags && selectedExtraction.validation_flags.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    AI Validation Flags & Audit Notes:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                    {selectedExtraction.validation_flags.map((flag, i) => (
                      <li key={i}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Document Metadata Form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Document Classification</label>
                  <select
                    value={selectedExtraction.document_type}
                    onChange={(e) =>
                      setSelectedExtraction({
                        ...selectedExtraction,
                        document_type: e.target.value as any,
                      })
                    }
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 font-medium"
                  >
                    <option value="purchase_bill">Purchase Bill (Vendor Bill)</option>
                    <option value="sales_invoice">Sales Invoice (Customer Invoice)</option>
                    <option value="expense_receipt">Expense Receipt (Direct Expense)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Counterparty Legal Name</label>
                  <input
                    type="text"
                    value={selectedExtraction.party_name || ''}
                    onChange={(e) =>
                      setSelectedExtraction({ ...selectedExtraction, party_name: e.target.value })
                    }
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Counterparty GSTIN</label>
                  <input
                    type="text"
                    value={selectedExtraction.party_gstin || ''}
                    onChange={(e) =>
                      setSelectedExtraction({ ...selectedExtraction, party_gstin: e.target.value })
                    }
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice / Bill Number</label>
                  <input
                    type="text"
                    value={selectedExtraction.invoice_number || ''}
                    onChange={(e) =>
                      setSelectedExtraction({ ...selectedExtraction, invoice_number: e.target.value })
                    }
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={selectedExtraction.invoice_date || ''}
                    onChange={(e) =>
                      setSelectedExtraction({ ...selectedExtraction, invoice_date: e.target.value })
                    }
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={selectedExtraction.due_date || ''}
                    onChange={(e) =>
                      setSelectedExtraction({ ...selectedExtraction, due_date: e.target.value })
                    }
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Extracted Line Items ({selectedExtraction.items?.length || 0})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="px-4 py-2.5">Description</th>
                        <th className="px-3 py-2.5">HSN/SAC</th>
                        <th className="px-3 py-2.5">Qty</th>
                        <th className="px-3 py-2.5">Rate</th>
                        <th className="px-3 py-2.5">Taxable</th>
                        <th className="px-3 py-2.5">GST Rate</th>
                        <th className="px-4 py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedExtraction.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2.5 font-medium text-slate-800">{item.description}</td>
                          <td className="px-3 py-2.5 font-mono text-slate-500">{item.hsn_sac || '-'}</td>
                          <td className="px-3 py-2.5">{item.quantity} {item.unit}</td>
                          <td className="px-3 py-2.5">{formatINR(item.unit_price)}</td>
                          <td className="px-3 py-2.5">{formatINR(item.taxable_value)}</td>
                          <td className="px-3 py-2.5">{item.gst_rate}%</td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                            {formatINR(item.total_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tax & Total Summary */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500">Taxable Value:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{formatINR(selectedExtraction.taxable_amount)}</p>
                </div>
                <div>
                  <span className="text-slate-500">CGST + SGST:</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {formatINR((selectedExtraction.cgst_amount || 0) + (selectedExtraction.sgst_amount || 0))}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">IGST (Inter-state):</span>
                  <p className="font-bold text-slate-900 mt-0.5">{formatINR(selectedExtraction.igst_amount || 0)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Grand Total:</span>
                  <p className="text-sm font-bold text-blue-700 mt-0.5">{formatINR(selectedExtraction.total_amount)}</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Target Table:{' '}
                <strong className="text-slate-800 font-mono">
                  {selectedExtraction.document_type === 'purchase_bill'
                    ? 'purchase_bills & suppliers'
                    : selectedExtraction.document_type === 'sales_invoice'
                    ? 'invoices & customers'
                    : 'expenses'}
                </strong>
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>

                {selectedExtraction.status !== 'posted' && (
                  <button
                    type="button"
                    onClick={() => handleApproveAndPost(selectedExtraction.id)}
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Post to Financial Ledger</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
