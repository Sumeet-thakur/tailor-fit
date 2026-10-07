/**
 * Admin Support service - Admin ↔ Super Admin messaging API
 */
import { apiClient } from '@/lib/apiClient';

export interface AdminSupportConversation {
  _id: string;
  adminId: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface AdminSupportMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  senderModel: 'Admin' | 'SuperAdmin';
  content: string;
  createdAt: string;
}

export interface AdminSupportConversationListItem {
  _id: string;
  adminId: string | { _id: string; name: string; email: string; profileImage?: string };
  adminName?: string;
  adminEmail?: string;
  adminProfileImage?: string;
  lastMessageAt: string;
  createdAt: string;
  unreadCount?: number;
}

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

export const adminSupportService = {
  /** Admin: get or create my support conversation */
  getMyConversation: (token: string): Promise<AdminSupportConversation> =>
    apiClient.get<AdminSupportConversation>('/admin/support/conversation', authHeaders(token)),

  /** Admin: get my support messages */
  getMessages: (
    token: string,
    opts?: { before?: string; limit?: number }
  ): Promise<AdminSupportMessage[]> => {
    const params = new URLSearchParams();
    if (opts?.before) params.set('before', opts.before);
    if (opts?.limit) params.set('limit', String(opts.limit));
    const q = params.toString() ? `?${params}` : '';
    return apiClient.get<AdminSupportMessage[]>(`/admin/support/messages${q}`, authHeaders(token));
  },

  /** Admin: send support message */
  sendMessage: (content: string, token: string): Promise<AdminSupportMessage> =>
    apiClient.post<AdminSupportMessage>('/admin/support/messages', { content }, authHeaders(token)),
};

export const superAdminSupportService = {
  /** Super Admin: unread total (conversations with unread) */
  getUnreadTotal: (token: string): Promise<number> =>
    apiClient.get<number>('/admin/support/unread-total', authHeaders(token)).then((r) =>
      typeof r === 'number' ? r : 0
    ),

  /** Super Admin: list all admin support conversations */
  getConversations: (token: string): Promise<AdminSupportConversationListItem[]> =>
    apiClient.get<AdminSupportConversationListItem[]>('/admin/support/conversations', authHeaders(token)),

  /** Super Admin: get messages */
  getMessages: (
    conversationId: string,
    token: string,
    opts?: { before?: string; limit?: number }
  ): Promise<AdminSupportMessage[]> => {
    const params = new URLSearchParams();
    if (opts?.before) params.set('before', opts.before);
    if (opts?.limit) params.set('limit', String(opts.limit));
    const q = params.toString() ? `?${params}` : '';
    return apiClient.get<AdminSupportMessage[]>(
      `/admin/support/conversations/${conversationId}/messages${q}`,
      authHeaders(token)
    );
  },

  /** Super Admin: send reply */
  sendMessage: (
    conversationId: string,
    content: string,
    token: string
  ): Promise<AdminSupportMessage> =>
    apiClient.post<AdminSupportMessage>(
      `/admin/support/conversations/${conversationId}/messages`,
      { content },
      authHeaders(token)
    ),
};
