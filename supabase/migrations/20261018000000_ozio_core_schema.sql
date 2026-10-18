-- ====================================================================
-- Ozio — AI-Powered Financial Operations Platform
-- Supabase PostgreSQL Migration
-- Canonical Schema with RLS Policies, Indexes, and Integrity Constraints
-- ====================================================================

-- 1. Profiles Table (Business Profile, GSTIN, Bank Details)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    gstin VARCHAR(15),
    email TEXT,
    phone VARCHAR(20),
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT NOT NULL DEFAULT 'Maharashtra',
    state_code VARCHAR(2) NOT NULL DEFAULT '27',
    pincode VARCHAR(10),
    pan VARCHAR(10),
    bank_name TEXT,
    bank_account_no TEXT,
    bank_ifsc VARCHAR(11),
    bank_branch TEXT,
    upi_id TEXT,
    invoice_prefix VARCHAR(10) DEFAULT 'INV-',
    invoice_notes TEXT DEFAULT 'Thank you for your business!',
    terms_conditions TEXT DEFAULT 'Payment due within 15 days of invoice date.',
    currency VARCHAR(3) DEFAULT 'INR',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Customers Table (Sales Counterparties)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    company_name TEXT,
    email TEXT,
    phone VARCHAR(20),
    gstin VARCHAR(15),
    state TEXT NOT NULL DEFAULT 'Maharashtra',
    state_code VARCHAR(2) NOT NULL DEFAULT '27',
    billing_address TEXT,
    shipping_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Suppliers Table (Purchase Counterparties - NO vendors table!)
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    company_name TEXT,
    email TEXT,
    phone VARCHAR(20),
    gstin VARCHAR(15),
    state TEXT NOT NULL DEFAULT 'Maharashtra',
    state_code VARCHAR(2) NOT NULL DEFAULT '27',
    address TEXT,
    bank_details TEXT,
    category TEXT DEFAULT 'General Supplier',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Invoices Table (Sales Invoices)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    invoice_number TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    taxable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    cgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    sgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    igst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_tax NUMERIC(15, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('draft', 'sent', 'paid', 'unpaid', 'overdue', 'partially_paid')),
    payment_terms TEXT DEFAULT 'Due on Receipt',
    notes TEXT,
    is_interstate BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_invoice_number UNIQUE (user_id, invoice_number)
);

-- 5. Invoice Items Table (Canonical Sales Line Items)
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    hsn_sac VARCHAR(10),
    quantity NUMERIC(12, 3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit VARCHAR(10) DEFAULT 'NOS',
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    discount_percent NUMERIC(5, 2) DEFAULT 0,
    taxable_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18,
    cgst_rate NUMERIC(5, 2) DEFAULT 0,
    cgst_amount NUMERIC(15, 2) DEFAULT 0,
    sgst_rate NUMERIC(5, 2) DEFAULT 0,
    sgst_amount NUMERIC(15, 2) DEFAULT 0,
    igst_rate NUMERIC(5, 2) DEFAULT 0,
    igst_amount NUMERIC(15, 2) DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Purchase Bills Table (Purchase Transactions from Suppliers)
CREATE TABLE IF NOT EXISTS public.purchase_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    bill_number TEXT NOT NULL,
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    taxable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    cgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    sgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    igst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_tax NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(25) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('draft', 'pending_approval', 'approved', 'paid', 'unpaid', 'overdue')),
    category TEXT DEFAULT 'Operations',
    document_url TEXT,
    document_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_supplier_bill UNIQUE (user_id, supplier_id, bill_number)
);

