import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import type { Types } from 'mongoose';
import Conversation from './models/Conversation.js';
import AdminSupportConversation from './models/AdminSupportConversation.js';

let io: Server | null = null;

export interface NotificationPayload {
  _id: string;
  type: string;
  title: string;
  message: string;
  link?: { path: string; params?: Record<string, string> };
  read: boolean;
  createdAt: string;
}

/** Chat message payload for socket emit (JSON-serializable) */
export interface ChatMessagePayload {
  _id: string;
  conversationId: string;
  senderId: string;
  senderModel: 'Customer' | 'Admin' | 'AI';
  content: string;
  createdAt: string;
  metadata?: { aiModelUsed?: string; tokensUsed?: number };
}

/** Admin support message payload (Admin ↔ SuperAdmin) */
export interface AdminSupportMessagePayload {
  _id: string;
  conversationId: string;
  senderId: string;
  senderModel: 'Admin' | 'SuperAdmin';
  content: string;
  createdAt: string;
}

export function initSocket(httpServer: HttpServer, corsOrigins: string[]): Server {
  // [Visual Context] Socket.io server initialization
  // [Action] Creates the WebSocket server with hardened production config
  // [Purpose] Prevents memory leaks from zombie connections and caps resource usage per socket
  io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST'],
    },

    // ─── Connection lifecycle — kill dead sockets fast ───────────────
    pingTimeout: 20_000,       // Kill connection if no pong within 20s
    pingInterval: 10_000,      // Send ping every 10s to detect dead clients
    connectTimeout: 10_000,    // Reject connections that don't handshake within 10s

    // ─── Resource caps — prevent payload-based memory bombs ─────────
    maxHttpBufferSize: 1e6,    // 1MB max message size (chat messages are ~1KB)

    // ─── Transport — WebSocket only, skip long-polling ──────────────
    // Long-polling creates 2 HTTP connections per socket instead of 1 WebSocket.
    // On a 4GB VPS with 1,200 users, this doubles file descriptors and RAM.
    // All modern browsers support WebSocket; polling is unnecessary overhead.
    transports: ['websocket'],
  });

  const JWT_SECRET = process.env.JWT_SECRET || 'tailor-fit-secret-key-2026';
  const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  io.on('connection', (socket) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      socket.disconnect(true);
      return;
    }

    // ─── Try customer JWT first ─────────────────────────────────────
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      const customerId = decoded.id;

      // Tag socket for disconnect cleanup
      socket.data.role = 'customer';
      socket.data.userId = customerId;

      socket.join(`customer:${customerId}`);

      if (!isProduction) {
        console.log(`[Socket] Customer connected: ${customerId} (${socket.id})`);
      }

      // Auto-join customer's conversation room for real-time chat
      Conversation.findOne({ customerId })
        .maxTimeMS(3000) // 3 second max execution guard
        .then((conv) => {
          if (conv) socket.join(`conversation:${conv._id.toString()}`);
        })
        .catch((err) => {
          console.error(`[socket] Failed to join conversation room for ${customerId}:`, err.message);
        });

      // ─── Customer disconnect cleanup ────────────────────────────────
      socket.on('disconnect', (reason) => {
        if (!isProduction) {
          console.log(`[Socket] Customer disconnected: ${customerId} (${socket.id}) — ${reason}`);
        }
        // Explicitly leave all rooms (Socket.io does this automatically, but doing it explicitly guarantees no leaks)
        for (const room of socket.rooms) {
          if (room !== socket.id) socket.leave(room);
        }
        // Clear socket.data to free any referenced objects from GC
        socket.data = {};
      });

      return;
    } catch {
      // Not a customer token — fall through to admin check
    }

    // ─── Try admin JWT ──────────────────────────────────────────────
    if (ADMIN_JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as { id: string; isAdmin?: boolean };
        if (decoded.isAdmin) {
          // Tag socket for disconnect cleanup
          socket.data.role = 'admin';
          socket.data.userId = decoded.id;
          socket.data.isAdmin = true;

          socket.join(`admin:${decoded.id}`);
          socket.join('admin:broadcast');

          if (!isProduction) {
            console.log(`[Socket] Admin connected: ${decoded.id} (${socket.id})`);
          }

          socket.on('admin:join-conversation', (conversationId: string) => {
            if (typeof conversationId === 'string' && conversationId) {
              socket.data.currentConversationId = conversationId;
              socket.join(`conversation:${conversationId}`);
            }
          });

          socket.on('admin:leave-conversation', (conversationId: string) => {
            if (typeof conversationId === 'string' && conversationId) {
              socket.leave(`conversation:${conversationId}`);
              if (socket.data.currentConversationId === conversationId) {
                socket.data.currentConversationId = null;
              }
            }
          });

          socket.on('admin:join-admin-support', (conversationId: string) => {
            if (typeof conversationId === 'string' && conversationId) {
              socket.join(`admin_support:${conversationId}`);
            }
          });

          socket.on('super_admin:join-admin-support', (conversationId: string) => {
            if (typeof conversationId === 'string' && conversationId) {
              socket.data.currentAdminSupportId = conversationId;
              socket.join(`admin_support:${conversationId}`);
            }
          });

          socket.on('super_admin:leave-admin-support', (conversationId: string) => {
            if (typeof conversationId === 'string' && conversationId) {
              socket.leave(`admin_support:${conversationId}`);
              if (socket.data.currentAdminSupportId === conversationId) {
                socket.data.currentAdminSupportId = null;
              }
            }
          });

          AdminSupportConversation.findOne({ adminId: decoded.id })
            .maxTimeMS(3000) // 3 second max execution guard
            .then((conv) => {
              if (conv) socket.join(`admin_support:${conv._id.toString()}`);
            })
            .catch((err) => {
              console.error(`[socket] Failed to join admin_support room for ${decoded.id}:`, err.message);
            });

          // ─── Admin disconnect cleanup ─────────────────────────────────
          socket.on('disconnect', (reason) => {
            if (!isProduction) {
              console.log(`[Socket] Admin disconnected: ${decoded.id} (${socket.id}) — ${reason}`);
            }
            // Explicitly leave all rooms
            for (const room of socket.rooms) {
              if (room !== socket.id) socket.leave(room);
            }
            // Clear socket.data to free any referenced objects
            socket.data = {};
          });

          return;
        }
      } catch {
        // Not an admin token
      }
    }

    socket.disconnect(true);
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}

