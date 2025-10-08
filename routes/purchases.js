import { Router } from 'express';
import { createPurchase } from '../controllers/purchaseController.js';

const router = Router();

router.post('/', createPurchase);

export default router;


