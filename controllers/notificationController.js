import { listNotifications, queueNotification } from '../services/notificationService.js';

export const getNotifications = async (req, res, next) => {
  try {
    const data = await listNotifications();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const sendVendorSummary = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { channel = 'whatsapp' } = req.body || {};
    const n = await queueNotification({ to: vendorId, channel, templateName: 'vendor_summary', payload: {} });
    res.status(201).json(n);
  } catch (err) {
    next(err);
  }
};

export const sendCustomerReminder = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const { channel = 'whatsapp' } = req.body || {};
    const n = await queueNotification({ to: customerId, channel, templateName: 'customer_reminder', payload: {} });
    res.status(201).json(n);
  } catch (err) {
    next(err);
  }
};


