import express from 'express';
import { createSafepayTracker, handleSafepayWebhook, initiateSafepayRefund, verifySafepayCallback } from '../controllers/paymentController.js';
import { protectAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// Route: POST /api/payments/safepay/intent
// Description: Initiates a Safepay Tracker
// Access: Public (called by Checkout)
router.post('/safepay/intent', createSafepayTracker);

// Route: POST /api/payments/safepay/webhook
// Description: Receives updates from Safepay
// Access: Public (Webhook)
// No need for express.raw here since we use `req.rawBody` from `server/app.ts` global middleware
router.post('/safepay/webhook', handleSafepayWebhook);

// Route: POST /api/payments/safepay/refund
// Description: Initiates a refund for a paid order
// Access: Protected (Admin)
router.post('/safepay/refund', protectAdmin, initiateSafepayRefund);

// Route: POST /api/payments/safepay/verify-callback
// Description: Frontend fallback to verify a successful Safepay redirect
// Access: Public (called by PaymentCallback.tsx)
router.post('/safepay/verify-callback', verifySafepayCallback);

export default router;
