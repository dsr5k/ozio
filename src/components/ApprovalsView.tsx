import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Filter,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { ApprovalRequest } from '../types/index.ts';
import { api } from '../lib/api.ts';
import { formatINR } from '../lib/gst.ts';

interface ApprovalsViewProps {
  onRefresh: () => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({ onRefresh }) => {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [filterType, setFilterType] = useState('all');
  const [rejectModalItem, setRejectModalItem] = useState<ApprovalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchApprovals = async () => {
    setIsLoading(true);
    try {
      const data = await api.getApprovals();
      setApprovals(data);
    } catch (err: any) {
      console.error('Failed to load approvals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApprove = async (item: ApprovalRequest) => {
    setActionError(null);
    try {
      await api.performApprovalAction('approve', item.entity_type, item.entity_id);
      setActionSuccess(`Approved: ${item.title}`);
      fetchApprovals();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve item');
    }
  };

  const handleReject = async () => {
    if (!rejectModalItem) return;
    try {
      await api.performApprovalAction(
        'reject',
        rejectModalItem.entity_type,
        rejectModalItem.entity_id,
        rejectionReason || 'Item rejected by financial approver'
      );
      setActionSuccess(`Rejected: ${rejectModalItem.title}`);
      setRejectModalItem(null);
      setRejectionReason('');
      fetchApprovals();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject item');
    }
  };

  const filteredApprovals = approvals.filter((a) => {
    if (filterType === 'all') return true;
    return a.entity_type === filterType;
  });

  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

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

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Financial Approvals & Governance Inbox</h3>
          </div>
          <p className="text-slate-500 mt-1">
            Sign-off queue for high-value purchase bills (&gt; ₹50,000), low-confidence AI document extractions, and authorized purchase orders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-rose-50 text-rose-700 font-bold px-3 py-1.5 rounded-lg border border-rose-200">
            {pendingCount} Pending Approvals
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
            filterType === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Items ({approvals.length})
        </button>
        <button
          onClick={() => setFilterType('purchase_bill')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
            filterType === 'purchase_bill'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          High-Value Bills (&gt; ₹50k)
        </button>
        <button
          onClick={() => setFilterType('document_extraction')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
            filterType === 'document_extraction'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          AI Extraction Reviews
        </button>
        <button
          onClick={() => setFilterType('purchase_order')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
            filterType === 'purchase_order'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Purchase Orders
        </button>
      </div>

      {/* Approvals Queue */}
      <div className="space-y-3">
        {filteredApprovals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-slate-700">Approvals Inbox is Clear</p>
            <p className="text-xs text-slate-400 mt-1">All financial documents, purchase orders, and high-value disbursements have been signed off.</p>
          </div>
        ) : (
          filteredApprovals.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  item.entity_type === 'purchase_bill'
                    ? 'bg-purple-50 text-purple-600'
                    : item.entity_type === 'document_extraction'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-blue-50 text-blue-600'
                }`}>
                  {item.entity_type === 'document_extraction' ? (
                    <Sparkles className="w-5 h-5" />
                  ) : item.entity_type === 'purchase_bill' ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {item.entity_type.replace('_', ' ')}
                    </span>
                    {item.confidence_score !== undefined && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.confidence_score >= 85
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {item.confidence_score.toFixed(1)}% Confidence
                      </span>
                    )}
                  </div>

                  <p className="text-slate-600 mt-1">
                    Party: <strong className="text-slate-800">{item.counterparty_name}</strong> | Requested on:{' '}
                    {item.requested_date} by {item.requested_by}
                  </p>
                  <p className="text-[11px] text-amber-800 bg-amber-50/70 p-1.5 rounded mt-2 border border-amber-200/60 inline-block">
                    Reason: {item.reason}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 shrink-0 md:text-right">
                <div>
                  <span className="text-slate-400 block text-[10px]">Item Value</span>
                  <p className="text-base font-bold text-slate-900">{formatINR(item.amount)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRejectModalItem(item)}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold transition-all flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleApprove(item)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-sm shadow-emerald-600/20 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Authorize</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reject Remarks Modal */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
              Reject Authorization: {rejectModalItem.title}
            </h3>
            <div className="py-4 space-y-3">
              <p className="text-slate-500">
                Please provide the governance reason or discrepancy details for the audit log:
              </p>
              <textarea
                rows={3}
                required
                placeholder="e.g. Rate discrepancy with agreed vendor contract; missing proof of delivery."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200"
              />
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectModalItem(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
