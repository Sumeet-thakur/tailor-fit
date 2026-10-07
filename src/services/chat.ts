/**
 * Chat service - Customer support chat API
 */
import { apiClient } from '@/lib/apiClient';

export interface Conversation {
  _id: string;
  customerId: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface ChatMessage {
  _id: string;
  conversationId: string;
  senderId?: string;
  senderModel: 'Customer' | 'Admin' | 'AI';
  content: string;
  createdAt: string;
  metadata?: { aiModelUsed?: string; tokensUsed?: number };
}

export interface ConversationListItem {
  _id: string;
  customerId: string | { _id: string; name: string; email: string; profileImage?: string };
  customerName?: string;
  customerEmail?: string;
  customerProfileImage?: string;
  lastMessageAt: string;
  createdAt: string;
  unreadCount?: number;
}

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

export const chatService = {
  /** Customer: get or create my conversation */
  getMyConversation: (token: string): Promise<Conversation> =>
    apiClient.get<Conversation>('/customers/chat/conversation', authHeaders(token)),

  /** Customer: get messages */
  getMessages: (
    token: string,
    opts?: { before?: string; limit?: number }
  ): Promise<ChatMessage[]> => {
    const params = new URLSearchParams();
    if (opts?.before) params.set('before', opts.before);
    if (opts?.limit) params.set('limit', String(opts.limit));
    const q = params.toString() ? `?${params}` : '';
    return apiClient.get<ChatMessage[]>(`/customers/chat/messages${q}`, authHeaders(token));
  },

  /** Customer: send message */
  sendMessage: (content: string, token: string): Promise<ChatMessage> =>
    apiClient.post<ChatMessage>('/customers/chat/messages', { content }, authHeaders(token)),

  /** Customer: send message to AI assistant (returns both customer + AI messages) */
  sendAIMessage: (content: string, token: string): Promise<{ customerMsg: ChatMessage; aiMsg: ChatMessage }> =>
    apiClient.post<{ customerMsg: ChatMessage; aiMsg: ChatMessage }>('/customers/chat/ai-message', { content }, authHeaders(token)),

  /** Customer: escalate to human support */
  escalate: (token: string): Promise<void> =>
    apiClient.post<void>('/customers/chat/escalate', {}, authHeaders(token)),
};

export const adminChatService = {
  /** Admin: count of conversations with unread messages (customers who have sent unread messages) */
  getUnreadTotal: (token: string): Promise<number> =>
    apiClient.get<number>('/admin/chat/unread-total', authHeaders(token)).then((r) => (typeof r === 'number' ? r : 0)),

  /** Admin: list all conversations */
  getConversations: (token: string): Promise<ConversationListItem[]> =>
    apiClient.get<ConversationListItem[]>('/admin/chat/conversations', authHeaders(token)),

  /** Admin: get messages for a conversation */
  getMessages: (
    conversationId: string,
    token: string,
    opts?: { before?: string; limit?: number }
  ): Promise<ChatMessage[]> => {
    const params = new URLSearchParams();
    if (opts?.before) params.set('before', opts.before);
    if (opts?.limit) params.set('limit', String(opts.limit));
    const q = params.toString() ? `?${params}` : '';
    return apiClient.get<ChatMessage[]>(
      `/admin/chat/conversations/${conversationId}/messages${q}`,
      authHeaders(token)
    );
  },

  /** Admin: send message */
  sendMessage: (
    conversationId: string,
    content: string,
    token: string
  ): Promise<ChatMessage> =>
    apiClient.post<ChatMessage>(
      `/admin/chat/conversations/${conversationId}/messages`,
      { content },
      authHeaders(token)
    ),
};
