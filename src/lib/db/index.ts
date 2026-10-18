import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  BusinessProfile,
  Customer,
  Supplier,
  Invoice,
  InvoiceItem,
  PurchaseBill,
  PurchaseBillItem,
  BillDuplicateCheck,
  Expense,
  StoredDocument,
  DocumentExtraction,
  DashboardStats,
  GSTSummary,
  ActivityItem,
  PurchaseOrder,
  PurchaseOrderItem,
  PaymentRecord,
  ApprovalRequest,
} from '../../types/index.ts';
import { calculateItemTax, isInterStateTransaction } from '../gst.ts';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'ozio_db.json');

interface DatabaseStore {
  profile: BusinessProfile;
  customers: Customer[];
  suppliers: Supplier[]; // Strictly suppliers table
  invoices: Invoice[];
  invoice_items: InvoiceItem[];
  purchase_bills: PurchaseBill[];
  purchase_bill_items: PurchaseBillItem[];
  bill_duplicate_checks: BillDuplicateCheck[];
  expenses: Expense[];
  purchase_orders: PurchaseOrder[];
  purchase_order_items: PurchaseOrderItem[];
  payments: PaymentRecord[];
  stored_documents: StoredDocument[];
  document_extractions: DocumentExtraction[];
  activities: ActivityItem[];
}

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

const INITIAL_PROFILE: BusinessProfile = {
  id: DEFAULT_USER_ID,
  business_name: 'ApexTech Solutions Private Limited',
  gstin: '27AABCA1234F1Z5',
  email: 'finance@apextechsolutions.in',
  phone: '+91 98200 12345',
  address_line1: 'Unit 402, Pinnacle IT Park, MIDC',
  address_line2: 'Andheri East',
  city: 'Mumbai',
  state: 'Maharashtra',
  state_code: '27',
  pincode: '400093',
  pan: 'AABCA1234F',
  bank_name: 'HDFC Bank Ltd',
  bank_account_no: '50200049283719',
  bank_ifsc: 'HDFC0000060',
  bank_branch: 'MIDC Andheri Branch',
  upi_id: 'apextech@hdfcbank',
  invoice_prefix: 'APX-2026-',
  invoice_notes: 'Payment is due within 15 days of invoice date. Interest @ 18% p.a. applicable on delayed payments.',
  terms_conditions: 'All disputes are subject to Mumbai jurisdiction. Please quote invoice number during wire transfer.',
  currency: 'INR',
  created_at: new Date('2026-01-15T09:00:00Z').toISOString(),
};

const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-101',
    user_id: DEFAULT_USER_ID,
    name: 'Rohit Sharma',
    company_name: 'Reliance Retail Ventures Ltd',
    email: 'vendor.invoices@relianceretail.com',
    phone: '+91 22 3555 7000',
    gstin: '27AAACR4500C1Z8', // Maharashtra (Intra-state)
    state: 'Maharashtra',
    state_code: '27',
    billing_address: 'Maker Chambers IV, Nariman Point, Mumbai - 400021',
    shipping_address: 'Warehouse Complex, Bhiwandi, Thane - 421302',
    created_at: '2026-01-20T10:00:00Z',
  },
  {
    id: 'cust-102',
    user_id: DEFAULT_USER_ID,
    name: 'Ananya Rao',
    company_name: 'Infosys BPM Technologies',
    email: 'finance-ap@infosys.com',
    phone: '+91 80 2852 0261',
    gstin: '29AABCI1234M1Z2', // Karnataka (Inter-state)
    state: 'Karnataka',
    state_code: '29',
    billing_address: 'Plot 44, Electronic City, Hosur Road, Bengaluru - 560100',
    shipping_address: 'Plot 44, Electronic City, Bengaluru - 560100',
    created_at: '2026-02-01T11:30:00Z',
  },
  {
    id: 'cust-103',
    user_id: DEFAULT_USER_ID,
    name: 'Vikram Mehta',
    company_name: 'Zomato Operations Hub',
    email: 'accounts@zomato.com',
    phone: '+91 124 412 1100',
    gstin: '06AAACZ1122D1Z4', // Haryana (Inter-state)
    state: 'Haryana',
    state_code: '06',
    billing_address: 'Building 11, DLF Cyber City, Gurugram - 122002',
    shipping_address: 'Building 11, DLF Cyber City, Gurugram - 122002',
    created_at: '2026-02-15T14:15:00Z',
  },
];

const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'supp-201',
    user_id: DEFAULT_USER_ID,
    name: 'Amazon Web Services India Pvt Ltd',
    company_name: 'Amazon Web Services India',
    email: 'billing-india@amazon.com',
    phone: '+91 80 4000 5000',
    gstin: '29AALCA2233N1ZK', // Karnataka (Inter-state)
    state: 'Karnataka',
    state_code: '29',
    address: 'Brigade Gateway, 26/1 Dr. Rajkumar Road, Malleshwaram, Bengaluru - 560055',
    category: 'Cloud Infrastructure & Hosting',
    created_at: '2026-01-18T08:00:00Z',
  },
  {
    id: 'supp-202',
    user_id: DEFAULT_USER_ID,
    name: 'Croma Enterprise Electronics',
    company_name: 'Infiniti Retail Ltd',
    email: 'enterprise@croma.com',
    phone: '+91 22 6766 7000',
    gstin: '27AABCI4809Q1ZM', // Maharashtra (Intra-state)
    state: 'Maharashtra',
    state_code: '27',
    address: 'Unit 701, Park 24, Thane West, Mumbai - 400601',
    category: 'Hardware & Workstations',
    created_at: '2026-01-22T09:30:00Z',
  },
  {
    id: 'supp-203',
    user_id: DEFAULT_USER_ID,
    name: 'WeWork India Management',
    company_name: 'WeWork India Spaces Pvt Ltd',
    email: 'spaces@wework.co.in',
    phone: '+91 80 6825 0000',
    gstin: '27AAACW8899P1Z3', // Maharashtra (Intra-state)
    state: 'Maharashtra',
    state_code: '27',
    address: 'Goregaon East Hub, Western Express Highway, Mumbai - 400063',
    category: 'Office Space & Utilities',
    created_at: '2026-02-05T10:00:00Z',
  },
];

const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-001',
    user_id: DEFAULT_USER_ID,
    customer_id: 'cust-101',
    invoice_number: 'APX-2026-001',
    issue_date: '2026-03-01',
    due_date: '2026-03-16',
    subtotal: 180000,
    taxable_amount: 180000,
    cgst_amount: 16200,
    sgst_amount: 16200,
    igst_amount: 0,
    total_tax: 32400,
    discount_amount: 0,
    total_amount: 212400,
    amount_paid: 212400,
    status: 'paid',
    payment_terms: 'Net 15 Days',
    notes: 'ERP Customization Sprint 1 & Production Migration',
    is_interstate: false,
    created_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 'inv-002',
    user_id: DEFAULT_USER_ID,
    customer_id: 'cust-102',
    invoice_number: 'APX-2026-002',
    issue_date: '2026-03-15',
    due_date: '2026-03-30',
    subtotal: 350000,
    taxable_amount: 350000,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 63000,
    total_tax: 63000,
    discount_amount: 0,
    total_amount: 413000,
    amount_paid: 0,
    status: 'unpaid',
    payment_terms: 'Net 15 Days',
    notes: 'Q1 AI Pipeline Integration & LLM Backend Maintenance',
    is_interstate: true,
    created_at: '2026-03-15T11:00:00Z',
  },
  {
    id: 'inv-003',
    user_id: DEFAULT_USER_ID,
    customer_id: 'cust-103',
    invoice_number: 'APX-2026-003',
    issue_date: '2026-04-01',
    due_date: '2026-04-16',
    subtotal: 125000,
    taxable_amount: 125000,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 22500,
    total_tax: 22500,
    discount_amount: 0,
    total_amount: 147500,
    amount_paid: 0,
    status: 'sent',
    payment_terms: 'Net 15 Days',
    notes: 'Analytics Dashboard Design and API Automation Service',
    is_interstate: true,
    created_at: '2026-04-01T09:30:00Z',
  },
];

