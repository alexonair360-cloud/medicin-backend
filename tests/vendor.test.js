import request from 'supertest';
import app from '../server.js';
import { connectTestDB, closeTestDB, clearCollections } from './setupTestDB.js';
import Vendor from '../models/Vendor.js';
import Medicine from '../models/Medicine.js';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearCollections();
});

test('vendor statement summarizes purchases and dues', async () => {
  const v = await Vendor.create({ name: 'LedgerCo' });
  const m = await Medicine.create({ name: 'Vit C' });
  await request(app).post('/api/purchases').send({
    vendorId: v._id.toString(),
    totalAmount: 200,
    paidAmount: 50,
    items: [{ medicineId: m._id.toString(), batchNo: 'L1', quantity: 10, unitPrice: 20, expiryDate: new Date(Date.now()+86400000*90) }],
  }).expect(201);

  const res = await request(app).get(`/api/vendors/${v._id.toString()}/statement`).expect(200);
  expect(res.body.totalPurchases).toBe(200);
  expect(res.body.totalPaid).toBe(50);
  expect(res.body.totalDue).toBe(150);
});
