import { Router } from 'express';
import { vendorStatement, listVendors, getVendor, createVendor, updateVendor, deleteVendor } from '../controllers/vendorController.js';
import { listVendorOrders, createVendorOrder, getVendorOrder, updateVendorOrder, deleteVendorOrder, outstandingSummary, outstandingForVendor } from '../controllers/vendorOrderController.js';

const router = Router();

// CRUD
router.get('/', listVendors);
// Static route must come before param routes
router.get('/outstanding-summary', outstandingSummary);
router.get('/:id', getVendor);
router.post('/', createVendor);
router.put('/:id', updateVendor);
router.delete('/:id', deleteVendor);

// Additional features
router.get('/:vendorId/statement', vendorStatement);
router.get('/:vendorId/outstanding', outstandingForVendor);

// Nested Orders for a Vendor
router.get('/:vendorId/orders', listVendorOrders);
router.post('/:vendorId/orders', createVendorOrder);
router.get('/:vendorId/orders/:id', getVendorOrder);
router.put('/:vendorId/orders/:id', updateVendorOrder);
router.delete('/:vendorId/orders/:id', deleteVendorOrder);

export default router;


