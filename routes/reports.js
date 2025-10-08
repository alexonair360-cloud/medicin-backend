import { Router } from 'express';
import { salesReport, expiringBatches } from '../controllers/reportController.js';

const router = Router();

router.get('/sales', salesReport);
router.get('/expiring-batches', expiringBatches);

export default router;


