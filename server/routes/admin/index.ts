import express from 'express';
import authRoutes from './auth.js';
import customerRoutes from './customers.js';
import adminRoutes from './admins.js';
import chatRoutes from './chat.js';
import assetRoutes from './assets.js';
import orderRoutes from './orders.js';
import notificationRoutes from './notifications.js';
import promoRoutes from './promo.js';
import settingsRoutes from './settings.js';

const router = express.Router();

// Mount all sub-routes
// Since we're mounting this router on /api/admin, all sub-routes will be relative to that
// e.g., authRoutes (which has /login) becomes /api/admin/login
router.use('/', authRoutes);
router.use('/', customerRoutes);
router.use('/', adminRoutes);
router.use('/', chatRoutes);
router.use('/', assetRoutes);
router.use('/', orderRoutes);
router.use('/', notificationRoutes);
router.use('/', promoRoutes);
router.use('/settings', settingsRoutes);

export default router;