const INITIAL_INVOICE_ITEMS: InvoiceItem[] = [
  {
    id: 'item-001',
    invoice_id: 'inv-001',
    description: 'Enterprise Financial Workflow Automation Module',
    hsn_sac: '998314', // SAC for IT design and development
    quantity: 1,
    unit: 'NOS',
    unit_price: 180000,
    discount_percent: 0,
    taxable_value: 180000,
    gst_rate: 18,
    cgst_rate: 9,
    cgst_amount: 16200,
    sgst_rate: 9,
    sgst_amount: 16200,
    igst_rate: 0,
    igst_amount: 0,
    total_amount: 212400,
    created_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 'item-002',
    invoice_id: 'inv-002',
    description: 'Cloud Data Pipeline Consulting & Architecture Services',
    hsn_sac: '998313',
    quantity: 70,
    unit: 'HRS',
    unit_price: 5000,
    discount_percent: 0,
    taxable_value: 350000,
    gst_rate: 18,
    cgst_rate: 0,
    cgst_amount: 0,
    sgst_rate: 0,
    sgst_amount: 0,
    igst_rate: 18,
    igst_amount: 63000,
    total_amount: 413000,
    created_at: '2026-03-15T11:00:00Z',
  },
  {
    id: 'item-003',
    invoice_id: 'inv-003',
    description: 'Real-time Financial Telemetry & Reporting Dashboard',
    hsn_sac: '998314',
    quantity: 1,
    unit: 'NOS',
    unit_price: 125000,
    discount_percent: 0,
    taxable_value: 125000,
    gst_rate: 18,
    cgst_rate: 0,
    cgst_amount: 0,
    sgst_rate: 0,
    sgst_amount: 0,
    igst_rate: 18,
    igst_amount: 22500,
    total_amount: 147500,
    created_at: '2026-04-01T09:30:00Z',
  },
];

const INITIAL_PURCHASE_BILLS: PurchaseBill[] = [
  {
    id: 'pb-101',
    user_id: DEFAULT_USER_ID,
    supplier_id: 'supp-201',
    bill_number: 'AWS-IN-98214',
    bill_date: '2026-03-05',
    due_date: '2026-03-20',
    taxable_amount: 64000,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 11520,
    total_tax: 11520,
    total_amount: 75520,
    amount_paid: 75520,
    status: 'paid',
    category: 'Cloud Infrastructure & Hosting',
    notes: 'Monthly AWS Cloud Hosting & Elastic Compute Services',
    created_at: '2026-03-05T12:00:00Z',
  },
  {
    id: 'pb-102',
    user_id: DEFAULT_USER_ID,
    supplier_id: 'supp-203',
    bill_number: 'WW-MUM-2026-048',
    bill_date: '2026-03-28',
    due_date: '2026-04-10',
    taxable_amount: 85000,
    cgst_amount: 7650,
    sgst_amount: 7650,
    igst_amount: 0,
    total_tax: 15300,
    total_amount: 100300,
    amount_paid: 0,
    status: 'unpaid',
    category: 'Office Space & Utilities',
    notes: 'Dedicated desk allocation & high-speed leased bandwidth for March 2026',
    created_at: '2026-03-28T14:30:00Z',
  },
];

const INITIAL_PURCHASE_BILL_ITEMS: PurchaseBillItem[] = [
  {
    id: 'pbi-001',
    purchase_bill_id: 'pb-101',
    description: 'AWS EC2 + S3 Storage Cloud Infrastructure',
    hsn_sac: '998315',
    quantity: 1,
    unit: 'NOS',
    unit_price: 64000,
    taxable_value: 64000,
    gst_rate: 18,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 11520,
    total_amount: 75520,
    created_at: '2026-03-05T12:00:00Z',
  },
  {
    id: 'pbi-002',
    purchase_bill_id: 'pb-102',
    description: 'WeWork Office Space Managed Lease (Goregaon Hub)',
    hsn_sac: '997212',
    quantity: 1,
    unit: 'NOS',
    unit_price: 85000,
    taxable_value: 85000,
    gst_rate: 18,
    cgst_amount: 7650,
    sgst_amount: 7650,
    igst_amount: 0,
    total_amount: 100300,
    created_at: '2026-03-28T14:30:00Z',
  },
];

const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-001',
    user_id: DEFAULT_USER_ID,
    customer_id: null,
    category: 'Software & Cloud',
    amount: 12400,
    expense_date: '2026-03-10',
    payment_method: 'Corporate Card',
    description: 'GitHub Enterprise & Figma Organization Annual Licenses',
    receipt_url: '/receipts/github-figma-receipt.pdf',
    is_billable: false,
    status: 'recorded',
    gst_amount: 1891.53,
    created_at: '2026-03-10T11:00:00Z',
  },
  {
    id: 'exp-002',
    user_id: DEFAULT_USER_ID,
    customer_id: 'cust-102',
    category: 'Travel & Lodging',
    amount: 18500,
    expense_date: '2026-03-22',
    payment_method: 'Bank Transfer',
    description: 'Flight and Hotel for Client Onsite Tech Architecture Review in Bengaluru',
    receipt_url: '/receipts/indigo-hotel-bengaluru.pdf',
    is_billable: true,
    status: 'recorded',
    gst_amount: 2822.03,
    created_at: '2026-03-22T17:00:00Z',
  },
  {
    id: 'exp-003',
    user_id: DEFAULT_USER_ID,
    customer_id: null,
    category: 'Office Supplies',
    amount: 4650,
    expense_date: '2026-04-02',
    payment_method: 'UPI',
    description: 'Ergonomic accessories & stationery supplies for development bay',
    receipt_url: null,
    is_billable: false,
    status: 'recorded',
    gst_amount: 709.32,
    created_at: '2026-04-02T13:20:00Z',
  },
];

const INITIAL_BILL_DUP_CHECKS: BillDuplicateCheck[] = [
  {
    id: 'dup-1',
    user_id: DEFAULT_USER_ID,
    supplier_id: 'supp-201',
    bill_number: 'AWS-IN-98214',
    bill_date: '2026-03-05',
    total_amount: 75520,
    file_hash: '3f6c8d19e0b1f3c5a6b8d9e2f4a1c7b5',
    purchase_bill_id: 'pb-101',
    detected_at: '2026-03-05T12:00:00Z',
  },
  {
    id: 'dup-2',
    user_id: DEFAULT_USER_ID,
    supplier_id: 'supp-203',
    bill_number: 'WW-MUM-2026-048',
    bill_date: '2026-03-28',
    total_amount: 100300,
    file_hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d',
    purchase_bill_id: 'pb-102',
    detected_at: '2026-03-28T14:30:00Z',
  },
];

const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po-101',
    user_id: DEFAULT_USER_ID,
    supplier_id: 'supp-201',
    po_number: 'PO-2026-089',
    po_date: '2026-03-01',
    delivery_date: '2026-03-05',
    taxable_amount: 64000,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 11520,
    total_tax: 11520,
    total_amount: 75520,
    status: 'billed',
    matched_purchase_bill_id: 'pb-101',
    notes: 'Q1 Cloud Hosting & Data Compute Reserve',
    created_at: '2026-03-01T09:00:00Z',
  },
  {
    id: 'po-102',
    user_id: DEFAULT_USER_ID,
    supplier_id: 'supp-202',
    po_number: 'PO-2026-092',
    po_date: '2026-04-08',
    delivery_date: '2026-04-15',
    taxable_amount: 195000,
    cgst_amount: 17550,
    sgst_amount: 17550,
    igst_amount: 0,
    total_tax: 35100,
    total_amount: 230100,
    status: 'issued',
    notes: 'High-Performance Workstation Deployment for Engineering Core',
    created_at: '2026-04-08T10:00:00Z',
  },
];

