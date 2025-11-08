import express from 'express';
import { requestOTP, verifyOTP, resetPassword } from '../controllers/passwordResetController.js';

const router = express.Router();

// POST /api/password-reset/request-otp
router.post('/request-otp', requestOTP);

// POST /api/password-reset/verify-otp
router.post('/verify-otp', verifyOTP);

// POST /api/password-reset/reset
router.post('/reset', resetPassword);

export default router;
