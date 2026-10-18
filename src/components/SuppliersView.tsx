import React, { useState } from 'react';
import { Plus, Building2, Search, CheckCircle2, AlertTriangle, Trash2, Edit2, X, Phone, Mail } from 'lucide-react';
import { Supplier, PurchaseBill } from '../types/index.ts';
import { api } from '../lib/api.ts';
import { INDIAN_STATES, validateGSTIN, getStateCodeFromGSTIN, formatINR } from '../lib/gst.ts';

interface SuppliersViewProps {
  suppliers: Supplier[];
  purchaseBills: PurchaseBill[];
  onRefresh: () => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  suppliers,
  purchaseBills,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [stateCode, setStateCode] = useState('27');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('General Supplier');

  const openCreateModal = () => {
    setEditingSupplier(null);
    setName('');
    setCompanyName('');
    setEmail('');
    setPhone('');
    setGstin('');
    setStateCode('27');
    setAddress('');
    setCategory('General Supplier');
    setModalOpen(true);
  };

  const openEditModal = (supp: Supplier) => {
    setEditingSupplier(supp);
    setName(supp.name);
    setCompanyName(supp.company_name || '');
    setEmail(supp.email || '');
    setPhone(supp.phone || '');
    setGstin(supp.gstin || '');
    setStateCode(supp.state_code || '27');
    setAddress(supp.address || '');
    setCategory(supp.category || 'General Supplier');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    // Validate GSTIN if provided
    if (gstin.trim()) {
      const gstinVal = validateGSTIN(gstin);
      if (!gstinVal.isValid) {
        setActionError(gstinVal.message || 'Invalid GSTIN');
        return;
      }
    }

    const stateName = INDIAN_STATES[stateCode] || 'Maharashtra';

    try {
      if (editingSupplier) {
        await api.updateSupplier(editingSupplier.id, {
          name,
          company_name: companyName,
          email,
          phone,
          gstin: gstin.toUpperCase(),
          state: stateName,
          state_code: stateCode,
          address,
          category,
        });
        setActionSuccess(`Supplier "${name}" updated successfully.`);
      } else {
        await api.createSupplier({
          name,
          company_name: companyName,
          email,
          phone,
          gstin: gstin.toUpperCase(),
          state: stateName,
          state_code: stateCode,
          address,
          category,
        });
        setActionSuccess(`Supplier "${name}" added to suppliers table.`);
      }

      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to save supplier');
    }
  };

  const handleDelete = async (id: string, sName: string) => {
    if (!confirm(`Are you sure you want to delete supplier "${sName}"?`)) return;
    try {
      await api.deleteSupplier(id);
      setActionSuccess(`Supplier "${sName}" deleted.`);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete supplier');
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.company_name && s.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.gstin && s.gstin.toLowerCase().includes(searchQuery.toLowerCase()))
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
            placeholder="Search suppliers by name, legal entity, or GSTIN..."
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
          <span>Add Vendor / Supplier</span>
        </button>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((supp) => {
          const billsForSupp = purchaseBills.filter((b) => b.supplier_id === supp.id);
          const totalSpent = billsForSupp.reduce((sum, b) => sum + b.total_amount, 0);

          return (
            <div
              key={supp.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm shrink-0">
                    {supp.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(supp)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(supp.id, supp.name)}
                      className="p-1 text-rose-400 hover:text-rose-700 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-bold text-slate-900">{supp.name}</h4>
                  {supp.company_name && supp.company_name !== supp.name && (
                    <p className="text-xs text-slate-500">{supp.company_name}</p>
                  )}
                  <span className="inline-block mt-1 text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {supp.category || 'General Supplier'}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono text-[11px]">GSTIN:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {supp.gstin || 'Unregistered'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>State: {supp.state} ({supp.state_code})</span>
                  </div>
                  {supp.email && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{supp.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Purchase Bills</span>
                  <span className="font-bold text-slate-800">{billsForSupp.length} bills</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Total Billed</span>
                  <span className="font-bold text-purple-700">{formatINR(totalSpent)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Supplier Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingSupplier ? 'Edit Vendor (Supplier)' : 'Add Vendor (Supplier)'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="py-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Legal Trade / Vendor Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200"
                  placeholder="e.g. Amazon Web Services India Pvt Ltd"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company / Branch Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                    placeholder="e.g. AWS India"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                    placeholder="e.g. Cloud Infrastructure"
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
                    placeholder="e.g. 29AALCA2233N1ZK"
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
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
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
                <label className="block font-semibold text-slate-700 mb-1">Registered Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200"
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
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
