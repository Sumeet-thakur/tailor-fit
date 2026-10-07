import express from 'express';
import { validatePromoCode } from '../controllers/promoCodeController.js';

const router = express.Router();

// Public: validate promo at checkout
router.post('/validate', validatePromoCode);

export default router;
