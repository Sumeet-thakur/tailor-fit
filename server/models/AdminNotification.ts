import mongoose from 'mongoose';

export type AdminNotificationType =
    | 'new_order'
    | 'order_update'
    | 'order_cancelled'
    | 'new_customer'
    | 'chat_message'
    | 'admin_support'
    | 'payment_received'
    | 'refund_processed'
    | 'system';

/**
 * Admin Notification Model
 * - adminId: specific admin who should see this notification (null = broadcast to all)
 * - recipientRole: 'all', 'super_admin', 'admin' — which role this targets
 * - readBy: array of admin IDs who have read the notification (shared notification model)
 */
const adminNotificationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['new_order', 'order_update', 'order_cancelled', 'new_customer', 'chat_message', 'admin_support', 'payment_received', 'refund_processed', 'system'],
        required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    metadata: {
        status: { type: String },
        orderId: { type: String },
        customerId: { type: String },
        customerName: { type: String },
        conversationId: { type: String },
        amount: { type: Number },
        gateway: { type: String },
    },
    link: {
        tab: { type: String }, // admin dashboard tab to navigate to
        params: { type: mongoose.Schema.Types.Mixed },
        path: { type: String }, // explicit path override
    },
    recipientRole: {
        type: String,
        enum: ['all', 'super_admin', 'admin'],
        default: 'all',
    },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
    }],
    createdAt: { type: Date, default: Date.now },
});

adminNotificationSchema.index({ createdAt: -1 });
adminNotificationSchema.index({ recipientRole: 1, createdAt: -1 });

const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);
export default AdminNotification;
