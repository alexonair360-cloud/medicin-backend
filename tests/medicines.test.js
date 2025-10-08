import request from 'supertest';
import app from '../server.js';
import { connectTestDB, closeTestDB, clearCollections } from './setupTestDB.js';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearCollections();
});

describe('Medicines', () => {
  test('create and list medicines', async () => {
    await request(app)
      .post('/api/medicines')
      .send({ name: 'Paracetamol', unit: 'tablet' })
      .expect(201);

    const list = await request(app)
      .get('/api/medicines')
      .expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body[0].name).toBe('Paracetamol');
  });
});


