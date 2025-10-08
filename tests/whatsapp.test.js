import { connectTestDB, closeTestDB } from './setupTestDB.js';
import { sendWhatsAppTemplate } from '../providers/whatsappMeta.js';

const maybe = (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) ? test : test.skip;

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

maybe('sends a WhatsApp hello_world template to the configured recipient', async () => {
  const to = process.env.WHATSAPP_DEMO_TO; // e.g., 919902262397
  expect(to).toBeTruthy();
  const res = await sendWhatsAppTemplate({ to, templateName: 'hello_world', payload: {} });
  expect(res.ok).toBe(true);
});


