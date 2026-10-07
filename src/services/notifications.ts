/**
 * Notification service - API calls for customer notifications
 */
import { apiClient } from '@/lib/apiClient';

export interface NotificationLink {
  path: string;
  params?: Record<string, string>;
}

export interface Notification {
  _id: string;
  type: 'order_status' | 'payment_status' | 'password_reset' | 'profile_update' | 'chat_message';
  title: string;
  message: string;
  link?: NotificationLink;
  read: boolean;
  createdAt: string;
  metadata?: { status?: string };
}

export interface NotificationsResponse {
  data: Notification[];
  unreadCount: number;
}

const getAuthHeaders = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
});

export const notificationService = {
  getAll: async (token: string, unreadOnly = false): Promise<NotificationsResponse> => {
    const params = unreadOnly ? '?unreadOnly=true' : '';
    const result = await apiClient.get<NotificationsResponse>(
      `/customers/notifications${params}`,
      getAuthHeaders(token)
    );
    return result as NotificationsResponse;
  },

  markAsRead: async (id: string, token: string): Promise<Notification> => {
    const result = await apiClient.patch<Notification>(
      `/customers/notifications/${id}/read`,
      {},
      getAuthHeaders(token)
    );
    return result as Notification;
  },

  markAllAsRead: async (token: string): Promise<void> => {
    await apiClient.patch<unknown>(
      '/customers/notifications/read-all',
      {},
      getAuthHeaders(token)
    );
  },

  markChatNotificationsAsRead: async (token: string): Promise<{ modifiedCount: number }> => {
    const res = await apiClient.patch<{ modifiedCount?: number }>(
      '/customers/notifications/read-by-type',
      { type: 'chat_message' },
      getAuthHeaders(token)
    );
    return { modifiedCount: (res as { modifiedCount?: number })?.modifiedCount ?? 0 };
  },
};
