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

test('expiring batches endpoint returns batches within window', async () => {
  const med = await Medicine.create({ name: 'Ibuprofen' });
  const vendor = await Vendor.create({ name: 'Wellness' });

  await request(app).post('/api/purchases').send({
    vendorId: vendor._id.toString(),
    totalAmount: 100,
    paidAmount: 100,
    items: [
      { medicineId: med._id.toString(), batchNo: 'X1', quantity: 5, unitPrice: 10, expiryDate: new Date(Date.now() + 86400000 * 5) },
      { medicineId: med._id.toString(), batchNo: 'X2', quantity: 5, unitPrice: 10, expiryDate: new Date(Date.now() + 86400000 * 40) },
    ],
  }).expect(201);

  const res = await request(app).get('/api/reports/expiring-batches?days=10').expect(200);
  const batchNos = res.body.map(b => b.batchNo);
  expect(batchNos).toContain('X1');
  expect(batchNos).not.toContain('X2');
});


