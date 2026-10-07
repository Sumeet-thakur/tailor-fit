/**
 * Admin Notification Routes
 * GET    /api/admin/notifications         — list notifications for current admin
 * PATCH  /api/admin/notifications/:id/read — mark one as read
 * PATCH  /api/admin/notifications/read-all — mark all as read
 */
import express from 'express';
import AdminNotification from '../../models/AdminNotification.js';
import { protectAdmin } from '../../middleware/adminAuth.js';

const router = express.Router();

// All routes require admin authentication
router.use(protectAdmin);

/**
 * GET /api/admin/notifications
 * Returns notifications relevant to the current admin's role.
 * Super admins see all + super_admin targeted notifications.
 * Regular admins see all + admin targeted notifications.
 */
router.get('/notifications', async (req: any, res) => {
    try {
        const adminRole = req.admin?.role === 'super_admin' ? 'super_admin' : 'admin';
        const adminId = req.admin?._id?.toString();

        // Filter by recipientRole — admin sees 'all' + their role
        const roleFilter = adminRole === 'super_admin'
            ? { recipientRole: { $in: ['all', 'super_admin'] } }
            : { recipientRole: { $in: ['all', 'admin'] } };

        const notifications = await AdminNotification.find(roleFilter)
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        // Calculate unread count (notifications not in readBy for this admin)
        const unreadCount = notifications.filter(
            (n: any) => !n.readBy?.some((id: any) => id.toString() === adminId)
        ).length;

        // Map to client format with `read` boolean
        const data = notifications.map((n: any) => ({
            _id: n._id.toString(),
            type: n.type,
            title: n.title,
            message: n.message,
            link: n.link,
            metadata: n.metadata,
            recipientRole: n.recipientRole,
            read: n.readBy?.some((id: any) => id.toString() === adminId) ?? false,
            createdAt: n.createdAt,
        }));

        res.json({ data, unreadCount });
    } catch (err: any) {
        console.error('Failed to fetch admin notifications:', err);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
});

/**
 * PATCH /api/admin/notifications/:id/read
 * Mark a single notification as read for the current admin.
 */
router.patch('/notifications/:id/read', async (req: any, res) => {
    try {
        const adminId = req.admin?._id;
        if (!adminId) return res.status(401).json({ message: 'Unauthorized' });

        await AdminNotification.findByIdAndUpdate(req.params.id, {
            $addToSet: { readBy: adminId },
        });

        res.json({ success: true });
    } catch (err: any) {
        console.error('Failed to mark admin notification as read:', err);
        res.status(500).json({ message: 'Failed to mark as read' });
    }
});

/**
 * PATCH /api/admin/notifications/read-all
 * Mark all notifications as read for the current admin.
 */
router.patch('/notifications/read-all', async (req: any, res) => {
    try {
        const adminId = req.admin?._id;
        if (!adminId) return res.status(401).json({ message: 'Unauthorized' });

        const adminRole = req.admin?.role === 'super_admin' ? 'super_admin' : 'admin';
        const roleFilter = adminRole === 'super_admin'
            ? { recipientRole: { $in: ['all', 'super_admin'] } }
            : { recipientRole: { $in: ['all', 'admin'] } };

        await AdminNotification.updateMany(
            { ...roleFilter, readBy: { $ne: adminId } },
            { $addToSet: { readBy: adminId } }
        );

        res.json({ success: true });
    } catch (err: any) {
        console.error('Failed to mark all admin notifications as read:', err);
        res.status(500).json({ message: 'Failed to mark all as read' });
    }
});

export default router;
