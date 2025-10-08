import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

export const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

export const generateInvoicePdf = async (invoice, sale) => {
  const outDir = path.join(process.cwd(), 'invoices');
  ensureDir(outDir);
  const filePath = path.join(outDir, `${invoice.invoiceNumber}.pdf`);
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(20).text('Medical Shop Invoice', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Invoice: ${invoice.invoiceNumber}`);
  doc.text(`Date: ${new Date(invoice.generatedAt || Date.now()).toLocaleString()}`);
  doc.moveDown();
  doc.text('Items:');
  sale.items.forEach((it, idx) => {
    doc.text(`${idx + 1}. ${it.medicineId} | Batch: ${it.batchNo} | Qty: ${it.quantity} | Price: ${it.unitPrice}`);
  });
  doc.moveDown();
  doc.fontSize(14).text(`Total: ${invoice.amount}`, { align: 'right' });

  doc.end();
  await new Promise((resolve) => stream.on('finish', resolve));
  return filePath;
};


