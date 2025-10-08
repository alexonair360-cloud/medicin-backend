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

test('settings CRUD and low-stock detection', async () => {
  // Settings require auth in prod, but skipped in tests
  const put = await request(app).put('/api/settings').send({ lowStockThresholdGlobal: 5 }).expect(200);
  expect(put.body.lowStockThresholdGlobal).toBe(5);

  const med = await Medicine.create({ name: 'Folic Acid', defaultLowStockThreshold: 10 });
  const vendor = await Vendor.create({ name: 'CareCo' });
  await request(app).post('/api/purchases').send({
    vendorId: vendor._id.toString(),
    totalAmount: 100,
    paidAmount: 100,
    items: [{ medicineId: med._id.toString(), batchNo: 'S1', quantity: 8, unitPrice: 10, expiryDate: new Date(Date.now()+86400000*60) }],
  }).expect(201);

  const res = await request(app).get('/api/inventory/low-stock').expect(200);
  const nos = res.body.map(b => b.batchNo);
  expect(nos).toContain('S1');
});
