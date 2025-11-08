import { Router } from 'express';
import { salesReport, expiringBatches, lowStockReport, exportSalesExcel, exportExpiryExcel, exportLowStockExcel } from '../controllers/reportController.js';

const router = Router();

router.get('/sales', salesReport);
router.get('/sales/export-excel', exportSalesExcel);
router.get('/expiring-batches', expiringBatches);
router.get('/expiring-batches/export-excel', exportExpiryExcel);
router.get('/low-stock', lowStockReport);
router.get('/low-stock/export-excel', exportLowStockExcel);

export default router;


