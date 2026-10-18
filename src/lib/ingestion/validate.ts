import { RawExtractionOutput } from './extract.ts';
import { validateGSTIN, getStateCodeFromGSTIN, STANDARD_GST_RATES } from '../gst.ts';
import { AnomalyReport } from '../../types/index.ts';

export interface ValidationReport {
  isValid: boolean;
  confidenceScore: number;
  flags: string[];
  anomalies: AnomalyReport[];
  recalculatedSubtotal: number;
  recalculatedTax: number;
  recalculatedTotal: number;
}

export function validateExtraction(
  data: RawExtractionOutput,
  businessStateCode: string = '27'
): ValidationReport {
  const flags: string[] = [];
  const anomalies: AnomalyReport[] = [];
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

      // Anomaly: Non-standard GST rate
      if (item.gst_rate !== undefined && !STANDARD_GST_RATES.includes(item.gst_rate)) {
        anomalies.push({
          id: `anom-tax-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          type: 'tax_rate_anomaly',
          severity: 'critical',
          message: `Non-standard GST rate detected: ${item.gst_rate}% on "${item.description}". Standard Indian slabs are 0%, 5%, 12%, 18%, 28%.`,
          field: 'gst_rate',
        });
        flags.push(`Anomaly: Non-standard GST rate of ${item.gst_rate}% applied`);
        score -= 15;
      }

      // Anomaly: Missing HSN on high-value line items (> ₹25,000)
      if (item.total_amount > 25000 && (!item.hsn_sac || item.hsn_sac.trim() === '')) {
        anomalies.push({
          id: `anom-hsn-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          type: 'missing_hsn',
          severity: 'warning',
          message: `Missing HSN/SAC code on high-value line item "${item.description}" (₹${item.total_amount.toLocaleString('en-IN')}).`,
          field: 'hsn_sac',
        });
      }
    }

    const taxableDiff = Math.abs(computedTaxable - (data.taxableAmount || data.subtotal));
    if (taxableDiff > 1.0) {
      flags.push(`Line-item taxable sum (₹${computedTaxable.toFixed(2)}) differs from header taxable value (₹${(data.taxableAmount || data.subtotal).toFixed(2)})`);
      anomalies.push({
        id: `anom-math-${Date.now()}`,
        type: 'tax_rate_anomaly',
        severity: 'critical',
        message: `Line-item taxable sum (₹${computedTaxable.toFixed(2)}) mismatches document header taxable value (₹${(data.taxableAmount || data.subtotal).toFixed(2)}).`,
      });
      score -= 8;
    }

    const totalDiff = Math.abs(computedTotal - data.totalAmount);
    if (totalDiff > 1.0) {
      flags.push(`Line-item total sum (₹${computedTotal.toFixed(2)}) differs from extracted total amount (₹${data.totalAmount.toFixed(2)})`);
      anomalies.push({
        id: `anom-tot-${Date.now()}`,
        type: 'tax_rate_anomaly',
        severity: 'critical',
        message: `Extracted total amount differs from sum of line items by ₹${totalDiff.toFixed(2)}.`,
      });
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
      anomalies.push({
        id: `anom-gstin-${Date.now()}`,
        type: 'state_mismatch',
        severity: 'warning',
        message: `Invalid or unverified GSTIN structure: ${data.partyGstin}.`,
        field: 'party_gstin',
      });
      score -= 10;
    } else {
      flags.push(`Valid 15-digit GSTIN verified: ${data.partyGstin}`);
      const partyState = getStateCodeFromGSTIN(data.partyGstin);
      const isInter = partyState !== businessStateCode;

      if (isInter && (data.cgstAmount > 0 || data.sgstAmount > 0)) {
        flags.push(`Inter-state transaction (State ${partyState} vs ${businessStateCode}) should have IGST instead of CGST/SGST.`);
        anomalies.push({
          id: `anom-state-${Date.now()}`,
          type: 'state_mismatch',
          severity: 'critical',
          message: `Tax classification mismatch: Supplier in State ${partyState} billed to State ${businessStateCode} must charge IGST, not CGST+SGST.`,
        });
        score -= 10;
      } else if (!isInter && data.igstAmount > 0) {
        flags.push(`Intra-state transaction (State ${partyState}) should have CGST+SGST instead of IGST.`);
        anomalies.push({
          id: `anom-state-${Date.now()}`,
          type: 'state_mismatch',
          severity: 'critical',
          message: `Tax classification mismatch: Same-state transaction (State ${partyState}) charged IGST instead of CGST+SGST.`,
        });
        score -= 10;
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
      anomalies.push({
        id: `anom-sym-${Date.now()}`,
        type: 'tax_rate_anomaly',
        severity: 'critical',
        message: `CGST (₹${data.cgstAmount}) and SGST (₹${data.sgstAmount}) asymmetry violates Indian GST rules.`,
      });
      score -= 10;
    }
  }

  // 4. Threshold Exceeded (> ₹50,000 threshold triggers dual approval)
  if (data.totalAmount > 50000) {
    anomalies.push({
      id: `anom-thresh-${Date.now()}`,
      type: 'threshold_exceeded',
      severity: 'info',
      message: `Document total of ₹${data.totalAmount.toLocaleString('en-IN')} exceeds the standard ₹50,000 approval limit.`,
    });
  }

  // 5. Date sanity
  if (data.invoiceDate) {
    const invDate = new Date(data.invoiceDate).getTime();
    const now = Date.now();
    if (invDate > now + 86400000 * 3) {
      flags.push(`Invoice date (${data.invoiceDate}) appears to be in the future.`);
      anomalies.push({
        id: `anom-date-${Date.now()}`,
        type: 'tax_rate_anomaly',
        severity: 'warning',
        message: `Invoice issue date (${data.invoiceDate}) is in the future.`,
        field: 'invoice_date',
      });
      score -= 5;
    }
  } else {
    flags.push('Invoice issue date could not be determined.');
    score -= 10;
  }

  // Clamp score
  const finalScore = Math.max(10, Math.min(99, Math.round(score * 10) / 10));

  return {
    isValid: finalScore >= 60 && !anomalies.some((a) => a.severity === 'critical'),
    confidenceScore: finalScore,
    flags,
    anomalies,
    recalculatedSubtotal: Math.round(computedTaxable * 100) / 100,
    recalculatedTax: Math.round(computedTax * 100) / 100,
    recalculatedTotal: Math.round(computedTotal * 100) / 100,
  };
}
