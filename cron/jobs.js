import cron from 'node-cron';
import { getExpiringBatches, getLowStockBatches } from '../services/inventoryService.js';
import { queueNotification, processPendingNotifications } from '../services/notificationService.js';
import Setting from '../models/Setting.js';

const schedule = (expr, fn) => cron.schedule(expr, fn, { scheduled: false });

export const startCronJobs = () => {
  const expiryCheck = schedule('0 0 * * *', async () => {
    const settings = await Setting.findOne({}).lean();
    const days = settings?.expiryAlertDays || 15;
    const batches = await getExpiringBatches(days);
    for (const b of batches) {
      await queueNotification({ to: 'admin', channel: 'whatsapp', templateName: 'expiry_alert', payload: { batchNo: b.batchNo } });
    }
  });

  const lowStockCheck = schedule('0 * * * *', async () => {
    const batches = await getLowStockBatches();
    for (const b of batches) {
      await queueNotification({ to: 'admin', channel: 'whatsapp', templateName: 'low_stock', payload: { batchNo: b.batchNo, qty: b.quantity } });
    }
  });

  const prescriptionReminders = schedule('*/30 * * * *', async () => {
    // Placeholder for reminders
  });

  const retryFailed = schedule('*/15 * * * *', async () => {
    await processPendingNotifications();
  });

  expiryCheck.start();
  lowStockCheck.start();
  prescriptionReminders.start();
  retryFailed.start();
};


