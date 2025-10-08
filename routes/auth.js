import { Router } from 'express';
import { login, seedAdmin } from '../controllers/authController.js';

const router = Router();

router.post('/login', login);
router.post('/seed-admin', seedAdmin);

export default router;


