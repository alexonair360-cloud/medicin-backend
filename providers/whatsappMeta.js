import fetch from 'node-fetch';

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v22.0';

export const sendWhatsAppTemplate = async ({ to, templateName, payload }) => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) {
    throw new Error('Missing WhatsApp credentials');
  }

  // Map our internal templateName to your approved WhatsApp template
  const template = mapTemplate(templateName, payload);

  const recipient = String(to || '').replace(/^\+/, '');

  const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'template',
      template,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WhatsApp send failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return { ok: true, id: data.messages?.[0]?.id };
};

const mapTemplate = (name, payload = {}) => {
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANG || 'en_US';

  // Allow overriding template names via env
  const tpl = {
    hello_world: process.env.WHATSAPP_TEMPLATE_DEFAULT || 'hello_world',
    low_stock: process.env.WHATSAPP_TPL_LOW_STOCK,
    expiry_alert: process.env.WHATSAPP_TPL_EXPIRY,
    vendor_summary: process.env.WHATSAPP_TPL_VENDOR_SUMMARY,
    customer_reminder: process.env.WHATSAPP_TPL_CUSTOMER_REMINDER,
  };

  // Build components for common templates if not provided
  const builders = {
    low_stock: (p) => ({
      name: tpl.low_stock || tpl.hello_world,
      language: { code: languageCode },
      components: [
        { type: 'body', parameters: [
          { type: 'text', text: String(p.medicineName || p.batchNo || 'Item') },
          { type: 'text', text: String(p.qty ?? p.quantity ?? '') },
        ]},
      ],
    }),
    expiry_alert: (p) => ({
      name: tpl.expiry_alert || tpl.hello_world,
      language: { code: languageCode },
      components: [
        { type: 'body', parameters: [
          { type: 'text', text: String(p.medicineName || p.batchNo || 'Item') },
          { type: 'text', text: String(p.expiryDate || '') },
        ]},
      ],
    }),
    vendor_summary: (p) => ({
      name: tpl.vendor_summary || tpl.hello_world,
      language: { code: languageCode },
      components: [
        { type: 'body', parameters: [
          { type: 'text', text: String(p.vendorName || '') },
          { type: 'text', text: String(p.totalPurchases || '') },
          { type: 'text', text: String(p.totalPaid || '') },
          { type: 'text', text: String(p.totalDue || '') },
        ]},
      ],
    }),
    customer_reminder: (p) => ({
      name: tpl.customer_reminder || tpl.hello_world,
      language: { code: languageCode },
      components: [
        { type: 'body', parameters: [
          { type: 'text', text: String(p.customerName || '') },
          { type: 'text', text: String(p.medicineName || '') },
          { type: 'text', text: String(p.daysRemaining || '') },
        ]},
      ],
    }),
  };

  if (payload.components) {
    return { name: tpl[name] || tpl.hello_world, language: { code: languageCode }, components: payload.components };
  }

  const builder = builders[name];
  if (builder) return builder(payload);

  return { name: tpl.hello_world, language: { code: languageCode } };
};


