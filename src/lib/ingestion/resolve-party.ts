import { db } from '../db/index.ts';
import { Customer, Supplier } from '../../types/index.ts';

export interface PartyResolutionResult {
  matchedPartyId?: string;
  partyType: 'supplier' | 'customer' | 'unknown';
  partyName: string;
  partyGstin?: string;
  isExisting: boolean;
  matchReason?: string;
}

export function resolveParty(
  extractedPartyName?: string,
  extractedGstin?: string,
  documentType: 'purchase_bill' | 'sales_invoice' | 'expense_receipt' | 'unknown' = 'purchase_bill'
): PartyResolutionResult {
  const normName = (extractedPartyName || '').trim().toLowerCase();
  const cleanGstin = (extractedGstin || '').trim().toUpperCase();

  if (documentType === 'sales_invoice') {
    const customers = db.getCustomers();

    // 1. Match by GSTIN
    if (cleanGstin) {
      const gstinMatch = customers.find((c) => c.gstin?.trim().toUpperCase() === cleanGstin);
      if (gstinMatch) {
        return {
          matchedPartyId: gstinMatch.id,
          partyType: 'customer',
          partyName: gstinMatch.company_name || gstinMatch.name,
          partyGstin: gstinMatch.gstin,
          isExisting: true,
          matchReason: `Exact GSTIN match with customer: ${gstinMatch.name}`,
        };
      }
    }

    // 2. Match by Name
    if (normName) {
      const nameMatch = customers.find(
        (c) => c.name.toLowerCase().includes(normName) ||
               (c.company_name && c.company_name.toLowerCase().includes(normName)) ||
               normName.includes(c.name.toLowerCase())
      );
      if (nameMatch) {
        return {
          matchedPartyId: nameMatch.id,
          partyType: 'customer',
          partyName: nameMatch.company_name || nameMatch.name,
          partyGstin: nameMatch.gstin || cleanGstin,
          isExisting: true,
          matchReason: `Name similarity match with customer: ${nameMatch.company_name || nameMatch.name}`,
        };
      }
    }

    return {
      matchedPartyId: undefined,
      partyType: 'customer',
      partyName: extractedPartyName || 'New Client',
      partyGstin: cleanGstin || undefined,
      isExisting: false,
      matchReason: 'No existing customer matched; proposed as new customer record.',
    };
  }

  // Otherwise, default to Supplier (Purchase Bill or Expense)
  const suppliers = db.getSuppliers();

  // 1. Match by GSTIN
  if (cleanGstin) {
    const gstinMatch = suppliers.find((s) => s.gstin?.trim().toUpperCase() === cleanGstin);
    if (gstinMatch) {
      return {
        matchedPartyId: gstinMatch.id,
        partyType: 'supplier',
        partyName: gstinMatch.company_name || gstinMatch.name,
        partyGstin: gstinMatch.gstin,
        isExisting: true,
        matchReason: `Exact GSTIN match with vendor/supplier: ${gstinMatch.name}`,
      };
    }
  }

  // 2. Match by Name
  if (normName) {
    const nameMatch = suppliers.find(
      (s) => s.name.toLowerCase().includes(normName) ||
             (s.company_name && s.company_name.toLowerCase().includes(normName)) ||
             normName.includes(s.name.toLowerCase())
    );
    if (nameMatch) {
      return {
        matchedPartyId: nameMatch.id,
        partyType: 'supplier',
        partyName: nameMatch.company_name || nameMatch.name,
        partyGstin: nameMatch.gstin || cleanGstin,
        isExisting: true,
        matchReason: `Name similarity match with vendor: ${nameMatch.company_name || nameMatch.name}`,
      };
    }
  }

  return {
    matchedPartyId: undefined,
    partyType: 'supplier',
    partyName: extractedPartyName || 'New Supplier',
    partyGstin: cleanGstin || undefined,
    isExisting: false,
    matchReason: 'No existing supplier matched; proposed as new vendor record.',
  };
}
