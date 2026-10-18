import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, BusinessProfile } from '../../types/index.ts';
import { formatINR, numberToWordsINR, getStateNameFromCode } from '../gst.ts';

export function generateInvoicePDF(invoice: Invoice, profile: BusinessProfile): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [30, 58, 138]; // Deep Navy
  const secondaryColor: [number, number, number] = [71, 85, 105]; // Slate
  const accentColor: [number, number, number] = [234, 88, 12]; // Amber/Orange

  // Header Banner
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('TAX INVOICE', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Original for Recipient | GST Rule 46 Compliant', 120, 15);

  // Business / Seller Details (Left column)
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(profile.business_name, 14, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const sellerLines = [
    profile.address_line1,
    profile.address_line2,
    `${profile.city}, ${profile.state} - ${profile.pincode}`,
    `GSTIN: ${profile.gstin} | State Code: ${profile.state_code} (${getStateNameFromCode(profile.state_code)})`,
    `PAN: ${profile.pan || 'N/A'} | Email: ${profile.email}`,
  ].filter(Boolean) as string[];

  let curY = 39;
  for (const line of sellerLines) {
    doc.text(line, 14, curY);
    curY += 4.5;
  }

  // Invoice Metadata (Right box)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(125, 28, 71, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text(`Invoice No: ${invoice.invoice_number}`, 129, 35);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8);
  doc.text(`Issue Date: ${invoice.issue_date}`, 129, 41);
  doc.text(`Due Date: ${invoice.due_date}`, 129, 47);
  doc.text(`Place of Supply: ${invoice.customer?.state || 'Maharashtra'} (${invoice.customer?.state_code || '27'})`, 129, 53);
  doc.text(`Terms: ${invoice.payment_terms || 'Net 15'}`, 129, 59);

  // Buyer / Bill To Section
  const buyerY = Math.max(curY + 4, 68);
  doc.setFillColor(241, 245, 249);
  doc.rect(14, buyerY, 182, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text('BILLED TO (BUYER DETAILS)', 16, buyerY + 4.5);

  const cust = invoice.customer;
  const buyerName = cust?.company_name || cust?.name || 'Valued Customer';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(buyerName, 14, buyerY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const buyerLines = [
    cust?.billing_address || 'Address on file',
    `GSTIN: ${cust?.gstin || 'Unregistered / Consumer'} | State: ${cust?.state || 'N/A'} (Code: ${cust?.state_code || 'N/A'})`,
    `Contact: ${cust?.phone || cust?.email || 'N/A'}`,
  ];
  let bY = buyerY + 17;
  for (const bLine of buyerLines) {
    doc.text(bLine, 14, bY);
    bY += 4.5;
  }

  // Items Table
  const tableStartY = bY + 4;
  const isInter = invoice.is_interstate;

  const tableHead = isInter
    ? [['#', 'Item Description', 'HSN/SAC', 'Qty', 'Unit Rate', 'Taxable Val', 'IGST Rate', 'IGST Amt', 'Total']]
    : [['#', 'Item Description', 'HSN/SAC', 'Qty', 'Unit Rate', 'Taxable Val', 'CGST', 'SGST', 'Total']];

  const tableBody = (invoice.items || []).map((it, idx) => {
    if (isInter) {
      return [
        (idx + 1).toString(),
        it.description,
        it.hsn_sac || '-',
        `${it.quantity} ${it.unit}`,
        formatINR(it.unit_price),
        formatINR(it.taxable_value),
        `${it.igst_rate}%`,
        formatINR(it.igst_amount),
        formatINR(it.total_amount),
      ];
    } else {
      return [
        (idx + 1).toString(),
        it.description,
        it.hsn_sac || '-',
        `${it.quantity} ${it.unit}`,
        formatINR(it.unit_price),
        formatINR(it.taxable_value),
        `${it.cgst_rate}% (${formatINR(it.cgst_amount)})`,
        `${it.sgst_rate}% (${formatINR(it.sgst_amount)})`,
        formatINR(it.total_amount),
      ];
    }
  });

  autoTable(doc, {
    startY: tableStartY,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' },
      8: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
    },
  });

  // Calculate position after table
  const finalY = (doc as any).lastAutoTable.finalY + 4;

  // Amount in Words (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text('Total Amount in Words:', 14, finalY + 4);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const words = numberToWordsINR(invoice.total_amount);
  doc.text(words, 14, finalY + 9, { maxWidth: 105 });

  // Summary Totals (Right)
  const totalsX = 135;
  let totY = finalY + 4;

  const summaryRows = [
    ['Taxable Amount:', formatINR(invoice.taxable_amount)],
    ...(isInter
      ? [['IGST Total:', formatINR(invoice.igst_amount)]]
      : [
          ['CGST Total:', formatINR(invoice.cgst_amount)],
          ['SGST Total:', formatINR(invoice.sgst_amount)],
        ]),
    ['Total Tax:', formatINR(invoice.total_tax)],
    ['Grand Total:', formatINR(invoice.total_amount)],
  ];

  for (const [label, val] of summaryRows) {
    const isGrand = label === 'Grand Total:';
    doc.setFont('helvetica', isGrand ? 'bold' : 'normal');
    doc.setFontSize(isGrand ? 10 : 8.5);
    doc.setTextColor(isGrand ? 30 : 71, isGrand ? 58 : 85, isGrand ? 138 : 105);

    if (isGrand) {
      doc.setFillColor(241, 245, 249);
      doc.rect(totalsX - 4, totY - 4, 65, 7, 'F');
    }

    doc.text(label, totalsX, totY);
    doc.text(val, 196, totY, { align: 'right' });
    totY += isGrand ? 8 : 5.5;
  }

  // Banking Details & Payment Instructions (Bottom Left)
  const bankY = Math.max(totY + 4, finalY + 28);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, bankY, 110, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text('Bank Payment Details (RTGS / NEFT / IMPS / UPI):', 17, bankY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Bank: ${profile.bank_name || 'HDFC Bank'} | A/C No: ${profile.bank_account_no || '50200049283719'}`, 17, bankY + 11);
  doc.text(`IFSC Code: ${profile.bank_ifsc || 'HDFC0000060'} | Branch: ${profile.bank_branch || 'MIDC Mumbai'}`, 17, bankY + 16);
  doc.text(`UPI ID: ${profile.upi_id || 'apextech@hdfcbank'}`, 17, bankY + 21);

  // Signatory Stamp (Bottom Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`For ${profile.business_name}`, 145, bankY + 5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Signatory / Digital Sign', 145, bankY + 22);

  // Footer notes & declaration
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Terms & Conditions: ' + profile.terms_conditions, 14, 285);
  doc.text('This is a computer-generated tax invoice. No signature required under Section 46 of CGST Act.', 14, 290);

  return doc;
}
