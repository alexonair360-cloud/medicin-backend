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

describe('Auth', () => {
  test('seed-admin then login returns token', async () => {
    const seed = await request(app)
      .post('/api/auth/seed-admin')
      .send({ username: 'admin', email: 'a@a.com', password: 'pass1234' })
      .expect(201);
    expect(seed.body.id).toBeDefined();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'pass1234' })
      .expect(200);
    expect(login.body.token).toBeDefined();
  });
});


