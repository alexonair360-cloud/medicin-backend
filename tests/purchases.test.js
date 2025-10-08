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

test('create purchase adds batches', async () => {
  const med = await Medicine.create({ name: 'Amoxicillin' });
  const vendor = await Vendor.create({ name: 'ABC Pharma' });

  const res = await request(app)
    .post('/api/purchases')
    .send({
      vendorId: vendor._id.toString(),
      totalAmount: 1000,
      paidAmount: 500,
      items: [
        { medicineId: med._id.toString(), batchNo: 'A1', quantity: 50, unitPrice: 10, mrp: 15, expiryDate: new Date(Date.now() + 86400000 * 60) },
      ],
    })
    .expect(201);

  expect(res.body._id).toBeDefined();
});


