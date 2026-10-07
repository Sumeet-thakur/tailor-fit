import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { notificationService, type Notification } from '@/services/notifications';
import {
  connectNotificationSocket,
  disconnectNotificationSocket,
  onNotification,
  isNotificationSocketConnected,
} from '@/lib/notificationSocket';

const POLL_INTERVAL_MS = 60_000; // Fallback polling when socket disconnected

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markChatNotificationsAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, token } = useCustomerAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasFetchedOnceRef = useRef(false);

  useEffect(() => {
    if (!token) hasFetchedOnceRef.current = false;
  }, [token]);

  const fetchNotifications = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Only show loading spinner on initial load, not on background refresh/polling
    if (!hasFetchedOnceRef.current) {
      setIsLoading(true);
    }
    try {
      const res = await notificationService.getAll(token);
      setNotifications(res.data || []);
      setUnreadCount(res.unreadCount ?? 0);
      hasFetchedOnceRef.current = true;
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [token, isAuthenticated]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!token) return;
      try {
        setNotifications((prev) => {
          const target = prev.find((n) => n._id === id);
          if (target && !target.read) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
          return prev.map((n) => (n._id === id ? { ...n, read: true } : n));
        });
        await notificationService.markAsRead(id, token);
      } catch {
        // ignore
      }
    },
    [token]
  );

  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      await notificationService.markAllAsRead(token);
    } catch {
      // ignore
    }
  }, [token]);

  const markChatNotificationsAsRead = useCallback(async () => {
    if (!token) return;
    try {
      setNotifications((prev) => {
        let modified = 0;
        const next = prev.map((n) => {
          if (n.type === 'chat_message' && !n.read) {
            modified++;
            return { ...n, read: true };
          }
          return n;
        });
        if (modified > 0) {
          setUnreadCount((c) => Math.max(0, c - modified));
        }
        return next;
      });
      await notificationService.markChatNotificationsAsRead(token);
    } catch {
      // ignore
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Socket.io: connect when authenticated, listen for real-time notifications
  useEffect(() => {
    if (!isAuthenticated || !token) {
      disconnectNotificationSocket();
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    connectNotificationSocket(token);
    const unsubscribe = onNotification((payload) => {
      setNotifications((prev) => {
        const exists = prev.some((n) => n._id === payload._id);
        if (exists) return prev;
        const n: Notification = {
          _id: payload._id,
          type: payload.type as Notification['type'],
          title: payload.title,
          message: payload.message,
          link: payload.link,
          read: payload.read,
          createdAt: payload.createdAt,
          metadata: payload.metadata,
        };
        return [n, ...prev];
      });
      setUnreadCount((c) => c + 1);
    });

    return () => {
      unsubscribe();
      disconnectNotificationSocket();
    };
  }, [isAuthenticated, token]);

  // Fallback polling when socket may be disconnected (less frequent)
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    // Delay check — give socket 5s to establish before deciding to poll
    const fallbackTimer = setTimeout(() => {
      if (!isNotificationSocketConnected()) {
        pollRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS);
      }
    }, 5000);

    return () => {
      clearTimeout(fallbackTimer);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [isAuthenticated, token, fetchNotifications]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    markChatNotificationsAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
}
