import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { AIDocumentCenter } from './components/AIDocumentCenter.tsx';
import { InvoicesView } from './components/InvoicesView.tsx';
import { PurchaseBillsView } from './components/PurchaseBillsView.tsx';
import { SuppliersView } from './components/SuppliersView.tsx';
import { CustomersView } from './components/CustomersView.tsx';
import { ExpensesView } from './components/ExpensesView.tsx';
import { GSTIntelligenceView } from './components/GSTIntelligenceView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { AutomationsView } from './components/AutomationsView.tsx';
import { IntegrationsView } from './components/IntegrationsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';

import {
  BusinessProfile,
  Customer,
  Supplier,
  Invoice,
  PurchaseBill,
  Expense,
  DocumentExtraction,
  DashboardStats,
  GSTSummary,
} from './types/index.ts';
import { api } from './lib/api.ts';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [extractions, setExtractions] = useState<DocumentExtraction[]>([]);
  const [gstSummary, setGstSummary] = useState<GSTSummary | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);

  const fetchAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [
        profileData,
        statsData,
        customersData,
        suppliersData,
        invoicesData,
        billsData,
        expensesData,
        extractionsData,
        gstData,
      ] = await Promise.all([
        api.getProfile(),
        api.getDashboardStats(),
        api.getCustomers(),
        api.getSuppliers(),
        api.getInvoices(),
        api.getPurchaseBills(),
        api.getExpenses(),
        api.getExtractions(),
        api.getGSTSummary(),
      ]);

      setProfile(profileData);
      setStats(statsData);
      setCustomers(customersData);
      setSuppliers(suppliersData);
      setInvoices(invoicesData);
      setPurchaseBills(billsData);
      setExpenses(expensesData);
      setExtractions(extractionsData);
      setGstSummary(gstData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const pendingReviewsCount = extractions.filter((e) => e.status === 'pending_review').length;
  const unpaidInvoicesCount = invoices.filter((i) => i.status === 'unpaid' || i.status === 'sent').length;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 antialiased overflow-hidden selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingReviewsCount={pendingReviewsCount}
        unpaidInvoicesCount={unpaidInvoicesCount}
        profile={profile}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          onOpenUpload={() => setCurrentTab('ai-documents')}
          onOpenCreateInvoice={() => {
            setCurrentTab('invoices');
            setCreateInvoiceOpen(true);
          }}
          onRefresh={fetchAllData}
          isRefreshing={isRefreshing}
        />

        {/* View Router */}
        <main className="flex-1 overflow-y-auto bg-slate-50/60">
          {currentTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              invoices={invoices}
              purchaseBills={purchaseBills}
              onNavigate={setCurrentTab}
              onOpenUpload={() => setCurrentTab('ai-documents')}
              onOpenCreateInvoice={() => {
                setCurrentTab('invoices');
                setCreateInvoiceOpen(true);
              }}
            />
          )}

          {currentTab === 'ai-documents' && (
            <AIDocumentCenter
              extractions={extractions}
              suppliers={suppliers}
              customers={customers}
              onRefresh={fetchAllData}
            />
          )}

          {currentTab === 'invoices' && (
            <InvoicesView
              invoices={invoices}
              customers={customers}
              profile={profile}
              onRefresh={fetchAllData}
              createModalOpen={createInvoiceOpen}
              setCreateModalOpen={setCreateInvoiceOpen}
            />
          )}

          {currentTab === 'purchase-bills' && (
            <PurchaseBillsView
              bills={purchaseBills}
              suppliers={suppliers}
              profile={profile}
              onRefresh={fetchAllData}
            />
          )}

          {currentTab === 'suppliers' && (
            <SuppliersView
              suppliers={suppliers}
              purchaseBills={purchaseBills}
              onRefresh={fetchAllData}
            />
          )}

          {currentTab === 'customers' && (
            <CustomersView
              customers={customers}
              invoices={invoices}
              onRefresh={fetchAllData}
            />
          )}

          {currentTab === 'expenses' && (
            <ExpensesView
              expenses={expenses}
              customers={customers}
              onRefresh={fetchAllData}
            />
          )}

          {currentTab === 'gst' && (
            <GSTIntelligenceView
              gstSummary={gstSummary}
              invoices={invoices}
              purchaseBills={purchaseBills}
              profile={profile}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              invoices={invoices}
              purchaseBills={purchaseBills}
              expenses={expenses}
              customers={customers}
              suppliers={suppliers}
            />
          )}

          {currentTab === 'automations' && <AutomationsView />}

          {currentTab === 'integrations' && <IntegrationsView />}

          {currentTab === 'settings' && (
            <SettingsView profile={profile} onRefresh={fetchAllData} />
          )}
        </main>
      </div>
    </div>
  );
}
