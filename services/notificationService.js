import Notification from '../models/Notification.js';
import { sendWhatsAppTemplate } from '../providers/whatsappMeta.js';

export const queueNotification = async ({ to, channel, templateName, payload }) => {
  return Notification.create({ to, channel, templateName, payload, status: 'pending' });
};

export const listNotifications = async () => {
  return Notification.find({}).sort({ createdAt: -1 }).lean();
};

export const markAsSent = async (id) => {
  return Notification.findByIdAndUpdate(id, { status: 'sent' }, { new: true });
};

export const sendViaProvider = async (notification) => {
  const provider = process.env.MSG_PROVIDER || 'mock';
  if (provider === 'meta' && notification.channel === 'whatsapp') {
    return sendWhatsAppTemplate({
      to: notification.to,
      templateName: notification.templateName,
      payload: notification.payload,
    });
  }
  // Default mock
  await new Promise(r => setTimeout(r, 5));
  return { ok: true, provider: 'mock' };
};

export const processPendingNotifications = async () => {
  const pending = await Notification.find({ status: 'pending' }).limit(20).lean();
  for (const n of pending) {
    try {
      const res = await sendViaProvider(n);
      await Notification.findByIdAndUpdate(n._id, { status: 'sent', payload: { ...n.payload, provider: res.provider } });
    } catch (e) {
      await Notification.findByIdAndUpdate(n._id, { status: 'failed' });
    }
  }
};


