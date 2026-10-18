import { RawExtractionOutput } from './extract.ts';
import { validateGSTIN, getStateCodeFromGSTIN } from '../gst.ts';

export interface ValidationReport {
  isValid: boolean;
  confidenceScore: number;
  flags: string[];
  recalculatedSubtotal: number;
  recalculatedTax: number;
  recalculatedTotal: number;
}

export function validateExtraction(
  data: RawExtractionOutput,
  businessStateCode: string = '27'
): ValidationReport {
  const flags: string[] = [];
  let score = data.confidenceScore;

  // 1. Line items sum check
  let computedTaxable = 0;
  let computedTotal = 0;
  let computedTax = 0;

  if (data.items && data.items.length > 0) {
    for (const item of data.items) {
      computedTaxable += item.taxable_value || 0;
      computedTotal += item.total_amount || 0;
      computedTax += (item.cgst_amount || 0) + (item.sgst_amount || 0) + (item.igst_amount || 0);
    }

    const taxableDiff = Math.abs(computedTaxable - (data.taxableAmount || data.subtotal));
    if (taxableDiff > 1.0) {
      flags.push(`Line-item taxable sum (₹${computedTaxable.toFixed(2)}) differs from header taxable value (₹${(data.taxableAmount || data.subtotal).toFixed(2)})`);
      score -= 8;
    }

    const totalDiff = Math.abs(computedTotal - data.totalAmount);
    if (totalDiff > 1.0) {
      flags.push(`Line-item total sum (₹${computedTotal.toFixed(2)}) differs from extracted total amount (₹${data.totalAmount.toFixed(2)})`);
      score -= 10;
    } else {
      flags.push('Line-item totals match invoice total amount precisely.');
    }
  } else {
    flags.push('No individual line items could be parsed; header total used.');
    score -= 15;
    computedTaxable = data.taxableAmount || data.subtotal;
    computedTotal = data.totalAmount;
    computedTax = (data.cgstAmount || 0) + (data.sgstAmount || 0) + (data.igstAmount || 0);
  }

  // 2. GSTIN format & State code check
  if (data.partyGstin) {
    const gstinVal = validateGSTIN(data.partyGstin);
    if (!gstinVal.isValid) {
      flags.push(`GSTIN validation warning: ${gstinVal.message}`);
      score -= 10;
    } else {
      flags.push(`Valid 15-digit GSTIN verified: ${data.partyGstin}`);
      const partyState = getStateCodeFromGSTIN(data.partyGstin);
      const isInter = partyState !== businessStateCode;

      if (isInter && (data.cgstAmount > 0 || data.sgstAmount > 0)) {
        flags.push(`Inter-state transaction (State ${partyState} vs ${businessStateCode}) should have IGST instead of CGST/SGST.`);
        score -= 5;
      } else if (!isInter && data.igstAmount > 0) {
        flags.push(`Intra-state transaction (State ${partyState}) should have CGST+SGST instead of IGST.`);
        score -= 5;
      }
    }
  } else {
    flags.push('Counterparty GSTIN is missing. Please confirm if party is unregistered.');
    score -= 8;
  }

  // 3. Tax symmetry (CGST must equal SGST)
  if (data.cgstAmount > 0 || data.sgstAmount > 0) {
    if (Math.abs(data.cgstAmount - data.sgstAmount) > 0.05) {
      flags.push(`CGST (₹${data.cgstAmount}) and SGST (₹${data.sgstAmount}) amounts must be identical.`);
      score -= 7;
    }
  }

  // 4. Date sanity
  if (data.invoiceDate) {
    const invDate = new Date(data.invoiceDate).getTime();
    const now = Date.now();
    if (invDate > now + 86400000 * 3) {
      flags.push(`Invoice date (${data.invoiceDate}) appears to be in the future.`);
      score -= 5;
    }
  } else {
    flags.push('Invoice issue date could not be determined.');
    score -= 10;
  }

  // Clamp score
  const finalScore = Math.max(10, Math.min(99, Math.round(score * 10) / 10));

  return {
    isValid: finalScore >= 60,
    confidenceScore: finalScore,
    flags,
    recalculatedSubtotal: Math.round(computedTaxable * 100) / 100,
    recalculatedTax: Math.round(computedTax * 100) / 100,
    recalculatedTotal: Math.round(computedTotal * 100) / 100,
  };
}
