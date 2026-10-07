/**
 * Socket.io client for real-time chat messages.
 * Customer: auto-joins their conversation on connect.
 * Admin: joins/leaves conversation rooms via joinConversation/leaveConversation.
 */
import { io, type Socket } from 'socket.io-client';

const getSocketUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    try {
      const url = new URL(apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl);
      return `${url.protocol}//${url.host}`;
    } catch {
      return '';
    }
  }
  return '';
};

let socket: Socket | null = null;

export interface ChatMessagePayload {
  _id: string;
  conversationId: string;
  senderId: string;
  senderModel: 'Customer' | 'Admin';
  content: string;
  createdAt: string;
}

export type ChatMessageListener = (message: ChatMessagePayload) => void;

export function connectChatSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  const url = getSocketUrl() || undefined;
  socket = io(url, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket'],  // Match server — no long-polling overhead
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socket;
}

export function disconnectChatSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/** Admin only: join a conversation room to receive messages */
export function joinConversation(
  conversationId: string,
  previousConversationId?: string | null
): void {
  if (!socket?.connected) return;
  if (previousConversationId) {
    socket.emit('admin:leave-conversation', previousConversationId);
  }
  socket.emit('admin:join-conversation', conversationId);
}

/** Admin only: leave a conversation room */
export function leaveConversation(conversationId: string): void {
  if (socket?.connected) {
    socket.emit('admin:leave-conversation', conversationId);
  }
}

export function onChatMessage(listener: ChatMessageListener): () => void {
  if (!socket) return () => { };

  socket.on('chat:message', listener);
  return () => socket?.off('chat:message', listener);
}

export function isChatSocketConnected(): boolean {
  return socket?.connected ?? false;
}

/** Get the underlying socket (for admin support listeners) */
export function getChatSocket(): Socket | null {
  return socket;
}
