import { Router } from 'express';
import { listBills, getBill, createBill, deleteBill, emailBill } from '../controllers/billController.js';

const router = Router();

// GET /api/bills?customerId=
router.get('/', listBills);
// GET /api/bills/:id
router.get('/:id', getBill);
// POST /api/bills
router.post('/', createBill);
// DELETE /api/bills/:id
router.delete('/:id', deleteBill);
// POST /api/bills/:id/email
router.post('/:id/email', emailBill);

export default router;
