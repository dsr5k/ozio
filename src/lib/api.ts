import {
  BusinessProfile,
  Customer,
  Supplier,
  Invoice,
  InvoiceItem,
  PurchaseBill,
  PurchaseBillItem,
  Expense,
  StoredDocument,
  DocumentExtraction,
  DashboardStats,
  GSTSummary,
} from '../types/index.ts';

const BASE_URL = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const errorData = await res.json();
      errorMsg = errorData.error || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Profile
  getProfile: () => request<BusinessProfile>('/profile'),
  updateProfile: (data: Partial<BusinessProfile>) =>
    request<BusinessProfile>('/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // Dashboard
  getDashboardStats: () => request<DashboardStats>('/dashboard/stats'),

  // Customers
  getCustomers: () => request<Customer[]>('/customers'),
  createCustomer: (data: Omit<Customer, 'id' | 'user_id' | 'created_at'>) =>
    request<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: Partial<Customer>) =>
    request<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: string) => request<{ success: boolean }>(`/customers/${id}`, { method: 'DELETE' }),

  // Suppliers (strictly suppliers table)
  getSuppliers: () => request<Supplier[]>('/suppliers'),
  createSupplier: (data: Omit<Supplier, 'id' | 'user_id' | 'created_at'>) =>
    request<Supplier>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: Partial<Supplier>) =>
    request<Supplier>(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id: string) => request<{ success: boolean }>(`/suppliers/${id}`, { method: 'DELETE' }),

  // Invoices
  getInvoices: () => request<Invoice[]>('/invoices'),
  getInvoice: (id: string) => request<Invoice>(`/invoices/${id}`),
  createInvoice: (
    invoice: Omit<Invoice, 'id' | 'user_id' | 'created_at' | 'customer' | 'items'>,
    items: Array<Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at'>>
  ) =>
    request<Invoice>('/invoices', {
      method: 'POST',
      body: JSON.stringify({ ...invoice, items }),
    }),
  recordInvoicePayment: (id: string, amount: number, date?: string, notes?: string) =>
    request<Invoice>(`/invoices/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify({ amount, date, notes }),
    }),
  deleteInvoice: (id: string) => request<{ success: boolean }>(`/invoices/${id}`, { method: 'DELETE' }),

  // Purchase Bills
  getPurchaseBills: () => request<PurchaseBill[]>('/purchase-bills'),
  getPurchaseBill: (id: string) => request<PurchaseBill>(`/purchase-bills/${id}`),
  createPurchaseBill: (
    bill: Omit<PurchaseBill, 'id' | 'user_id' | 'created_at' | 'supplier' | 'items'>,
    items: Array<Omit<PurchaseBillItem, 'id' | 'purchase_bill_id' | 'created_at'>>,
    fileHash?: string
  ) =>
    request<PurchaseBill>('/purchase-bills', {
      method: 'POST',
      body: JSON.stringify({ ...bill, items, fileHash }),
    }),
  recordPurchaseBillPayment: (id: string, amount: number) =>
    request<PurchaseBill>(`/purchase-bills/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
  deletePurchaseBill: (id: string) => request<{ success: boolean }>(`/purchase-bills/${id}`, { method: 'DELETE' }),

  // Expenses
  getExpenses: () => request<Expense[]>('/expenses'),
  createExpense: (data: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'customer'>) =>
    request<Expense>('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id: string) => request<{ success: boolean }>(`/expenses/${id}`, { method: 'DELETE' }),

  // AI Document Ingestion
  ingestDocument: (params: {
    filename: string;
    fileType: string;
    fileSize: number;
    fileBase64?: string;
    documentText?: string;
    autoPost?: boolean;
  }) =>
    request<{ document: StoredDocument; extraction: DocumentExtraction }>('/documents/ingest', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  getExtractions: () => request<DocumentExtraction[]>('/documents/extractions'),
  getExtraction: (id: string) => request<DocumentExtraction>(`/documents/extractions/${id}`),
  approveExtraction: (id: string, overrides?: Partial<DocumentExtraction>) =>
    request<{ success: boolean; recordType: string; recordId: string; message: string }>(
      `/documents/extractions/${id}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ overrides }),
      }
    ),

  // GST
  getGSTSummary: () => request<GSTSummary>('/gst/summary'),
};
