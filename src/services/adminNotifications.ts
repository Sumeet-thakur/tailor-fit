/**
 * Admin Notification service - API calls for admin notifications
 */
import { apiClient } from '@/lib/apiClient';

export interface AdminNotificationLink {
    tab: string;
    params?: Record<string, string>;
}

export interface AdminNotification {
    _id: string;
    type: 'new_order' | 'order_update' | 'order_cancelled' | 'new_customer' | 'chat_message' | 'admin_support' | 'payment_received' | 'refund_processed' | 'system';
    title: string;
    message: string;
    link?: AdminNotificationLink;
    read: boolean;
    recipientRole: string;
    createdAt: string;
    metadata?: {
        status?: string;
        orderId?: string;
        customerId?: string;
        customerName?: string;
        conversationId?: string;
    };
}

export interface AdminNotificationsResponse {
    data: AdminNotification[];
    unreadCount: number;
}

const getAuthHeaders = (token: string): HeadersInit => ({
    Authorization: `Bearer ${token}`,
});

export const adminNotificationService = {
    getAll: async (token: string): Promise<AdminNotificationsResponse> => {
        const result = await apiClient.get<AdminNotificationsResponse>(
            '/admin/notifications',
            getAuthHeaders(token)
        );
        return result as AdminNotificationsResponse;
    },

    markAsRead: async (id: string, token: string): Promise<void> => {
        await apiClient.patch<unknown>(
            `/admin/notifications/${id}/read`,
            {},
            getAuthHeaders(token)
        );
    },

    markAllAsRead: async (token: string): Promise<void> => {
        await apiClient.patch<unknown>(
            '/admin/notifications/read-all',
            {},
            getAuthHeaders(token)
        );
    },
};
