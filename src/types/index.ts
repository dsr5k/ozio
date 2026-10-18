export type DocumentType = 'purchase_bill' | 'sales_invoice' | 'expense_receipt' | 'unknown';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'unpaid' | 'overdue' | 'partially_paid';
export type PurchaseBillStatus = 'draft' | 'pending_approval' | 'approved' | 'paid' | 'unpaid' | 'overdue';
export type DocumentProcessingStatus = 'pending' | 'processing' | 'extracted' | 'review_required' | 'approved' | 'rejected' | 'posted';
export type ExtractionStatus = 'pending_review' | 'verified' | 'posted';
export type ExpenseStatus = 'recorded' | 'reimbursed' | 'pending';

export interface BusinessProfile {
  id: string;
  business_name: string;
  gstin: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  state_code: string;
  pincode: string;
  pan?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  bank_branch?: string;
  upi_id?: string;
  invoice_prefix: string;
  invoice_notes: string;
  terms_conditions: string;
  currency: string;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  company_name?: string;
  email: string;
  phone?: string;
  gstin?: string;
  state: string;
  state_code: string;
  billing_address?: string;
  shipping_address?: string;
  created_at: string;
  updated_at?: string;
}

// Strictly "suppliers" table in DB. UI displays as "Vendors / Suppliers".
export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  company_name?: string;
  email: string;
  phone?: string;
  gstin?: string;
  state: string;
  state_code: string;
  address?: string;
  bank_details?: string;
  category: string;
  created_at: string;
  updated_at?: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  hsn_sac: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  taxable_value: number;
  gst_rate: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  total_amount: number;
  created_at?: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  customer_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  status: InvoiceStatus;
  payment_terms: string;
  notes?: string;
  is_interstate: boolean;
  created_at: string;
  updated_at?: string;
  // Joined fields
  customer?: Customer;
  items?: InvoiceItem[];
}

export interface PurchaseBillItem {
  id: string;
  purchase_bill_id: string;
  description: string;
  hsn_sac: string;
  quantity: number;
  unit: string;
  unit_price: number;
  taxable_value: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
  created_at?: string;
}

export interface PurchaseBill {
  id: string;
  user_id: string;
  supplier_id: string;
  bill_number: string;
  bill_date: string;
  due_date?: string;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  total_amount: number;
  amount_paid: number;
  status: PurchaseBillStatus;
  category: string;
  document_url?: string;
  document_id?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  // Joined fields
  supplier?: Supplier;
  items?: PurchaseBillItem[];
}

export interface BillDuplicateCheck {
  id: string;
  user_id: string;
  supplier_id?: string;
  bill_number: string;
  bill_date?: string;
  total_amount: number;
  file_hash?: string;
  purchase_bill_id?: string;
  detected_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  customer_id?: string | null;
  category: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  description: string;
  receipt_url?: string | null;
  is_billable: boolean;
  status: ExpenseStatus;
  gst_amount: number;
  created_at: string;
  customer?: Customer;
}

export interface StoredDocument {
  id: string;
  user_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  file_hash: string;
  file_url?: string;
  document_type: DocumentType;
  status: DocumentProcessingStatus;
  created_at: string;
}

export interface ExtractedLineItem {
  description: string;
  hsn_sac: string;
  quantity: number;
  unit: string;
  unit_price: number;
  taxable_value: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
}

export interface DocumentExtraction {
  id: string;
  document_id: string;
  user_id: string;
  document_type: DocumentType;
  confidence_score: number; // 0-100
  party_name?: string;
  party_gstin?: string;
  party_type: 'supplier' | 'customer' | 'unknown';
  matched_party_id?: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  subtotal: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
  items: ExtractedLineItem[];
  validation_flags: string[];
  is_duplicate: boolean;
  duplicate_of_id?: string | null;
  status: ExtractionStatus;
  posted_record_type?: 'purchase_bill' | 'invoice' | 'expense' | null;
  posted_record_id?: string | null;
  created_at: string;
  // joined document info
  document?: StoredDocument;
}

export interface DashboardStats {
  totalRevenue: number;
  totalPurchases: number;
  totalExpenses: number;
  netProfit: number;
  outstandingReceivables: number;
  unpaidInvoicesCount: number;
  paidInvoicesCount: number;
  overdueInvoicesCount: number;
  totalPayables: number;
  unpaidBillsCount: number;
  pendingReviewsCount: number;
  outputGst: number;
  inputGstCredit: number;
  netGstPayable: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'invoice_created' | 'bill_processed' | 'expense_added' | 'ai_review_required' | 'payment_received';
  title: string;
  description: string;
  amount?: number;
  date: string;
  status?: string;
}

export interface GSTSummary {
  outputGst: {
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
  };
  inputTaxCredit: {
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
  };
  netTaxPayable: number;
  hsnSummary: {
    hsn_sac: string;
    description: string;
    totalQty: number;
    totalTaxable: number;
    gstRate: number;
    totalTax: number;
  }[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  description: string;
  hsn_sac: string;
  quantity: number;
  unit: string;
  unit_price: number;
  taxable_value: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
  created_at?: string;
}

export type PurchaseOrderStatus = 'draft' | 'issued' | 'received' | 'billed' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  user_id: string;
  supplier_id: string;
  po_number: string;
  po_date: string;
  delivery_date?: string;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  total_amount: number;
  status: PurchaseOrderStatus;
  notes?: string;
  matched_purchase_bill_id?: string;
  created_at: string;
  updated_at?: string;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export type PaymentType = 'inflow' | 'outflow';
export type PaymentStatus = 'completed' | 'reconciled' | 'pending';

export interface PaymentRecord {
  id: string;
  user_id: string;
  payment_date: string;
  type: PaymentType;
  amount: number;
  counterparty_name: string;
  counterparty_type: 'customer' | 'supplier';
  counterparty_id: string;
  invoice_id?: string;
  purchase_bill_id?: string;
  reference_number: string; // UTR / Cheque / Bank Txn ID
  payment_method: 'NEFT/RTGS' | 'UPI' | 'Corporate Card' | 'Cheque' | 'Net Banking';
  status: PaymentStatus;
  notes?: string;
  created_at: string;
}

export interface AnomalyReport {
  id: string;
  type: 'tax_rate_anomaly' | 'price_deviation' | 'state_mismatch' | 'duplicate_warning' | 'threshold_exceeded' | 'missing_hsn';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  field?: string;
}

export interface ApprovalRequest {
  id: string;
  title: string;
  entity_type: 'purchase_bill' | 'document_extraction' | 'expense' | 'purchase_order';
  entity_id: string;
  amount: number;
  counterparty_name: string;
  requested_date: string;
  requested_by: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  confidence_score?: number;
  anomalies?: AnomalyReport[];
}

