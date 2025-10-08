import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingController.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', authRequired, requireRole('admin'), getSettings);
router.put('/', authRequired, requireRole('admin'), updateSettings);

export default router;


