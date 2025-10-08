import request from 'supertest';
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

test('FEFO deduction across batches on sale', async () => {
  const med = await Medicine.create({ name: 'Cetirizine' });
  const vendor = await Vendor.create({ name: 'Good Health' });

  // Two batches: earlier expiry with qty 5, later expiry with qty 10
  await request(app).post('/api/purchases').send({
    vendorId: vendor._id.toString(),
    totalAmount: 150,
    paidAmount: 150,
    items: [
      { medicineId: med._id.toString(), batchNo: 'B1', quantity: 5, unitPrice: 10, expiryDate: new Date(Date.now() + 86400000 * 10) },
      { medicineId: med._id.toString(), batchNo: 'B2', quantity: 10, unitPrice: 10, expiryDate: new Date(Date.now() + 86400000 * 30) },
    ],
  }).expect(201);

  const saleRes = await request(app).post('/api/sales').send({
    items: [ { medicineId: med._id.toString(), quantity: 7 } ],
  }).expect(201);

  expect(saleRes.body.sale.items[0].batchNo).toContain('B1');
});


