import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db } from './src/lib/db/index.ts';
import { processDocumentIngestion } from './src/lib/ingestion/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit to support document uploads (PDFs, scans, images)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ----------------------------------------------------
  // API Routes
  // ----------------------------------------------------

  // Business Profile
  app.get('/api/profile', (req: Request, res: Response) => {
    try {
      res.json(db.getProfile());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/profile', (req: Request, res: Response) => {
    try {
      const updated = db.updateProfile(req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Dashboard Stats
  app.get('/api/dashboard/stats', (req: Request, res: Response) => {
    try {
      res.json(db.getDashboardStats());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Customers
  app.get('/api/customers', (req: Request, res: Response) => {
    try {
      res.json(db.getCustomers());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/customers', (req: Request, res: Response) => {
    try {
      const created = db.createCustomer(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/customers/:id', (req: Request, res: Response) => {
    try {
      const updated = db.updateCustomer(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Customer not found' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/customers/:id', (req: Request, res: Response) => {
    try {
      db.deleteCustomer(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Suppliers (strictly suppliers table)
  app.get('/api/suppliers', (req: Request, res: Response) => {
    try {
      res.json(db.getSuppliers());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/suppliers', (req: Request, res: Response) => {
    try {
      const created = db.createSupplier(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/suppliers/:id', (req: Request, res: Response) => {
    try {
      const updated = db.updateSupplier(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Supplier not found' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/suppliers/:id', (req: Request, res: Response) => {
    try {
      db.deleteSupplier(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Sales Invoices
  app.get('/api/invoices', (req: Request, res: Response) => {
    try {
      res.json(db.getInvoices());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/invoices/:id', (req: Request, res: Response) => {
    try {
      const inv = db.getInvoiceById(req.params.id);
      if (!inv) return res.status(404).json({ error: 'Invoice not found' });
      res.json(inv);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/invoices', (req: Request, res: Response) => {
    try {
      const { items, ...invoiceData } = req.body;
      if (!items || !items.length) {
        return res.status(400).json({ error: 'Invoice must have at least one line item' });
      }
      const created = db.createInvoiceWithItems(invoiceData, items);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/invoices/:id/pay', (req: Request, res: Response) => {
    try {
      const { amount, date, notes } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid payment amount is required' });
      }
      const updated = db.recordInvoicePayment(req.params.id, Number(amount), date, notes);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/invoices/:id', (req: Request, res: Response) => {
    try {
      db.deleteInvoice(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Purchase Bills
  app.get('/api/purchase-bills', (req: Request, res: Response) => {
    try {
      res.json(db.getPurchaseBills());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/purchase-bills/:id', (req: Request, res: Response) => {
    try {
      const pb = db.getPurchaseBillById(req.params.id);
      if (!pb) return res.status(404).json({ error: 'Purchase bill not found' });
      res.json(pb);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/purchase-bills', (req: Request, res: Response) => {
    try {
      const { items, fileHash, ...billData } = req.body;
      if (!items || !items.length) {
        return res.status(400).json({ error: 'Purchase bill must have at least one line item' });
      }
      const created = db.createPurchaseBillWithItems(billData, items, fileHash);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/purchase-bills/:id/pay', (req: Request, res: Response) => {
    try {
      const { amount } = req.body;
      const updated = db.recordPurchaseBillPayment(req.params.id, Number(amount));
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/purchase-bills/:id', (req: Request, res: Response) => {
    try {
      db.deletePurchaseBill(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Expenses
  app.get('/api/expenses', (req: Request, res: Response) => {
    try {
      res.json(db.getExpenses());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/expenses', (req: Request, res: Response) => {
    try {
      const created = db.createExpense(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/expenses/:id', (req: Request, res: Response) => {
    try {
      db.deleteExpense(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // AI Document Ingestion
  app.post('/api/documents/ingest', async (req: Request, res: Response) => {
    try {
      const { filename, fileType, fileSize, fileBase64, documentText, autoPost } = req.body;
      if (!filename) {
        return res.status(400).json({ error: 'Filename is required' });
      }

      const result = await processDocumentIngestion({
        filename,
        fileType: fileType || 'application/pdf',
        fileSize: fileSize || (fileBase64 ? Math.round(fileBase64.length * 0.75) : 1024),
        fileBase64,
        documentText,
        autoPostIfHighConfidence: autoPost,
      });

      res.status(200).json(result);
    } catch (err: any) {
      console.error('Ingestion error:', err);
      res.status(500).json({ error: err.message || 'Failed to process document' });
    }
  });

  app.get('/api/documents/extractions', (req: Request, res: Response) => {
    try {
      res.json(db.getExtractions());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/documents/extractions/:id', (req: Request, res: Response) => {
    try {
      const ext = db.getExtractionById(req.params.id);
      if (!ext) return res.status(404).json({ error: 'Extraction not found' });
      res.json(ext);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/documents/extractions/:id/approve', (req: Request, res: Response) => {
    try {
      const result = db.postExtractionToLedger(req.params.id, req.body.overrides);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // GST & Tax Intelligence
  app.get('/api/gst/summary', (req: Request, res: Response) => {
    try {
      res.json(db.getGSTSummary());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Integrations & Exports (Tally XML, CSV)
  app.get('/api/integrations/export/:format', (req: Request, res: Response) => {
    const format = req.params.format;
    const invoices = db.getInvoices();

    if (format === 'tally-xml') {
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', 'attachment; filename="ozio-tally-export.xml"');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        ${invoices
          .map(
            (inv) => `
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create">
            <DATE>${inv.issue_date.replace(/-/g, '')}</DATE>
            <VOUCHERNUMBER>${inv.invoice_number}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${inv.customer?.company_name || inv.customer?.name}</PARTYLEDGERNAME>
            <AMOUNT>-${inv.total_amount}</AMOUNT>
            <NARRATION>${inv.notes || 'Sales invoice created via Ozio'}</NARRATION>
          </VOUCHER>
        </TALLYMESSAGE>`
          )
          .join('')}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
      return res.send(xml);
    }

    // Default CSV
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ozio-sales-register.csv"');
    const header = 'Invoice Number,Date,Due Date,Customer Name,Customer GSTIN,Taxable Amount,CGST,SGST,IGST,Total Amount,Status\n';
    const rows = invoices.map((i) =>
      `"${i.invoice_number}","${i.issue_date}","${i.due_date}","${i.customer?.company_name || i.customer?.name}","${i.customer?.gstin || ''}",${i.taxable_amount},${i.cgst_amount},${i.sgst_amount},${i.igst_amount},${i.total_amount},"${i.status}"`
    ).join('\n');

    res.send(header + rows);
  });

  // Mount Vite in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Ozio Financial Operations] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
