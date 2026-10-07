import type { Request, Response } from 'express';
import PromoCode from '../models/promoCode.js';

// POST /api/promo/validate — Public: validate a code at checkout
export const validatePromoCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code, orderAmount } = req.body;
        if (!code) {
            res.status(400).json({ success: false, message: 'Promo code is required' });
            return;
        }

        const promo = await PromoCode.findOne({ code: code.toUpperCase().trim() });

        if (!promo || !promo.isActive) {
            res.status(404).json({ success: false, message: 'Invalid or expired promo code' });
            return;
        }

        const now = new Date();
        if (promo.validUntil && new Date(promo.validUntil) < now) {
            res.status(400).json({ success: false, message: 'This promo code has expired' });
            return;
        }
        if (new Date(promo.validFrom) > now) {
            res.status(400).json({ success: false, message: 'This promo code is not active yet' });
            return;
        }
        if (promo.maxUses !== null && promo.maxUses !== undefined && promo.usedCount >= promo.maxUses) {
            res.status(400).json({ success: false, message: 'This promo code has reached its usage limit' });
            return;
        }
        if (orderAmount && orderAmount < promo.minOrderAmount) {
            res.status(400).json({
                success: false,
                message: `Minimum order amount for this code is Rs. ${promo.minOrderAmount.toLocaleString()}`,
            });
            return;
        }

        const discountAmount =
            promo.discountType === 'percentage'
                ? Math.round((orderAmount * promo.discountValue) / 100)
                : promo.discountValue;

        res.json({
            success: true,
            data: {
                code: promo.code,
                discountType: promo.discountType,
                discountValue: promo.discountValue,
                discountAmount,
                description: promo.description,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
};

// GET /api/admin/promo — Admin: list all codes
export const getAllPromoCodes = async (_req: Request, res: Response): Promise<void> => {
    try {
        const codes = await PromoCode.find().sort({ createdAt: -1 });
        res.json({ success: true, data: codes });
    } catch (error) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
};

// POST /api/admin/promo — Admin: create code
export const createPromoCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const promo = new PromoCode(req.body);
        await promo.save();
        res.status(201).json({ success: true, data: promo });
    } catch (error) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
};

// PATCH /api/admin/promo/:id — Admin: toggle active / update
export const updatePromoCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const promo = await PromoCode.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!promo) { res.status(404).json({ success: false, message: 'Not found' }); return; }
        res.json({ success: true, data: promo });
    } catch (error) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
};

// DELETE /api/admin/promo/:id — Admin: delete code
export const deletePromoCode = async (req: Request, res: Response): Promise<void> => {
    try {
        await PromoCode.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Promo code deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
};
