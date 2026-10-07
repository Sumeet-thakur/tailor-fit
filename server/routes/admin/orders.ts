import express, { type Request, Response } from 'express';
import { deleteOrderWithAssets } from '../../utils/deleteHandlers.js';
import { protectAdmin, requireSuperAdmin } from '../../middleware/adminAuth.js';

const router = express.Router();

// Super Admin: Delete Order
router.delete('/orders/:id', protectAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id || typeof id !== 'string') {
            res.status(400).json({ success: false, message: 'Order ID required' });
            return;
        }
        const { deleted, assetsDeleted } = await deleteOrderWithAssets(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.json({ success: true, message: 'Order deleted permanently', assetsDeleted: assetsDeleted ?? 0 });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete order' });
    }
});

export default router;
