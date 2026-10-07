import type { Types } from 'mongoose';
import AdminNotification from '../models/AdminNotification.js';
import type { AdminNotificationType } from '../models/AdminNotification.js';
import { emitAdminNotification } from '../socket.js';

interface AdminNotificationLink {
    tab?: string; // admin dashboard tab
    params?: Record<string, string>;
    path?: string;
}

interface CreateAdminNotificationInput {
    type: AdminNotificationType;
    title: string;
    message: string;
    link?: AdminNotificationLink | string;
    metadata?: {
        status?: string;
        orderId?: string;
        customerId?: string;
        customerName?: string;
        conversationId?: string;
        amount?: number;
        gateway?: string;
    };
    recipientRole?: 'all' | 'super_admin' | 'admin';
}

/**
 * Create an admin notification. Saved to DB and emitted via socket.io
 * to the admin:broadcast room for real-time delivery.
 */
export async function createAdminNotification(input: CreateAdminNotificationInput): Promise<void> {
    const linkObj = typeof input.link === 'string' ? { path: input.link } : input.link;

    const doc = await AdminNotification.create({
        type: input.type,
        title: input.title,
        message: input.message,
        link: linkObj,
        metadata: input.metadata,
        recipientRole: input.recipientRole || 'all',
    });

    emitAdminNotification({
        _id: doc._id.toString(),
        type: doc.type,
        title: doc.title,
        message: doc.message,
        link: doc.link?.tab || doc.link?.path ? { tab: doc.link.tab ?? undefined, params: doc.link.params ?? undefined, path: doc.link.path ?? undefined } : undefined,
        metadata: doc.metadata ? {
            status: doc.metadata.status ?? undefined,
            orderId: doc.metadata.orderId ?? undefined,
            customerId: doc.metadata.customerId ?? undefined,
            customerName: doc.metadata.customerName ?? undefined,
            conversationId: doc.metadata.conversationId ?? undefined,
            amount: doc.metadata.amount ?? undefined,
            gateway: doc.metadata.gateway ?? undefined,
        } : undefined,
        recipientRole: doc.recipientRole,
        readBy: [],
        createdAt: doc.createdAt.toISOString(),
    });
}