const INITIAL_PURCHASE_ORDER_ITEMS: PurchaseOrderItem[] = [
  {
    id: 'poi-001',
    purchase_order_id: 'po-101',
    description: 'AWS EC2 + S3 Storage Cloud Infrastructure',
    hsn_sac: '998315',
    quantity: 1,
    unit: 'NOS',
    unit_price: 64000,
    taxable_value: 64000,
    gst_rate: 18,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 11520,
    total_amount: 75520,
    created_at: '2026-03-01T09:00:00Z',
  },
  {
    id: 'poi-002',
    purchase_order_id: 'po-102',
    description: 'Apple MacBook Pro 16-inch M3 Max (36GB RAM, 1TB SSD)',
    hsn_sac: '84713010',
    quantity: 1,
    unit: 'NOS',
    unit_price: 195000,
    taxable_value: 195000,
    gst_rate: 18,
    cgst_amount: 17550,
    sgst_amount: 17550,
    igst_amount: 0,
    total_amount: 230100,
    created_at: '2026-04-08T10:00:00Z',
  },
];

const INITIAL_PAYMENTS: PaymentRecord[] = [
  {
    id: 'pay-001',
    user_id: DEFAULT_USER_ID,
    payment_date: '2026-03-12',
    type: 'inflow',
    amount: 212400,
    counterparty_name: 'Reliance Retail Ventures Ltd',
    counterparty_type: 'customer',
    counterparty_id: 'cust-101',
    invoice_id: 'inv-001',
    reference_number: 'HDFCR520260312009214',
    payment_method: 'NEFT/RTGS',
    status: 'reconciled',
    notes: 'Invoice APX-2026-001 settlement',
    created_at: '2026-03-12T16:00:00Z',
  },
  {
    id: 'pay-002',
    user_id: DEFAULT_USER_ID,
    payment_date: '2026-03-15',
    type: 'outflow',
    amount: 75520,
    counterparty_name: 'Amazon Web Services India Pvt Ltd',
    counterparty_type: 'supplier',
    counterparty_id: 'supp-201',
    purchase_bill_id: 'pb-101',
    reference_number: 'HDFCP920260315772184',
    payment_method: 'Corporate Card',
    status: 'reconciled',
    notes: 'Payment for Bill AWS-IN-98214',
    created_at: '2026-03-15T11:00:00Z',
  },
];

const INITIAL_DOCUMENTS: StoredDocument[] = [
  {
    id: 'doc-001',
    user_id: DEFAULT_USER_ID,
    filename: 'Vendor_Invoice_Croma_MacBook_Pro.pdf',
    file_type: 'application/pdf',
    file_size: 245890,
    file_hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
    file_url: '/uploads/Vendor_Invoice_Croma_MacBook_Pro.pdf',
    document_type: 'purchase_bill',
    status: 'review_required',
    created_at: '2026-04-10T14:20:00Z',
  },
  {
    id: 'doc-002',
    user_id: DEFAULT_USER_ID,
    filename: 'Client_PO_Infosys_BPM_Consulting.pdf',
    file_type: 'application/pdf',
    file_size: 198450,
    file_hash: 'f9e8d7c6b5a43210f9e8d7c6b5a43210',
    file_url: '/uploads/Client_PO_Infosys_BPM_Consulting.pdf',
    document_type: 'sales_invoice',
    status: 'approved',
    created_at: '2026-04-12T16:45:00Z',
  },
];

const INITIAL_EXTRACTIONS: DocumentExtraction[] = [
  {
    id: 'ext-001',
    document_id: 'doc-001',
    user_id: DEFAULT_USER_ID,
    document_type: 'purchase_bill',
    confidence_score: 84.5, // Needs review because < 85%
    party_name: 'Infiniti Retail Ltd (Croma Enterprise)',
    party_gstin: '27AABCI4809Q1ZM',
    party_type: 'supplier',
    matched_party_id: 'supp-202',
    invoice_number: 'CROMA-CORP-4891',
    invoice_date: '2026-04-09',
    due_date: '2026-04-24',
    subtotal: 195000,
    taxable_amount: 195000,
    cgst_amount: 17550,
    sgst_amount: 17550,
    igst_amount: 0,
    total_amount: 230100,
    items: [
      {
        description: 'Apple MacBook Pro 16-inch M3 Max (36GB RAM, 1TB SSD)',
        hsn_sac: '84713010',
        quantity: 1,
        unit: 'NOS',
        unit_price: 195000,
        taxable_value: 195000,
        gst_rate: 18,
        cgst_amount: 17550,
        sgst_amount: 17550,
        igst_amount: 0,
        total_amount: 230100,
      },
    ],
    validation_flags: [
      'Confidence score 84.5% is below high-certainty 85% threshold',
      'HSN 84713010 verified for computer hardware',
      'Calculated tax matches bill gross total exactly',
    ],
    is_duplicate: false,
    duplicate_of_id: null,
    status: 'pending_review',
    posted_record_type: null,
    posted_record_id: null,
    created_at: '2026-04-10T14:21:00Z',
  },
];

const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'ai_review_required',
    title: 'New Document Requires Review',
    description: 'Vendor bill CROMA-CORP-4891 extracted with 84.5% confidence. Review required before posting.',
    amount: 230100,
    date: '2026-04-10T14:21:00Z',
    status: 'pending_review',
  },
  {
    id: 'act-2',
    type: 'invoice_created',
    title: 'Sales Invoice APX-2026-003 Generated',
    description: 'Sent to Zomato Operations Hub for ₹1,47,500.00 (Due: 16 Apr 2026)',
    amount: 147500,
    date: '2026-04-01T09:30:00Z',
    status: 'sent',
  },
  {
    id: 'act-3',
    type: 'bill_processed',
    title: 'Purchase Bill WW-MUM-2026-048 Approved',
    description: 'WeWork India Spaces bill recorded for ₹1,00,300.00',
    amount: 100300,
    date: '2026-03-28T14:30:00Z',
    status: 'unpaid',
  },
  {
    id: 'act-4',
    type: 'payment_received',
    title: 'Payment Received from Reliance Retail',
    description: 'Invoice APX-2026-001 fully settled via NEFT/HDFC Bank',
    amount: 212400,
    date: '2026-03-12T16:00:00Z',
    status: 'paid',
  },
];