export function emitNotificationToCustomer(
  customerId: Types.ObjectId,
  notification: NotificationPayload
): void {
  if (!io) return;
  const room = `customer:${customerId.toString()}`;
  io.to(room).emit('notification', notification);
}

/** Emit new chat message to the conversation room (customer + admin) */
export function emitChatMessage(
  conversationId: Types.ObjectId,
  message: ChatMessagePayload
): void {
  if (!io) return;
  const room = `conversation:${conversationId.toString()}`;
  io.to(room).emit('chat:message', message);

  /** When customer sends, also notify all admins for badge updates (they may not be in the room) */
  if (message.senderModel === 'Customer') {
    io.to('admin:broadcast').emit('chat:message', message);
  }
}

/** Emit admin support message (Admin ↔ SuperAdmin) */
export function emitAdminSupportMessage(
  conversationId: Types.ObjectId,
  message: AdminSupportMessagePayload
): void {
  if (!io) return;
  const room = `admin_support:${conversationId.toString()}`;
  io.to(room).emit('admin_support:message', message);

  if (message.senderModel === 'Admin') {
    io.to('admin:broadcast').emit('admin_support:message', message);
  }
}

/** Admin notification payload for socket emit (JSON-serializable) */
export interface AdminNotificationPayload {
  _id: string;
  type: string;
  title: string;
  message: string;
  link?: { tab?: string; params?: Record<string, string>; path?: string };
  metadata?: {
    status?: string;
    orderId?: string;
    customerId?: string;
    customerName?: string;
    conversationId?: string;
    amount?: number;
    gateway?: string;
  };
  recipientRole: string;
  readBy: string[];
  createdAt: string;
}

/** Emit admin notification to all connected admins */
export function emitAdminNotification(notification: AdminNotificationPayload): void {
  if (!io) return;
  io.to('admin:broadcast').emit('admin:notification', notification);
}
