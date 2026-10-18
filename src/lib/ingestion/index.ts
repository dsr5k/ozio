import crypto from 'crypto';
import { db } from '../db/index.ts';
import { StoredDocument, DocumentExtraction } from '../../types/index.ts';
import { classifyDocumentText } from './classify.ts';
import { extractFinancialDocumentWithGemini } from './extract.ts';
import { validateExtraction } from './validate.ts';
import { resolveParty } from './resolve-party.ts';

export interface IngestDocumentParams {
  filename: string;
  fileType: string;
  fileSize: number;
  fileBase64?: string;
  documentText?: string;
  autoPostIfHighConfidence?: boolean;
}

export async function processDocumentIngestion(
  params: IngestDocumentParams
): Promise<{ document: StoredDocument; extraction: DocumentExtraction }> {
  // 1. Compute SHA-256 file hash for idempotency and duplicate checking
  const hashSource = params.fileBase64 || params.documentText || `${params.filename}-${params.fileSize}`;
  const fileHash = crypto.createHash('sha256').update(hashSource).digest('hex');

  // Check if this document has already been uploaded
  const existingDocs = db.getStoredDocuments();
  const existingDoc = existingDocs.find((d) => d.file_hash === fileHash);

  if (existingDoc) {
    const existingExt = db.getExtractions().find((e) => e.document_id === existingDoc.id);
    if (existingExt) {
      console.log(`Document hash ${fileHash} already processed. Returning existing extraction ${existingExt.id}.`);
      return { document: existingDoc, extraction: existingExt };
    }
  }

  // 2. Classify document
  const classification = classifyDocumentText(params.documentText || '', params.filename);

  // 3. Register Stored Document
  const storedDoc = db.createStoredDocument({
    filename: params.filename,
    file_type: params.fileType,
    file_size: params.fileSize,
    file_hash: fileHash,
    file_url: params.fileBase64 ? `data:${params.fileType};base64,${params.fileBase64}` : undefined,
    document_type: classification.documentType,
    status: 'processing',
  });

  // 4. Extract with Gemini AI
  const rawExtraction = await extractFinancialDocumentWithGemini({
    fileBase64: params.fileBase64,
    mimeType: params.fileType,
    documentText: params.documentText,
    filename: params.filename,
  });

  // Merge classification if Gemini is unsure
  const finalDocType = rawExtraction.documentType || classification.documentType;

  // 5. Validate totals, GSTIN, and tax math
  const profile = db.getProfile();
  const validation = validateExtraction(rawExtraction, profile.state_code);

  // 6. Resolve Counterparty
  const partyResolution = resolveParty(rawExtraction.partyName, rawExtraction.partyGstin, finalDocType);

  // 7. Check Duplicate Bill (if purchase_bill)
  let isDuplicate = false;
  let duplicateReason = '';
  let duplicateOfId: string | null = null;

  if (finalDocType === 'purchase_bill' && partyResolution.matchedPartyId) {
    const dupCheck = db.checkDuplicateBill(
      partyResolution.matchedPartyId,
      rawExtraction.invoiceNumber,
      rawExtraction.invoiceDate,
      fileHash
    );
    if (dupCheck.isDuplicate) {
      isDuplicate = true;
      duplicateReason = dupCheck.reason || 'Duplicate bill detected.';
      duplicateOfId = dupCheck.existingBill?.id || null;
      validation.flags.push(`DUPLICATE WARNING: ${duplicateReason}`);
      validation.confidenceScore = Math.min(validation.confidenceScore, 40);
    }
  }

  // 8. Create Document Extraction record
  const extraction = db.createExtraction({
    document_id: storedDoc.id,
    document_type: finalDocType,
    confidence_score: validation.confidenceScore,
    party_name: partyResolution.partyName,
    party_gstin: partyResolution.partyGstin,
    party_type: partyResolution.partyType,
    matched_party_id: partyResolution.matchedPartyId,
    invoice_number: rawExtraction.invoiceNumber,
    invoice_date: rawExtraction.invoiceDate,
    due_date: rawExtraction.dueDate,
    subtotal: rawExtraction.subtotal,
    taxable_amount: rawExtraction.taxableAmount,
    cgst_amount: rawExtraction.cgstAmount,
    sgst_amount: rawExtraction.sgstAmount,
    igst_amount: rawExtraction.igstAmount,
    total_amount: rawExtraction.totalAmount,
    items: rawExtraction.items,
    validation_flags: validation.flags,
    is_duplicate: isDuplicate,
    duplicate_of_id: duplicateOfId,
    status: validation.confidenceScore >= 85 && !isDuplicate ? 'verified' : 'pending_review',
    posted_record_type: null,
    posted_record_id: null,
  });

  // Optional: Auto post if high confidence and requested
  if (params.autoPostIfHighConfidence && validation.confidenceScore >= 90 && !isDuplicate) {
    try {
      db.postExtractionToLedger(extraction.id);
    } catch (e) {
      console.warn('Auto post skipped due to review rule:', e);
    }
  }

  return {
    document: db.getStoredDocuments().find((d) => d.id === storedDoc.id) || storedDoc,
    extraction: db.getExtractionById(extraction.id) || extraction,
  };
}
