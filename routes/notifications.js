import { Router } from 'express';
import { getNotifications, sendVendorSummary, sendCustomerReminder } from '../controllers/notificationController.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', authRequired, requireRole('admin'), getNotifications);
router.post('/vendors/:vendorId/send-summary', authRequired, requireRole('admin'), sendVendorSummary);
router.post('/customers/:customerId/send-reminder', authRequired, requireRole('admin'), sendCustomerReminder);

export default router;


