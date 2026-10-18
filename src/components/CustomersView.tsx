import React, { useState } from 'react';
import { Plus, Users, Search, CheckCircle2, AlertTriangle, Trash2, Edit2, X, Phone, Mail, MapPin } from 'lucide-react';
import { Customer, Invoice } from '../types/index.ts';
import { api } from '../lib/api.ts';
import { INDIAN_STATES, validateGSTIN, getStateCodeFromGSTIN, formatINR } from '../lib/gst.ts';

interface CustomersViewProps {
  customers: Customer[];
  invoices: Invoice[];
  onRefresh: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  invoices,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [stateCode, setStateCode] = useState('27');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');

  const openCreateModal = () => {
    setEditingCustomer(null);
    setName('');
    setCompanyName('');
    setEmail('');
    setPhone('');
    setGstin('');
    setStateCode('27');
    setBillingAddress('');
    setShippingAddress('');
    setModalOpen(true);
  };

  const openEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setCompanyName(cust.company_name || '');
    setEmail(cust.email || '');
    setPhone(cust.phone || '');
    setGstin(cust.gstin || '');
    setStateCode(cust.state_code || '27');
    setBillingAddress(cust.billing_address || '');
    setShippingAddress(cust.shipping_address || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (gstin.trim()) {
      const gstinVal = validateGSTIN(gstin);
      if (!gstinVal.isValid) {
        setActionError(gstinVal.message || 'Invalid GSTIN');
        return;
      }
    }

    const stateName = INDIAN_STATES[stateCode] || 'Maharashtra';

    try {
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, {
          name,
          company_name: companyName,
          email,
          phone,
          gstin: gstin.toUpperCase(),
          state: stateName,
          state_code: stateCode,
          billing_address: billingAddress,
          shipping_address: shippingAddress,
        });
        setActionSuccess(`Customer "${name}" updated.`);
      } else {
        await api.createCustomer({
          name,
          company_name: companyName,
          email,
          phone,
          gstin: gstin.toUpperCase(),
          state: stateName,
          state_code: stateCode,
          billing_address: billingAddress,
          shipping_address: shippingAddress,
        });
        setActionSuccess(`Customer "${name}" created.`);
      }

      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to save customer');
    }
  };

  const handleDelete = async (id: string, cName: string) => {
    if (!confirm(`Are you sure you want to delete customer "${cName}"?`)) return;
    try {
      await api.deleteCustomer(id);
      setActionSuccess(`Customer "${cName}" deleted.`);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete customer');
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.company_name && c.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.gstin && c.gstin.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
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
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers by name, company, or GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => {
          const custInvoices = invoices.filter((i) => i.customer_id === cust.id);
          const totalInvoiced = custInvoices.reduce((sum, i) => sum + i.total_amount, 0);

          return (
            <div
              key={cust.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                    {cust.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(cust)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cust.id, cust.name)}
                      className="p-1 text-rose-400 hover:text-rose-700 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-bold text-slate-900">{cust.company_name || cust.name}</h4>
                  {cust.company_name && cust.company_name !== cust.name && (
                    <p className="text-xs text-slate-500">Contact: {cust.name}</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono text-[11px]">GSTIN:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {cust.gstin || 'Unregistered'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    <span>State: {cust.state} (Code: {cust.state_code})</span>
                  </div>
                  {cust.email && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{cust.email}</span>
                    </div>
                  )}
                  {cust.billing_address && (
                    <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{cust.billing_address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Sales Invoices</span>
                  <span className="font-bold text-slate-800">{custInvoices.length} invoices</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Total Revenue</span>
                  <span className="font-bold text-blue-700">{formatINR(totalInvoiced)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="py-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Person Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                    placeholder="e.g. Rohit Sharma"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company / Entity Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                    placeholder="e.g. Reliance Retail Ventures"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">15-Digit GSTIN</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setGstin(val);
                      if (val.length >= 2) {
                        const code = getStateCodeFromGSTIN(val);
                        if (INDIAN_STATES[code]) setStateCode(code);
                      }
                    }}
                    className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
                    placeholder="e.g. 27AAACR4500C1Z8"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State & State Code</label>
                  <select
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 font-medium"
                  >
                    {Object.entries(INDIAN_STATES).map(([code, sName]) => (
                      <option key={code} value={code}>
                        {code} - {sName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Billing Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Billing Address</label>
                <textarea
                  rows={2}
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200"
                  placeholder="Official registered billing address"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
