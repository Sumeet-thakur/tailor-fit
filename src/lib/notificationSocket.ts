/**
 * Socket.io client for real-time notifications.
 * Connects when customer is authenticated; emits 'notification' events.
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

export interface NotificationPayload {
  _id: string;
  type: string;
  title: string;
  message: string;
  link?: { path: string; params?: Record<string, string> };
  metadata?: { status?: string };
  read: boolean;
  createdAt: string;
}

export type NotificationListener = (notification: NotificationPayload) => void;

export function connectNotificationSocket(token: string): Socket {
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

export function disconnectNotificationSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function onNotification(listener: NotificationListener): () => void {
  if (!socket) return () => { };

  socket.on('notification', listener);
  return () => socket?.off('notification', listener);
}

export function isNotificationSocketConnected(): boolean {
  return socket?.connected ?? false;
}