-- 7. Purchase Bill Items Table (Line Items for Purchase Bills)
CREATE TABLE IF NOT EXISTS public.purchase_bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_bill_id UUID NOT NULL REFERENCES public.purchase_bills(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    hsn_sac VARCHAR(10),
    quantity NUMERIC(12, 3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit VARCHAR(10) DEFAULT 'NOS',
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    taxable_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18,
    cgst_amount NUMERIC(15, 2) DEFAULT 0,
    sgst_amount NUMERIC(15, 2) DEFAULT 0,
    igst_amount NUMERIC(15, 2) DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Bill Duplicate Checks Table (Duplicate Prevention & Audit)
CREATE TABLE IF NOT EXISTS public.bill_duplicate_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    bill_number TEXT NOT NULL,
    bill_date DATE,
    total_amount NUMERIC(15, 2) NOT NULL,
    file_hash VARCHAR(64),
    purchase_bill_id UUID REFERENCES public.purchase_bills(id) ON DELETE CASCADE,
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Expenses Table (Categorized Expenses & Receipts)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(30) DEFAULT 'Bank Transfer',
    description TEXT NOT NULL,
    receipt_url TEXT,
    is_billable BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'recorded' CHECK (status IN ('recorded', 'reimbursed', 'pending')),
    gst_amount NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Stored Documents Table (Raw Upload Traceability)
CREATE TABLE IF NOT EXISTS public.stored_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    file_url TEXT,
    document_type VARCHAR(30) DEFAULT 'unknown' CHECK (document_type IN ('purchase_bill', 'sales_invoice', 'expense_receipt', 'unknown')),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'extracted', 'review_required', 'approved', 'rejected', 'posted')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Document Extractions Table (AI Extraction & Validation Pipeline)
CREATE TABLE IF NOT EXISTS public.document_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.stored_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_type VARCHAR(30) NOT NULL,
    confidence_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    party_name TEXT,
    party_gstin VARCHAR(15),
    party_type VARCHAR(20) CHECK (party_type IN ('supplier', 'customer', 'unknown')),
    matched_party_id UUID,
    invoice_number TEXT,
    invoice_date DATE,
    due_date DATE,
    subtotal NUMERIC(15, 2) DEFAULT 0,
    taxable_amount NUMERIC(15, 2) DEFAULT 0,
    cgst_amount NUMERIC(15, 2) DEFAULT 0,
    sgst_amount NUMERIC(15, 2) DEFAULT 0,
    igst_amount NUMERIC(15, 2) DEFAULT 0,
    total_amount NUMERIC(15, 2) DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    validation_flags JSONB DEFAULT '[]'::jsonb,
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_of_id UUID,
    status VARCHAR(30) DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'verified', 'posted')),
    posted_record_type VARCHAR(30),
    posted_record_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- Indexes for Performance & Search
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON public.suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_user_id ON public.purchase_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_supplier_id ON public.purchase_bills(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_bill_items_bill_id ON public.purchase_bill_items(purchase_bill_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_dup_hash ON public.bill_duplicate_checks(file_hash);
CREATE INDEX IF NOT EXISTS idx_stored_docs_user_id ON public.stored_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_extractions_user_id ON public.document_extractions(user_id);

-- ====================================================================
-- Enable Row Level Security (RLS) on all tables
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_duplicate_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stored_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- RLS Policies (Users can only read/write their own records)
-- ====================================================================
CREATE POLICY profiles_user_policy ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY customers_user_policy ON public.customers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY suppliers_user_policy ON public.suppliers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY invoices_user_policy ON public.invoices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY invoice_items_user_policy ON public.invoice_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
);
CREATE POLICY purchase_bills_user_policy ON public.purchase_bills FOR ALL USING (auth.uid() = user_id);
CREATE POLICY purchase_bill_items_user_policy ON public.purchase_bill_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.purchase_bills WHERE purchase_bills.id = purchase_bill_items.purchase_bill_id AND purchase_bills.user_id = auth.uid())
);
CREATE POLICY bill_duplicate_checks_user_policy ON public.bill_duplicate_checks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY expenses_user_policy ON public.expenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY stored_documents_user_policy ON public.stored_documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY document_extractions_user_policy ON public.document_extractions FOR ALL USING (auth.uid() = user_id);
