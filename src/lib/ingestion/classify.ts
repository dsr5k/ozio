import { DocumentType } from '../../types/index.ts';

export interface ClassificationResult {
  documentType: DocumentType;
  confidence: number;
  indicators: string[];
}

export function classifyDocumentText(text: string, filename: string): ClassificationResult {
  const normalized = (text + ' ' + filename).toLowerCase();
  const indicators: string[] = [];

  // Keywords indicative of Purchase Bill (Vendor bill received by company)
  const purchaseKeywords = [
    'tax invoice',
    'bill of supply',
    'vendor',
    'supplier',
    'billed to',
    'recipient',
    'consignee',
    'purchase order',
    'po ref',
    'delivery challan',
    'hsn',
    'input tax credit',
    'reverse charge',
  ];

  // Keywords indicative of Expense Receipts (Taxi, food, fuel, retail slip)
  const expenseKeywords = [
    'receipt',
    'cash memo',
    'uber',
    'ola',
    'fuel',
    'petrol',
    'restaurant',
    'cafe',
    'flight ticket',
    'boarding pass',
    'hotel stay',
    'folio',
    'swiggy',
    'zomato',
    'retail sale slip',
    'petty cash',
  ];

  // Keywords indicative of Sales Invoice (issued by our business to clients)
  const salesKeywords = [
    'client',
    'customer id',
    'bill to client',
    'quotation',
    'proforma invoice',
    'sales order',
    'accounts receivable',
  ];

  let purchaseScore = 0;
  let expenseScore = 0;
  let salesScore = 0;

  for (const kw of purchaseKeywords) {
    if (normalized.includes(kw)) {
      purchaseScore += 1;
      indicators.push(`Found purchase indicator: "${kw}"`);
    }
  }

  for (const kw of expenseKeywords) {
    if (normalized.includes(kw)) {
      expenseScore += 1.5;
      indicators.push(`Found expense indicator: "${kw}"`);
    }
  }

  for (const kw of salesKeywords) {
    if (normalized.includes(kw)) {
      salesScore += 1.2;
      indicators.push(`Found sales indicator: "${kw}"`);
    }
  }

  // Priority check
  if (expenseScore >= 2 && expenseScore > purchaseScore) {
    return {
      documentType: 'expense_receipt',
      confidence: Math.min(95, 60 + expenseScore * 10),
      indicators,
    };
  }

  if (salesScore >= 2 && salesScore > purchaseScore) {
    return {
      documentType: 'sales_invoice',
      confidence: Math.min(95, 60 + salesScore * 10),
      indicators,
    };
  }

  if (purchaseScore > 0) {
    return {
      documentType: 'purchase_bill',
      confidence: Math.min(95, 65 + purchaseScore * 6),
      indicators,
    };
  }

  return {
    documentType: 'purchase_bill', // Standard default for uploaded B2B tax documents
    confidence: 60,
    indicators: ['Defaulted to purchase bill based on standard B2B processing flow'],
  };
}
