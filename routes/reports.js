import { Router } from 'express';
import { salesReport, expiringBatches, lowStockReport } from '../controllers/reportController.js';

const router = Router();

router.get('/sales', salesReport);
router.get('/expiring-batches', expiringBatches);
router.get('/low-stock', lowStockReport);

export default router;


