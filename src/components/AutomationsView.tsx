import React, { useState } from 'react';
import { Sliders, CheckCircle2, ShieldAlert, Sparkles, Bell, ArrowRight, Info, AlertTriangle } from 'lucide-react';

export const AutomationsView: React.FC = () => {
  const [highValueThreshold, setHighValueThreshold] = useState<number>(50000);
  const [aiConfidenceThreshold, setAiConfidenceThreshold] = useState<number>(85);
  const [dedupeEnabled, setDedupeEnabled] = useState<boolean>(true);
  const [paymentRemindersEnabled, setPaymentRemindersEnabled] = useState<boolean>(true);
  const [emailServiceConfigured, setEmailServiceConfigured] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleSave = () => {
    setSaveMessage('Operational automation policies updated successfully.');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto text-xs">
      {saveMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveMessage}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">Financial Automations & Approval Rules</h3>
        <p className="text-slate-500 mt-1">
          Configure rule-based controls, AI review boundaries, duplicate checks, and approval thresholds.
        </p>
      </div>

      <div className="space-y-4">
        {/* Rule 1: AI Low-Confidence Review Queue */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-start justify-between gap-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm">AI Document Review Escalation Rule</h4>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                  Active
                </span>
              </div>
              <p className="text-slate-500 mt-1">
                Any uploaded document whose extracted confidence falls below this threshold or contains math discrepancies will be routed to the Human Review Queue before ledger posting.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="font-semibold text-slate-700">Confidence Threshold:</span>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={aiConfidenceThreshold}
                  onChange={(e) => setAiConfidenceThreshold(Number(e.target.value))}
                  className="w-40"
                />
                <span className="font-bold text-blue-600 font-mono text-sm">{aiConfidenceThreshold}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rule 2: High Value Purchase Approval */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-start justify-between gap-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm">High-Value Purchase Bill Dual Approval</h4>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                  Active
                </span>
              </div>
              <p className="text-slate-500 mt-1">
                Bills exceeding this amount require explicit sign-off from the Finance Lead / Super Admin before disbursement.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="font-semibold text-slate-700">Approval Limit (₹):</span>
                <input
                  type="number"
                  step="5000"
                  value={highValueThreshold}
                  onChange={(e) => setHighValueThreshold(Number(e.target.value))}
                  className="p-1.5 border border-slate-200 rounded-lg font-bold w-32"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Rule 3: SHA-256 Duplicate Document Blocking */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-start justify-between gap-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm">Duplicate Invoice & Bill Hash Guard</h4>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                  Active
                </span>
              </div>
              <p className="text-slate-500 mt-1">
                Computes cryptographic SHA-256 document fingerprints and matches (supplier_id, bill_number) against the <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">bill_duplicate_checks</code> table to prevent double payments.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={dedupeEnabled}
              onChange={(e) => setDedupeEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Rule 4: Payment Reminder Automation (Honest status) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-start justify-between gap-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm">Automated Client Overdue Reminders</h4>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                  Unconfigured SMTP
                </span>
              </div>
              <p className="text-slate-500 mt-1">
                Dispatches automated payment notifications via email 3 days before invoice due date and at 7 days overdue.
              </p>
              <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Requires SendGrid / Resend / AWS SES API credentials to send live outbound client emails. In-dashboard overdue alerts remain active.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20"
        >
          Save Automation Settings
        </button>
      </div>
    </div>
  );
};
