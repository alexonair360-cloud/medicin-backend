import { Router } from 'express';
import { lowStock, stockSummary, latestBatchSummary, updateLatestBatch, addBatch, adjustStock } from '../controllers/inventoryController.js';

const router = Router();

router.get('/low-stock', lowStock);
router.get('/stock-summary', stockSummary);
router.get('/latest-batch-summary', latestBatchSummary);
router.post('/update-latest-batch', updateLatestBatch);
router.post('/add-batch', addBatch);
router.post('/adjust-stock', adjustStock);

export default router;


