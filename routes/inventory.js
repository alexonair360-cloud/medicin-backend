import { Router } from 'express';
import { lowStock, stockSummary, latestBatchSummary, updateLatestBatch, addBatch, adjustStock, listBatches, updateBatch, deleteBatch, medicineStats } from '../controllers/inventoryController.js';

const router = Router();

router.get('/low-stock', lowStock);
router.get('/stock-summary', stockSummary);
router.get('/latest-batch-summary', latestBatchSummary);
router.post('/update-latest-batch', updateLatestBatch);
router.post('/add-batch', addBatch);
router.post('/adjust-stock', adjustStock);
// Batch CRUD
router.get('/batches', listBatches); // query: medicineId, vendorId
router.put('/batches/:id', updateBatch);
router.delete('/batches/:id', deleteBatch);
// Medicine stats (totals and expiring soon)
router.get('/medicine-stats', medicineStats); // query: expDays

export default router;


