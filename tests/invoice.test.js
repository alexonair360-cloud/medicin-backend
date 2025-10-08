import request from 'supertest';
import fs from 'fs';
import app from '../server.js';
import { connectTestDB, closeTestDB, clearCollections } from './setupTestDB.js';
import Medicine from '../models/Medicine.js';
import Vendor from '../models/Vendor.js';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearCollections();
});

test('sale generates invoice PDF and can download', async () => {
  const med = await Medicine.create({ name: 'Azithromycin' });
  const vendor = await Vendor.create({ name: 'PharmaCo' });

  await request(app).post('/api/purchases').send({
    vendorId: vendor._id.toString(),
    totalAmount: 100,
    paidAmount: 100,
    items: [
      { medicineId: med._id.toString(), batchNo: 'Z1', quantity: 5, unitPrice: 20, expiryDate: new Date(Date.now() + 86400000 * 60) },
    ],
  }).expect(201);

  const sale = await request(app).post('/api/sales').send({ items: [{ medicineId: med._id.toString(), quantity: 2 }] }).expect(201);
  const invoiceId = sale.body.invoice._id;
  expect(sale.body.invoice.pdfPath).toBeTruthy();
  expect(fs.existsSync(sale.body.invoice.pdfPath)).toBe(true);

  const dl = await request(app).get(`/api/invoices/${invoiceId}/download`).expect(200);
  expect(dl.headers['content-type']).toContain('application/pdf');
});


