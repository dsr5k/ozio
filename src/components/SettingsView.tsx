import React, { useState } from 'react';
import { Settings, CheckCircle2, AlertTriangle, Building, CreditCard, FileText } from 'lucide-react';
import { BusinessProfile } from '../types/index.ts';
import { api } from '../lib/api.ts';
import { INDIAN_STATES, validateGSTIN, getStateCodeFromGSTIN } from '../lib/gst.ts';

interface SettingsViewProps {
  profile: BusinessProfile | null;
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ profile, onRefresh }) => {
  const [formData, setFormData] = useState<BusinessProfile>(
    profile || {
      id: '',
      business_name: '',
      gstin: '',
      email: '',
      phone: '',
      address_line1: '',
      city: '',
      state: 'Maharashtra',
      state_code: '27',
      pincode: '',
      invoice_prefix: 'INV-',
      invoice_notes: '',
      terms_conditions: '',
      currency: 'INR',
    }
  );

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validate GSTIN
    if (formData.gstin) {
      const gstinVal = validateGSTIN(formData.gstin);
      if (!gstinVal.isValid) {
        setErrorMsg(gstinVal.message || 'Invalid GSTIN');
        setSaving(false);
        return;
      }
    }

    try {
      await api.updateProfile(formData);
      setSuccessMsg('Business profile and GST settings saved successfully!');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto text-xs">
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Identity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Entity & Legal Registration (profiles table)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Legal Name</label>
              <input
                type="text"
                required
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">15-Digit GSTIN</label>
              <input
                type="text"
                required
                value={formData.gstin}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  const stateCode = getStateCodeFromGSTIN(val);
                  setFormData({
                    ...formData,
                    gstin: val,
                    state_code: stateCode || formData.state_code,
                    state: INDIAN_STATES[stateCode] || formData.state,
                  });
                }}
                className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Permanent Account Number (PAN)</label>
              <input
                type="text"
                value={formData.pan || ''}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">State & GST State Code</label>
              <select
                value={formData.state_code}
                onChange={(e) => {
                  const code = e.target.value;
                  setFormData({ ...formData, state_code: code, state: INDIAN_STATES[code] });
                }}
                className="w-full p-2.5 rounded-lg border border-slate-200"
              >
                {Object.entries(INDIAN_STATES).map(([code, sName]) => (
                  <option key={code} value={code}>
                    {code} - {sName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Registered Address Line 1</label>
            <input
              type="text"
              value={formData.address_line1}
              onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">PIN Code</label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Banking Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Banking & Settlement Information (Printed on Tax Invoices)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
              <input
                type="text"
                value={formData.bank_name || ''}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bank Account Number</label>
              <input
                type="text"
                value={formData.bank_account_no || ''}
                onChange={(e) => setFormData({ ...formData, bank_account_no: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">IFSC Code</label>
              <input
                type="text"
                value={formData.bank_ifsc || ''}
                onChange={(e) => setFormData({ ...formData, bank_ifsc: e.target.value.toUpperCase() })}
                className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Corporate UPI ID</label>
              <input
                type="text"
                value={formData.upi_id || ''}
                onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Invoicing Settings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Invoice Numbering & Legal Terms</h3>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Invoice Prefix</label>
            <input
              type="text"
              value={formData.invoice_prefix}
              onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Standard Invoice Notes</label>
            <textarea
              rows={2}
              value={formData.invoice_notes}
              onChange={(e) => setFormData({ ...formData, invoice_notes: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-slate-200"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Standard Terms & Conditions</label>
            <textarea
              rows={2}
              value={formData.terms_conditions}
              onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-slate-200"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
