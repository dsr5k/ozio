/**
 * Indian Goods and Services Tax (GST) Utilities
 */

export const INDIAN_STATES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
};

export const STANDARD_GST_RATES = [0, 5, 12, 18, 28];

export function getStateNameFromCode(code: string): string {
  const padded = code.trim().padStart(2, '0');
  return INDIAN_STATES[padded] || 'Unknown State';
}

export function getStateCodeFromGSTIN(gstin?: string): string {
  if (!gstin || gstin.trim().length < 2) return '';
  return gstin.trim().substring(0, 2);
}

export function validateGSTIN(gstin: string): { isValid: boolean; message?: string } {
  if (!gstin) return { isValid: false, message: 'GSTIN is required' };
  const cleaned = gstin.trim().toUpperCase();
  // Standard 15-character format: 2-digit state code + 10-char PAN + 1 entity num + 'Z' + 1 checksum
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (cleaned.length !== 15) {
    return { isValid: false, message: 'GSTIN must be exactly 15 characters long' };
  }
  if (!regex.test(cleaned)) {
    return { isValid: false, message: 'Invalid GSTIN format (e.g. 27AABCT1345K1ZK)' };
  }
  const stateCode = cleaned.substring(0, 2);
  if (!INDIAN_STATES[stateCode]) {
    return { isValid: false, message: `Invalid state code '${stateCode}' in GSTIN` };
  }
  return { isValid: true };
}

export function isInterStateTransaction(sourceStateCode: string, targetStateCode: string): boolean {
  if (!sourceStateCode || !targetStateCode) return false;
  return sourceStateCode.trim().padStart(2, '0') !== targetStateCode.trim().padStart(2, '0');
}

export interface TaxCalculationResult {
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
}

export function calculateItemTax(
  taxableValue: number,
  gstRate: number,
  isInterState: boolean
): TaxCalculationResult {
  const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

  if (isInterState) {
    const igstAmount = round2((taxableValue * gstRate) / 100);
    return {
      taxableValue,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: gstRate,
      igstAmount,
      totalTax: igstAmount,
      totalAmount: round2(taxableValue + igstAmount),
    };
  } else {
    const halfRate = gstRate / 2;
    const cgstAmount = round2((taxableValue * halfRate) / 100);
    const sgstAmount = round2((taxableValue * halfRate) / 100);
    const totalTax = round2(cgstAmount + sgstAmount);
    return {
      taxableValue,
      cgstRate: halfRate,
      cgstAmount,
      sgstRate: halfRate,
      sgstAmount,
      igstRate: 0,
      igstAmount: 0,
      totalTax,
      totalAmount: round2(taxableValue + totalTax),
    };
  }
}

/**
 * Formats a number to Indian Rupee currency format (e.g., ₹1,23,456.78)
 */
export function formatINR(amount: number): string {
  if (isNaN(amount)) return '₹0.00';
  const isNegative = amount < 0;
  const absVal = Math.abs(amount).toFixed(2);
  const [intPart, decimalPart] = absVal.split('.');

  let lastThree = intPart.substring(intPart.length - 3);
  const otherNumbers = intPart.substring(0, intPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  return `${isNegative ? '-' : ''}₹${formattedInt}.${decimalPart}`;
}

/**
 * Converts numeric amount to Indian Currency Words (Lakhs, Crores)
 */
export function numberToWordsINR(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(num: number): string {
    if (num === 0) return '';
    if (num < 20) return units[num];
    const t = Math.floor(num / 10);
    const u = num % 10;
    return tens[t] + (u ? ' ' + units[u] : '');
  }

  function convertThreeDigits(num: number): string {
    const h = Math.floor(num / 100);
    const rem = num % 100;
    let res = '';
    if (h > 0) res += units[h] + ' Hundred';
    if (rem > 0) {
      if (res !== '') res += ' and ';
      res += convertTwoDigits(rem);
    }
    return res;
  }

  const intPart = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - intPart) * 100);

  let crores = Math.floor(intPart / 10000000);
  let remainder = intPart % 10000000;
  let lakhs = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  let thousands = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  let hundreds = remainder;

  let words = '';
  if (crores > 0) words += convertTwoDigits(crores) + ' Crore ';
  if (lakhs > 0) words += convertTwoDigits(lakhs) + ' Lakh ';
  if (thousands > 0) words += convertTwoDigits(thousands) + ' Thousand ';
  if (hundreds > 0) words += convertThreeDigits(hundreds);

  words = words.trim() + ' Rupees';

  if (paise > 0) {
    words += ' and ' + convertTwoDigits(paise) + ' Paise';
  }

  return words + ' Only';
}
