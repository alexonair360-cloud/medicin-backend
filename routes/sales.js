import { Router } from 'express';
import { createSale } from '../controllers/salesController.js';

const router = Router();

router.post('/', createSale);

export default router;


