import { connectTestDB, closeTestDB } from './setupTestDB.js';
import { sendWhatsAppTemplate } from '../providers/whatsappMeta.js';

const enabled = !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TPL_LOW_STOCK);
const maybe = enabled ? test : test.skip;

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

maybe('sends low_stock WhatsApp template to demo recipient', async () => {
  const to = process.env.WHATSAPP_DEMO_TO; // e.g., 919902262397
  expect(to).toBeTruthy();
  const res = await sendWhatsAppTemplate({
    to,
    templateName: 'low_stock',
    payload: { medicineName: 'Paracetamol 500mg', qty: 3 },
  });
  expect(res.ok).toBe(true);
});


