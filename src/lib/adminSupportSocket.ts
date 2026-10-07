/**
 * Socket.io client for Admin Support (Admin ↔ Super Admin).
 * Reuses same connection as chatSocket (admin token).
 */
import { connectChatSocket, getChatSocket } from './chatSocket';

export interface AdminSupportMessagePayload {
  _id: string;
  conversationId: string;
  senderId: string;
  senderModel: 'Admin' | 'SuperAdmin';
  content: string;
  createdAt: string;
}

export type AdminSupportMessageListener = (message: AdminSupportMessagePayload) => void;

export function joinAdminSupport(conversationId: string): void {
  const socket = getChatSocket();
  if (socket?.connected) {
    socket.emit('admin:join-admin-support', conversationId);
  }
}

export function joinAdminSupportAsSuperAdmin(
  conversationId: string,
  previousConversationId?: string | null
): void {
  const socket = getChatSocket();
  if (!socket?.connected) return;
  if (previousConversationId) {
    socket.emit('super_admin:leave-admin-support', previousConversationId);
  }
  socket.emit('super_admin:join-admin-support', conversationId);
}

export function leaveAdminSupportAsSuperAdmin(conversationId: string): void {
  const socket = getChatSocket();
  if (socket?.connected) {
    socket.emit('super_admin:leave-admin-support', conversationId);
  }
}

export function onAdminSupportMessage(listener: AdminSupportMessageListener): () => void {
  const socket = getChatSocket();
  if (!socket) return () => {};
  socket.on('admin_support:message', listener);
  return () => socket?.off('admin_support:message', listener);
}