class DatabaseManager {
  private data: DatabaseStore;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseStore {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.purchase_orders) parsed.purchase_orders = INITIAL_PURCHASE_ORDERS;
        if (!parsed.purchase_order_items) parsed.purchase_order_items = INITIAL_PURCHASE_ORDER_ITEMS;
        if (!parsed.payments) parsed.payments = INITIAL_PAYMENTS;
        return parsed;
      }
    } catch (e) {
      console.warn('Could not read existing db file, initializing with seeds:', e);
    }

    const initial: DatabaseStore = {
      profile: INITIAL_PROFILE,
      customers: INITIAL_CUSTOMERS,
      suppliers: INITIAL_SUPPLIERS,
      invoices: INITIAL_INVOICES,
      invoice_items: INITIAL_INVOICE_ITEMS,
      purchase_bills: INITIAL_PURCHASE_BILLS,
      purchase_bill_items: INITIAL_PURCHASE_BILL_ITEMS,
      bill_duplicate_checks: INITIAL_BILL_DUP_CHECKS,
      expenses: INITIAL_EXPENSES,
      purchase_orders: INITIAL_PURCHASE_ORDERS,
      purchase_order_items: INITIAL_PURCHASE_ORDER_ITEMS,
      payments: INITIAL_PAYMENTS,
      stored_documents: INITIAL_DOCUMENTS,
      document_extractions: INITIAL_EXTRACTIONS,
      activities: INITIAL_ACTIVITIES,
    };

    this.saveData(initial);
    return initial;
  }

  private saveData(data: DatabaseStore) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save db data:', e);
    }
  }

  private persist() {
    this.saveData(this.data);
  }

  // Profile
  getProfile(): BusinessProfile {
    return this.data.profile;
  }

  updateProfile(updates: Partial<BusinessProfile>): BusinessProfile {
    this.data.profile = {
      ...this.data.profile,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.data.profile;
  }

  // Customers
  getCustomers(): Customer[] {
    return [...this.data.customers].sort((a, b) => a.name.localeCompare(b.name));
  }

  getCustomerById(id: string): Customer | undefined {
    return this.data.customers.find((c) => c.id === id);
  }

  createCustomer(payload: Omit<Customer, 'id' | 'user_id' | 'created_at'>): Customer {
    const customer: Customer = {
      id: `cust-${Date.now()}`,
      user_id: DEFAULT_USER_ID,
      ...payload,
      created_at: new Date().toISOString(),
    };
    this.data.customers.push(customer);
    this.persist();
    return customer;
  }

  updateCustomer(id: string, payload: Partial<Customer>): Customer | null {
    const index = this.data.customers.findIndex((c) => c.id === id);
    if (index === -1) return null;
    this.data.customers[index] = {
      ...this.data.customers[index],
      ...payload,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.data.customers[index];
  }

  deleteCustomer(id: string): boolean {
    const hasInvoices = this.data.invoices.some((inv) => inv.customer_id === id);
    if (hasInvoices) {
      throw new Error('Cannot delete customer with existing sales invoices.');
    }
    this.data.customers = this.data.customers.filter((c) => c.id !== id);
    this.persist();
    return true;
  }

  // Suppliers (strictly suppliers table)
  getSuppliers(): Supplier[] {
    return [...this.data.suppliers].sort((a, b) => a.name.localeCompare(b.name));
  }

  getSupplierById(id: string): Supplier | undefined {
    return this.data.suppliers.find((s) => s.id === id);
  }

  createSupplier(payload: Omit<Supplier, 'id' | 'user_id' | 'created_at'>): Supplier {
    const supplier: Supplier = {
      id: `supp-${Date.now()}`,
      user_id: DEFAULT_USER_ID,
      ...payload,
      created_at: new Date().toISOString(),
    };
    this.data.suppliers.push(supplier);
    this.persist();
    return supplier;
  }

  updateSupplier(id: string, payload: Partial<Supplier>): Supplier | null {
    const index = this.data.suppliers.findIndex((s) => s.id === id);
    if (index === -1) return null;
    this.data.suppliers[index] = {
      ...this.data.suppliers[index],
      ...payload,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.data.suppliers[index];
  }

  deleteSupplier(id: string): boolean {
    const hasBills = this.data.purchase_bills.some((pb) => pb.supplier_id === id);
    if (hasBills) {
      throw new Error('Cannot delete supplier with existing purchase bills.');
    }
    this.data.suppliers = this.data.suppliers.filter((s) => s.id !== id);
    this.persist();
    return true;
  }

  // Invoices (Sales)
  getInvoices(): Invoice[] {
    return this.data.invoices.map((inv) => {
      const customer = this.getCustomerById(inv.customer_id);
      const items = this.data.invoice_items.filter((it) => it.invoice_id === inv.id);
      return {
        ...inv,
        customer,
        items,
      };
    }).sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime());
  }

  getInvoiceById(id: string): Invoice | null {
    const inv = this.data.invoices.find((i) => i.id === id);
    if (!inv) return null;
    const customer = this.getCustomerById(inv.customer_id);
    const items = this.data.invoice_items.filter((it) => it.invoice_id === inv.id);
    return {
      ...inv,
      customer,
      items,
    };
  }

  createInvoiceWithItems(
    invoiceData: Omit<Invoice, 'id' | 'user_id' | 'created_at' | 'customer' | 'items'>,
    itemsData: Array<Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at'>>
  ): Invoice {
    const customer = this.getCustomerById(invoiceData.customer_id);
    if (!customer) {
      throw new Error(`Customer with ID ${invoiceData.customer_id} not found.`);
    }

    // Check duplicate invoice number
    const existing = this.data.invoices.find((i) => i.invoice_number.trim().toLowerCase() === invoiceData.invoice_number.trim().toLowerCase());
    if (existing) {
      throw new Error(`Invoice number '${invoiceData.invoice_number}' already exists.`);
    }

    const isInterState = isInterStateTransaction(this.data.profile.state_code, customer.state_code);

    const invoiceId = `inv-${Date.now()}`;
    let subtotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const createdItems: InvoiceItem[] = itemsData.map((item, index) => {
      const lineTax = calculateItemTax(item.taxable_value, item.gst_rate, isInterState);
      subtotal += lineTax.taxableValue;
      cgstTotal += lineTax.cgstAmount;
      sgstTotal += lineTax.sgstAmount;
      igstTotal += lineTax.igstAmount;

      return {
        id: `item-${Date.now()}-${index}`,
        invoice_id: invoiceId,
        description: item.description,
        hsn_sac: item.hsn_sac || '',
        quantity: item.quantity,
        unit: item.unit || 'NOS',
        unit_price: item.unit_price,
        discount_percent: item.discount_percent || 0,
        taxable_value: lineTax.taxableValue,
        gst_rate: item.gst_rate,
        cgst_rate: lineTax.cgstRate,
        cgst_amount: lineTax.cgstAmount,
        sgst_rate: lineTax.sgstRate,
        sgst_amount: lineTax.sgstAmount,
        igst_rate: lineTax.igstRate,
        igst_amount: lineTax.igstAmount,
        total_amount: lineTax.totalAmount,
        created_at: new Date().toISOString(),
      };
    });

    const totalTax = cgstTotal + sgstTotal + igstTotal;
    const totalAmount = subtotal + totalTax - (invoiceData.discount_amount || 0);

    const newInvoice: Invoice = {
      ...invoiceData,
      id: invoiceId,
      user_id: DEFAULT_USER_ID,
      subtotal: Math.round(subtotal * 100) / 100,
      taxable_amount: Math.round(subtotal * 100) / 100,
      cgst_amount: Math.round(cgstTotal * 100) / 100,
      sgst_amount: Math.round(sgstTotal * 100) / 100,
      igst_amount: Math.round(igstTotal * 100) / 100,
      total_tax: Math.round(totalTax * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100,
      amount_paid: invoiceData.amount_paid || 0,
      is_interstate: isInterState,
      created_at: new Date().toISOString(),
    };

    this.data.invoices.push(newInvoice);
    this.data.invoice_items.push(...createdItems);

    this.addActivity({
      id: `act-${Date.now()}`,
      type: 'invoice_created',
      title: `Sales Invoice ${newInvoice.invoice_number} Created`,
      description: `Billed to ${customer.company_name || customer.name} for ₹${newInvoice.total_amount.toLocaleString('en-IN')}`,
      amount: newInvoice.total_amount,
      date: newInvoice.created_at,
      status: newInvoice.status,
    });

    this.persist();
    return {
      ...newInvoice,
      customer,
      items: createdItems,
    };
  }

  recordInvoicePayment(invoiceId: string, amount: number, paymentDate: string, notes?: string): Invoice {
    const inv = this.data.invoices.find((i) => i.id === invoiceId);
    if (!inv) throw new Error('Invoice not found');

    const newAmountPaid = (inv.amount_paid || 0) + amount;
    const isFullyPaid = newAmountPaid >= inv.total_amount;

    inv.amount_paid = newAmountPaid;
    inv.status = isFullyPaid ? 'paid' : 'partially_paid';
    inv.updated_at = new Date().toISOString();

    const customer = this.getCustomerById(inv.customer_id);

    this.addActivity({
      id: `act-${Date.now()}`,
      type: 'payment_received',
      title: `Payment Received for ${inv.invoice_number}`,
      description: `Received ₹${amount.toLocaleString('en-IN')} from ${customer?.name || 'Customer'}. (Status: ${inv.status})`,
      amount,
      date: paymentDate || new Date().toISOString(),
      status: inv.status,
    });

    this.persist();
    return this.getInvoiceById(invoiceId)!;
  }

  deleteInvoice(id: string): boolean {
    this.data.invoices = this.data.invoices.filter((i) => i.id !== id);
    this.data.invoice_items = this.data.invoice_items.filter((it) => it.invoice_id !== id);
    this.persist();
    return true;
  }

  // Purchase Bills
  getPurchaseBills(): PurchaseBill[] {
    return this.data.purchase_bills.map((pb) => {
      const supplier = this.getSupplierById(pb.supplier_id);
      const items = this.data.purchase_bill_items.filter((it) => it.purchase_bill_id === pb.id);
      return {
        ...pb,
        supplier,
        items,
      };
    }).sort((a, b) => new Date(b.bill_date).getTime() - new Date(a.bill_date).getTime());
  }

  getPurchaseBillById(id: string): PurchaseBill | null {
    const pb = this.data.purchase_bills.find((b) => b.id === id);
    if (!pb) return null;
    const supplier = this.getSupplierById(pb.supplier_id);
    const items = this.data.purchase_bill_items.filter((it) => it.purchase_bill_id === pb.id);
    return {
      ...pb,
      supplier,
      items,
    };
  }

  checkDuplicateBill(supplierId: string, billNumber: string, billDate?: string, fileHash?: string): {
    isDuplicate: boolean;
    existingBill?: PurchaseBill;
    reason?: string;
  } {
    // 1. Hash duplicate check
    if (fileHash) {
      const dupByHash = this.data.bill_duplicate_checks.find((d) => d.file_hash === fileHash);
      if (dupByHash && dupByHash.purchase_bill_id) {
        const bill = this.getPurchaseBillById(dupByHash.purchase_bill_id);
        if (bill) {
          return {
            isDuplicate: true,
            existingBill: bill,
            reason: `Exact identical document file hash matched previously recorded Bill ${bill.bill_number}.`,
          };
        }
      }
    }

    // 2. Supplier + Bill Number check
    const existing = this.data.purchase_bills.find(
      (b) => b.supplier_id === supplierId && b.bill_number.trim().toLowerCase() === billNumber.trim().toLowerCase()
    );

    if (existing) {
      return {
        isDuplicate: true,
        existingBill: this.getPurchaseBillById(existing.id) || undefined,
        reason: `Supplier already has an existing bill with number '${billNumber}' dated ${existing.bill_date}.`,
      };
    }

    return { isDuplicate: false };
  }

  createPurchaseBillWithItems(
    billData: Omit<PurchaseBill, 'id' | 'user_id' | 'created_at' | 'supplier' | 'items'>,
    itemsData: Array<Omit<PurchaseBillItem, 'id' | 'purchase_bill_id' | 'created_at'>>,
    fileHash?: string
  ): PurchaseBill {
    const supplier = this.getSupplierById(billData.supplier_id);
    if (!supplier) {
      throw new Error(`Supplier with ID ${billData.supplier_id} not found.`);
    }

    // Check duplicate
    const dupCheck = this.checkDuplicateBill(billData.supplier_id, billData.bill_number, billData.bill_date, fileHash);
    if (dupCheck.isDuplicate) {
      throw new Error(`Duplicate bill detected: ${dupCheck.reason}`);
    }

    const billId = `pb-${Date.now()}`;
    const createdItems: PurchaseBillItem[] = itemsData.map((item, index) => ({
      id: `pbi-${Date.now()}-${index}`,
      purchase_bill_id: billId,
      description: item.description,
      hsn_sac: item.hsn_sac || '',
      quantity: item.quantity,
      unit: item.unit || 'NOS',
      unit_price: item.unit_price,
      taxable_value: item.taxable_value,
      gst_rate: item.gst_rate,
      cgst_amount: item.cgst_amount,
      sgst_amount: item.sgst_amount,
      igst_amount: item.igst_amount,
      total_amount: item.total_amount,
      created_at: new Date().toISOString(),
    }));

    const newBill: PurchaseBill = {
      ...billData,
      id: billId,
      user_id: DEFAULT_USER_ID,
      created_at: new Date().toISOString(),
    };

    this.data.purchase_bills.push(newBill);
    this.data.purchase_bill_items.push(...createdItems);

    // Register duplicate check record
    this.data.bill_duplicate_checks.push({
      id: `dup-${Date.now()}`,
      user_id: DEFAULT_USER_ID,
      supplier_id: supplier.id,
      bill_number: newBill.bill_number,
      bill_date: newBill.bill_date,
      total_amount: newBill.total_amount,
      file_hash: fileHash,
      purchase_bill_id: billId,
      detected_at: new Date().toISOString(),
    });

    this.addActivity({
      id: `act-${Date.now()}`,
      type: 'bill_processed',
      title: `Purchase Bill ${newBill.bill_number} Recorded`,
      description: `From supplier ${supplier.name} for ₹${newBill.total_amount.toLocaleString('en-IN')}`,
      amount: newBill.total_amount,
      date: newBill.created_at,
      status: newBill.status,
    });

    this.persist();
    return {
      ...newBill,
      supplier,
      items: createdItems,
    };
  }

  recordPurchaseBillPayment(billId: string, amount: number): PurchaseBill {
    const pb = this.data.purchase_bills.find((b) => b.id === billId);
    if (!pb) throw new Error('Purchase bill not found');

    const newAmountPaid = (pb.amount_paid || 0) + amount;
    pb.amount_paid = newAmountPaid;
    pb.status = newAmountPaid >= pb.total_amount ? 'paid' : 'unpaid';
    pb.updated_at = new Date().toISOString();

    this.persist();
    return this.getPurchaseBillById(billId)!;
  }

  deletePurchaseBill(id: string): boolean {
    this.data.purchase_bills = this.data.purchase_bills.filter((b) => b.id !== id);
    this.data.purchase_bill_items = this.data.purchase_bill_items.filter((it) => it.purchase_bill_id !== id);
    this.data.bill_duplicate_checks = this.data.bill_duplicate_checks.filter((d) => d.purchase_bill_id !== id);
    this.persist();
    return true;
  }

  // Expenses
  getExpenses(): Expense[] {
    return this.data.expenses.map((e) => ({
      ...e,
      customer: e.customer_id ? this.getCustomerById(e.customer_id) : undefined,
    })).sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
  }

  createExpense(payload: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'customer'>): Expense {
    const exp: Expense = {
      id: `exp-${Date.now()}`,
      user_id: DEFAULT_USER_ID,
      ...payload,
      created_at: new Date().toISOString(),
    };
    this.data.expenses.push(exp);

    this.addActivity({
      id: `act-${Date.now()}`,
      type: 'expense_added',
      title: `Expense Logged: ${exp.category}`,
      description: `${exp.description} - ₹${exp.amount.toLocaleString('en-IN')}`,
      amount: exp.amount,
      date: exp.created_at,
      status: exp.status,
    });

    this.persist();
    return {
      ...exp,
      customer: exp.customer_id ? this.getCustomerById(exp.customer_id) : undefined,
    };
  }

  deleteExpense(id: string): boolean {
    this.data.expenses = this.data.expenses.filter((e) => e.id !== id);
    this.persist();
    return true;
  }

  // Stored Documents & Extractions
  getStoredDocuments(): StoredDocument[] {
    return [...this.data.stored_documents].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  createStoredDocument(payload: Omit<StoredDocument, 'id' | 'user_id' | 'created_at'>): StoredDocument {
    const doc: StoredDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: DEFAULT_USER_ID,
      ...payload,
      created_at: new Date().toISOString(),
    };
    this.data.stored_documents.push(doc);
    this.persist();
    return doc;
  }

  getExtractions(): DocumentExtraction[] {
    return this.data.document_extractions.map((ext) => {
      const doc = this.data.stored_documents.find((d) => d.id === ext.document_id);
      return {
        ...ext,
        document: doc,
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getExtractionById(id: string): DocumentExtraction | null {
    const ext = this.data.document_extractions.find((e) => e.id === id);
    if (!ext) return null;
    const doc = this.data.stored_documents.find((d) => d.id === ext.document_id);
    return { ...ext, document: doc };
  }

  createExtraction(payload: Omit<DocumentExtraction, 'id' | 'user_id' | 'created_at' | 'document'>): DocumentExtraction {
    const ext: DocumentExtraction = {
      id: `ext-${Date.now()}`,
      user_id: DEFAULT_USER_ID,
      ...payload,
      created_at: new Date().toISOString(),
    };
    this.data.document_extractions.push(ext);

    // Update parent doc status
    const doc = this.data.stored_documents.find((d) => d.id === payload.document_id);
    if (doc) {
      doc.status = payload.confidence_score >= 85 ? 'extracted' : 'review_required';
      doc.document_type = payload.document_type;
    }

    if (payload.confidence_score < 85) {
      this.addActivity({
        id: `act-${Date.now()}`,
        type: 'ai_review_required',
        title: 'Document Pending Review',
        description: `${payload.party_name || 'Document'} extracted with ${payload.confidence_score.toFixed(1)}% confidence score.`,
        amount: payload.total_amount,
        date: ext.created_at,
        status: 'pending_review',
      });
    }

    this.persist();
    return ext;
  }

  updateExtraction(id: string, updates: Partial<DocumentExtraction>): DocumentExtraction | null {
    const idx = this.data.document_extractions.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    this.data.document_extractions[idx] = {
      ...this.data.document_extractions[idx],
      ...updates,
    };
    this.persist();
    return this.getExtractionById(id);
  }

  postExtractionToLedger(
    extractionId: string,
    postingOverrides?: Partial<DocumentExtraction>
  ): { success: boolean; recordType: string; recordId: string; message: string } {
    const ext = this.getExtractionById(extractionId);
    if (!ext) throw new Error('Extraction not found.');
    if (ext.status === 'posted') throw new Error('Extraction has already been posted to financial ledger.');

    // Merge any reviewer modifications
    const finalData = { ...ext, ...postingOverrides };

    if (finalData.document_type === 'purchase_bill') {
      // Must post to suppliers and purchase_bills
      let supplierId = finalData.matched_party_id;
      if (!supplierId && finalData.party_name) {
        // Find existing supplier by GSTIN or name
        const existingSupp = this.data.suppliers.find(
          (s) => (finalData.party_gstin && s.gstin === finalData.party_gstin) ||
                 s.name.toLowerCase() === finalData.party_name!.toLowerCase()
        );
        if (existingSupp) {
          supplierId = existingSupp.id;
        } else {
          // Auto create supplier
          const suppState = finalData.party_gstin ? finalData.party_gstin.substring(0, 2) : '27';
          const newSupp = this.createSupplier({
            name: finalData.party_name,
            company_name: finalData.party_name,
            email: 'finance@' + finalData.party_name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com',
            gstin: finalData.party_gstin,
            state: 'Maharashtra',
            state_code: suppState,
            category: 'AI Ingested Vendor',
          });
          supplierId = newSupp.id;
        }
      }

      if (!supplierId) {
        throw new Error('A supplier must be resolved before posting purchase bill.');
      }

      const bill = this.createPurchaseBillWithItems(
        {
          supplier_id: supplierId,
          bill_number: finalData.invoice_number || `PB-${Date.now().toString().slice(-6)}`,
          bill_date: finalData.invoice_date || new Date().toISOString().split('T')[0],
          due_date: finalData.due_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
          taxable_amount: finalData.taxable_amount || finalData.subtotal,
          cgst_amount: finalData.cgst_amount || 0,
          sgst_amount: finalData.sgst_amount || 0,
          igst_amount: finalData.igst_amount || 0,
          total_tax: (finalData.cgst_amount || 0) + (finalData.sgst_amount || 0) + (finalData.igst_amount || 0),
          total_amount: finalData.total_amount,
          amount_paid: 0,
          status: 'unpaid',
          category: 'Procurement',
          document_url: finalData.document?.file_url,
          document_id: finalData.document_id,
          notes: `Ingested via AI document extraction. Confidence: ${finalData.confidence_score}%`,
        },
        finalData.items.map((it) => ({
          description: it.description,
          hsn_sac: it.hsn_sac,
          quantity: it.quantity,
          unit: it.unit || 'NOS',
          unit_price: it.unit_price,
          taxable_value: it.taxable_value,
          gst_rate: it.gst_rate,
          cgst_amount: it.cgst_amount,
          sgst_amount: it.sgst_amount,
          igst_amount: it.igst_amount,
          total_amount: it.total_amount,
        })),
        finalData.document?.file_hash
      );

      // Mark extraction as posted
      this.updateExtraction(extractionId, {
        status: 'posted',
        posted_record_type: 'purchase_bill',
        posted_record_id: bill.id,
      });

      // Update parent document
      const doc = this.data.stored_documents.find((d) => d.id === finalData.document_id);
      if (doc) doc.status = 'posted';
      this.persist();

      return {
        success: true,
        recordType: 'purchase_bill',
        recordId: bill.id,
        message: `Successfully posted Purchase Bill ${bill.bill_number} to ledger!`,
      };
    } else if (finalData.document_type === 'sales_invoice') {
      // Must post to customers and invoices
      let customerId = finalData.matched_party_id;
      if (!customerId && finalData.party_name) {
        const existingCust = this.data.customers.find(
          (c) => (finalData.party_gstin && c.gstin === finalData.party_gstin) ||
                 c.name.toLowerCase() === finalData.party_name!.toLowerCase()
        );
        if (existingCust) {
          customerId = existingCust.id;
        } else {
          const custState = finalData.party_gstin ? finalData.party_gstin.substring(0, 2) : '27';
          const newCust = this.createCustomer({
            name: finalData.party_name,
            company_name: finalData.party_name,
            email: 'billing@' + finalData.party_name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com',
            gstin: finalData.party_gstin,
            state: 'Maharashtra',
            state_code: custState,
          });
          customerId = newCust.id;
        }
      }

      if (!customerId) {
        throw new Error('A customer must be resolved before posting sales invoice.');
      }

      const inv = this.createInvoiceWithItems(
        {
          customer_id: customerId,
          invoice_number: finalData.invoice_number || `INV-${Date.now().toString().slice(-6)}`,
          issue_date: finalData.invoice_date || new Date().toISOString().split('T')[0],
          due_date: finalData.due_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
          subtotal: finalData.subtotal,
          taxable_amount: finalData.taxable_amount,
          cgst_amount: finalData.cgst_amount,
          sgst_amount: finalData.sgst_amount,
          igst_amount: finalData.igst_amount,
          total_tax: (finalData.cgst_amount || 0) + (finalData.sgst_amount || 0) + (finalData.igst_amount || 0),
          discount_amount: 0,
          total_amount: finalData.total_amount,
          amount_paid: 0,
          status: 'unpaid',
          payment_terms: 'Net 15 Days',
          is_interstate: finalData.igst_amount > 0,
          notes: 'Auto-posted from verified AI document extraction.',
        },
        finalData.items.map((it) => ({
          description: it.description,
          hsn_sac: it.hsn_sac,
          quantity: it.quantity,
          unit: it.unit || 'NOS',
          unit_price: it.unit_price,
          discount_percent: 0,
          taxable_value: it.taxable_value,
          gst_rate: it.gst_rate,
          cgst_rate: it.gst_rate / 2,
          cgst_amount: it.cgst_amount,
          sgst_rate: it.gst_rate / 2,
          sgst_amount: it.sgst_amount,
          igst_rate: it.igst_amount > 0 ? it.gst_rate : 0,
          igst_amount: it.igst_amount,
          total_amount: it.total_amount,
        }))
      );

      this.updateExtraction(extractionId, {
        status: 'posted',
        posted_record_type: 'invoice',
        posted_record_id: inv.id,
      });

      const doc = this.data.stored_documents.find((d) => d.id === finalData.document_id);
      if (doc) doc.status = 'posted';
      this.persist();

      return {
        success: true,
        recordType: 'invoice',
        recordId: inv.id,
        message: `Successfully posted Sales Invoice ${inv.invoice_number} to ledger!`,
      };
    } else {
      // Expense receipt
      const exp = this.createExpense({
        category: 'Operating Expense',
        amount: finalData.total_amount,
        expense_date: finalData.invoice_date || new Date().toISOString().split('T')[0],
        payment_method: 'Corporate Card',
        description: `Receipt from ${finalData.party_name || 'Vendor'} (#${finalData.invoice_number || 'N/A'})`,
        receipt_url: finalData.document?.file_url || null,
        is_billable: false,
        status: 'recorded',
        gst_amount: (finalData.cgst_amount || 0) + (finalData.sgst_amount || 0) + (finalData.igst_amount || 0),
      });

      this.updateExtraction(extractionId, {
        status: 'posted',
        posted_record_type: 'expense',
        posted_record_id: exp.id,
      });

      const doc = this.data.stored_documents.find((d) => d.id === finalData.document_id);
      if (doc) doc.status = 'posted';
      this.persist();

      return {
        success: true,
        recordType: 'expense',
        recordId: exp.id,
        message: `Successfully posted Expense of ₹${exp.amount.toLocaleString('en-IN')} to ledger!`,
      };
    }
  }

  // Activities
  addActivity(act: ActivityItem) {
    this.data.activities.unshift(act);
    if (this.data.activities.length > 50) {
      this.data.activities = this.data.activities.slice(0, 50);
    }
  }

  getActivities(): ActivityItem[] {
    return this.data.activities;
  }

  // Dashboard Stats
  getDashboardStats(): DashboardStats {
    const totalRevenue = this.data.invoices
      .filter((i) => i.status !== 'draft')
      .reduce((sum, i) => sum + i.total_amount, 0);

    const totalPurchases = this.data.purchase_bills.reduce((sum, pb) => sum + pb.total_amount, 0);
    const totalExpenses = this.data.expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - (totalPurchases + totalExpenses);

    const unpaidInvoices = this.data.invoices.filter((i) => i.status === 'unpaid' || i.status === 'sent' || i.status === 'partially_paid');
    const paidInvoices = this.data.invoices.filter((i) => i.status === 'paid');
    const overdueInvoices = this.data.invoices.filter((i) => {
      if (i.status === 'paid') return false;
      return new Date(i.due_date).getTime() < Date.now();
    });

    const outstandingReceivables = unpaidInvoices.reduce((sum, i) => sum + (i.total_amount - (i.amount_paid || 0)), 0);

    const unpaidBills = this.data.purchase_bills.filter((b) => b.status === 'unpaid');
    const totalPayables = unpaidBills.reduce((sum, b) => sum + (b.total_amount - (b.amount_paid || 0)), 0);

    const pendingReviewsCount = this.data.document_extractions.filter((e) => e.status === 'pending_review').length;

    // Output GST from Sales
    const outputGst = this.data.invoices
      .filter((i) => i.status !== 'draft')
      .reduce((sum, i) => sum + i.total_tax, 0);

    // Input GST Credit from Purchases
    const inputGstCredit = this.data.purchase_bills.reduce((sum, b) => sum + b.total_tax, 0);
    const netGstPayable = Math.max(0, outputGst - inputGstCredit);

    return {
      totalRevenue,
      totalPurchases,
      totalExpenses,
      netProfit,
      outstandingReceivables,
      unpaidInvoicesCount: unpaidInvoices.length,
      paidInvoicesCount: paidInvoices.length,
      overdueInvoicesCount: overdueInvoices.length,
      totalPayables,
      unpaidBillsCount: unpaidBills.length,
      pendingReviewsCount,
      outputGst,
      inputGstCredit,
      netGstPayable,
      recentActivity: this.data.activities.slice(0, 8),
    };
  }

  // GST Summaries & Reporting
  getGSTSummary(): GSTSummary {
    const validInvoices = this.data.invoices.filter((i) => i.status !== 'draft');

    const outputGst = {
      taxableValue: validInvoices.reduce((s, i) => s + i.taxable_amount, 0),
      cgst: validInvoices.reduce((s, i) => s + i.cgst_amount, 0),
      sgst: validInvoices.reduce((s, i) => s + i.sgst_amount, 0),
      igst: validInvoices.reduce((s, i) => s + i.igst_amount, 0),
      totalTax: validInvoices.reduce((s, i) => s + i.total_tax, 0),
    };

    const inputTaxCredit = {
      taxableValue: this.data.purchase_bills.reduce((s, b) => s + b.taxable_amount, 0),
      cgst: this.data.purchase_bills.reduce((s, b) => s + b.cgst_amount, 0),
      sgst: this.data.purchase_bills.reduce((s, b) => s + b.sgst_amount, 0),
      igst: this.data.purchase_bills.reduce((s, b) => s + b.igst_amount, 0),
      totalTax: this.data.purchase_bills.reduce((s, b) => s + b.total_tax, 0),
    };

    const netTaxPayable = Math.max(0, outputGst.totalTax - inputTaxCredit.totalTax);

    // HSN aggregation
    const hsnMap = new Map<string, { hsn_sac: string; description: string; totalQty: number; totalTaxable: number; gstRate: number; totalTax: number }>();

    for (const item of this.data.invoice_items) {
      const code = item.hsn_sac || 'OTHER';
      const existing = hsnMap.get(code) || {
        hsn_sac: code,
        description: item.description,
        totalQty: 0,
        totalTaxable: 0,
        gstRate: item.gst_rate,
        totalTax: 0,
      };
      existing.totalQty += item.quantity;
      existing.totalTaxable += item.taxable_value;
      existing.totalTax += (item.cgst_amount + item.sgst_amount + item.igst_amount);
      hsnMap.set(code, existing);
    }

    return {
      outputGst,
      inputTaxCredit,
      netTaxPayable,
      hsnSummary: Array.from(hsnMap.values()),
    };
  }

  // ==========================================
  // Purchase Orders (Finance OS Workflows)
  // ==========================================
  getPurchaseOrders(): PurchaseOrder[] {
    return this.data.purchase_orders.map((po) => {
      const supplier = this.getSupplierById(po.supplier_id);
      const items = this.data.purchase_order_items.filter((it) => it.purchase_order_id === po.id);
      return {
        ...po,
        supplier,
        items,
      };
    }).sort((a, b) => new Date(b.po_date).getTime() - new Date(a.po_date).getTime());
  }

  getPurchaseOrderById(id: string): PurchaseOrder | null {
    const po = this.data.purchase_orders.find((p) => p.id === id);
    if (!po) return null;
    const supplier = this.getSupplierById(po.supplier_id);
    const items = this.data.purchase_order_items.filter((it) => it.purchase_order_id === po.id);
    return {
      ...po,
      supplier,
      items,
    };
  }

  createPurchaseOrderWithItems(
    poData: Omit<PurchaseOrder, 'id' | 'user_id' | 'created_at' | 'supplier' | 'items'>,
    itemsData: Array<Omit<PurchaseOrderItem, 'id' | 'purchase_order_id' | 'created_at'>>
  ): PurchaseOrder {
    const supplier = this.getSupplierById(poData.supplier_id);
    if (!supplier) throw new Error(`Supplier with ID ${poData.supplier_id} not found.`);

    const poId = `po-${Date.now()}`;
    const createdItems: PurchaseOrderItem[] = itemsData.map((it, idx) => ({
      id: `poi-${Date.now()}-${idx}`,
      purchase_order_id: poId,
      description: it.description,
      hsn_sac: it.hsn_sac || '',
      quantity: it.quantity,
      unit: it.unit || 'NOS',
      unit_price: it.unit_price,
      taxable_value: it.taxable_value,
      gst_rate: it.gst_rate,
      cgst_amount: it.cgst_amount,
      sgst_amount: it.sgst_amount,
      igst_amount: it.igst_amount,
      total_amount: it.total_amount,
      created_at: new Date().toISOString(),
    }));

    const newPO: PurchaseOrder = {
      ...poData,
      id: poId,
      user_id: DEFAULT_USER_ID,
      created_at: new Date().toISOString(),
    };

    this.data.purchase_orders.push(newPO);
    this.data.purchase_order_items.push(...createdItems);

    this.addActivity({
      id: `act-${Date.now()}`,
      type: 'bill_processed',
      title: `Purchase Order ${newPO.po_number} Issued`,
      description: `Issued to ${supplier.name} for ₹${newPO.total_amount.toLocaleString('en-IN')}`,
      amount: newPO.total_amount,
      date: newPO.created_at,
      status: newPO.status,
    });

    this.persist();
    return {
      ...newPO,
      supplier,
      items: createdItems,
    };
  }

  updatePurchaseOrderStatus(id: string, status: any): PurchaseOrder | null {
    const po = this.data.purchase_orders.find((p) => p.id === id);
    if (!po) return null;
    po.status = status;
    po.updated_at = new Date().toISOString();
    this.persist();
    return this.getPurchaseOrderById(id);
  }

  deletePurchaseOrder(id: string): boolean {
    this.data.purchase_orders = this.data.purchase_orders.filter((p) => p.id !== id);
    this.data.purchase_order_items = this.data.purchase_order_items.filter((it) => it.purchase_order_id !== id);
    this.persist();
    return true;
  }

  // ==========================================
  // Payments Ledger (Finance OS Workflows)
  // ==========================================
  getPayments(): PaymentRecord[] {
    return [...this.data.payments].sort(
      (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
    );
  }

  createPayment(payload: Omit<PaymentRecord, 'id' | 'user_id' | 'created_at'>): PaymentRecord {
    const payment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      user_id: DEFAULT_USER_ID,
      ...payload,
      created_at: new Date().toISOString(),
    };

    this.data.payments.unshift(payment);

    // If linked to an invoice, update invoice amount_paid
    if (payment.invoice_id) {
      const inv = this.data.invoices.find((i) => i.id === payment.invoice_id);
      if (inv) {
        inv.amount_paid = (inv.amount_paid || 0) + payment.amount;
        if (inv.amount_paid >= inv.total_amount) inv.status = 'paid';
        else inv.status = 'partially_paid';
        inv.updated_at = new Date().toISOString();
      }
    }

    // If linked to a purchase bill, update purchase bill amount_paid
    if (payment.purchase_bill_id) {
      const pb = this.data.purchase_bills.find((b) => b.id === payment.purchase_bill_id);
      if (pb) {
        pb.amount_paid = (pb.amount_paid || 0) + payment.amount;
        if (pb.amount_paid >= pb.total_amount) pb.status = 'paid';
        pb.updated_at = new Date().toISOString();
      }
    }

    this.addActivity({
      id: `act-${Date.now()}`,
      type: payment.type === 'inflow' ? 'payment_received' : 'expense_added',
      title: payment.type === 'inflow' ? `Inflow: ${payment.counterparty_name}` : `Outflow: ${payment.counterparty_name}`,
      description: `Payment of ₹${payment.amount.toLocaleString('en-IN')} via ${payment.payment_method} (${payment.reference_number})`,
      amount: payment.amount,
      date: payment.payment_date,
      status: payment.status,
    });

    this.persist();
    return payment;
  }

  reconcilePayment(id: string): PaymentRecord | null {
    const p = this.data.payments.find((pay) => pay.id === id);
    if (!p) return null;
    p.status = 'reconciled';
    this.persist();
    return p;
  }

  deletePayment(id: string): boolean {
    this.data.payments = this.data.payments.filter((p) => p.id !== id);
    this.persist();
    return true;
  }

  // ==========================================
  // Approvals Inbox (Finance OS Workflows)
  // ==========================================
  getApprovals(): ApprovalRequest[] {
    const list: ApprovalRequest[] = [];

    // 1. Pending document extractions
    for (const ext of this.data.document_extractions) {
      if (ext.status === 'pending_review') {
        list.push({
          id: `appr-ext-${ext.id}`,
          title: `AI Extraction Verification: ${ext.party_name || 'Document'}`,
          entity_type: 'document_extraction',
          entity_id: ext.id,
          amount: ext.total_amount,
          counterparty_name: ext.party_name || 'Vendor',
          requested_date: ext.invoice_date || ext.created_at.split('T')[0],
          requested_by: 'AI Ingestion Engine (Gemini 3.8)',
          reason: `Confidence score ${ext.confidence_score.toFixed(1)}% is below 85% verification threshold`,
          status: 'pending',
          confidence_score: ext.confidence_score,
        });
      }
    }

    // 2. High-value purchase bills (> ₹50,000 or status pending_approval)
    for (const bill of this.data.purchase_bills) {
      if (bill.status === 'pending_approval' || (bill.total_amount >= 50000 && bill.status === 'unpaid' && (bill.amount_paid || 0) === 0)) {
        const supp = this.getSupplierById(bill.supplier_id);
        list.push({
          id: `appr-bill-${bill.id}`,
          title: `Purchase Bill Dual-Signoff: ${bill.bill_number}`,
          entity_type: 'purchase_bill',
          entity_id: bill.id,
          amount: bill.total_amount,
          counterparty_name: supp?.name || 'Vendor',
          requested_date: bill.bill_date,
          requested_by: 'Procurement Department',
          reason: `Bill value of ₹${bill.total_amount.toLocaleString('en-IN')} exceeds standard ₹50,000 single-signer limit`,
          status: 'pending',
        });
      }
    }

    // 3. Purchase Orders in draft or pending issue
    for (const po of this.data.purchase_orders) {
      if (po.status === 'draft') {
        const supp = this.getSupplierById(po.supplier_id);
        list.push({
          id: `appr-po-${po.id}`,
          title: `Purchase Order Authorization: ${po.po_number}`,
          entity_type: 'purchase_order',
          entity_id: po.id,
          amount: po.total_amount,
          counterparty_name: supp?.name || 'Vendor',
          requested_date: po.po_date,
          requested_by: 'Inventory Manager',
          reason: 'Draft PO awaiting manager authorization prior to supplier dispatch',
          status: 'pending',
        });
      }
    }

    return list;
  }

  approveRequest(entityType: string, entityId: string): boolean {
    if (entityType === 'document_extraction') {
      this.postExtractionToLedger(entityId);
    } else if (entityType === 'purchase_bill') {
      const pb = this.data.purchase_bills.find((b) => b.id === entityId);
      if (pb) {
        pb.status = 'approved';
        pb.updated_at = new Date().toISOString();
      }
    } else if (entityType === 'purchase_order') {
      const po = this.data.purchase_orders.find((p) => p.id === entityId);
      if (po) {
        po.status = 'issued';
        po.updated_at = new Date().toISOString();
      }
    }
    this.persist();
    return true;
  }

  rejectRequest(entityType: string, entityId: string, reason: string): boolean {
    if (entityType === 'document_extraction') {
      const ext = this.data.document_extractions.find((e) => e.id === entityId);
      if (ext) {
        ext.status = 'pending_review';
        ext.validation_flags.push(`REJECTED by Approver: ${reason}`);
      }
    } else if (entityType === 'purchase_bill') {
      const pb = this.data.purchase_bills.find((b) => b.id === entityId);
      if (pb) {
        pb.status = 'draft';
        pb.notes = (pb.notes || '') + ` [Rejected: ${reason}]`;
      }
    } else if (entityType === 'purchase_order') {
      const po = this.data.purchase_orders.find((p) => p.id === entityId);
      if (po) {
        po.status = 'cancelled';
        po.notes = (po.notes || '') + ` [Cancelled: ${reason}]`;
      }
    }
    this.persist();
    return true;
  }
}

export const db = new DatabaseManager();
