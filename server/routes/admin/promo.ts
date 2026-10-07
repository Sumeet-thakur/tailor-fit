import express from 'express';
import { protectAdmin, requireSuperAdmin } from '../../middleware/adminAuth.js';
import { getAllPromoCodes, createPromoCode, updatePromoCode, deletePromoCode } from '../../controllers/promoCodeController.js';

const router = express.Router();

router.get('/promo', protectAdmin, getAllPromoCodes);
router.post('/promo', protectAdmin, createPromoCode);
router.patch('/promo/:id', protectAdmin, updatePromoCode);
router.delete('/promo/:id', protectAdmin, requireSuperAdmin, deletePromoCode);

export default router;
