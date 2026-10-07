import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useRef,
    type ReactNode,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    adminNotificationService,
    type AdminNotification,
} from '@/services/adminNotifications';
import { getChatSocket } from '@/lib/chatSocket';

const POLL_INTERVAL_MS = 60_000;

interface AdminNotificationContextType {
    notifications: AdminNotification[];
    unreadCount: number;
    isLoading: boolean;
    fetchNotifications: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

const AdminNotificationContext =
    createContext<AdminNotificationContextType | null>(null);

export function AdminNotificationProvider({
    children,
}: {
    children: ReactNode;
}) {
    const { token, admin } = useAuth();
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasFetchedRef = useRef(false);

    useEffect(() => {
        if (!token) hasFetchedRef.current = false;
    }, [token]);

    const fetchNotifications = useCallback(async () => {
        if (!token || token === 'legacy-token' || !admin) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        if (!hasFetchedRef.current) setIsLoading(true);
        try {
            const res = await adminNotificationService.getAll(token);
            setNotifications(res.data || []);
            setUnreadCount(res.unreadCount ?? 0);
            hasFetchedRef.current = true;
        } catch {
            setNotifications([]);
            setUnreadCount(0);
        } finally {
            setIsLoading(false);
        }
    }, [token, admin]);

    const markAsRead = useCallback(
        async (id: string) => {
            if (!token) return;
            try {
                await adminNotificationService.markAsRead(id, token);
                setNotifications((prev) =>
                    prev.map((n) => (n._id === id ? { ...n, read: true } : n))
                );
                setUnreadCount((c) => Math.max(0, c - 1));
            } catch {
                // ignore
            }
        },
        [token]
    );

    const markAllAsRead = useCallback(async () => {
        if (!token) return;
        try {
            await adminNotificationService.markAllAsRead(token);
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch {
            // ignore
        }
    }, [token]);

    // Initial fetch
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Socket.io: listen for real-time admin notifications
    useEffect(() => {
        if (!token || token === 'legacy-token' || !admin) return;

        const socket = getChatSocket();
        if (!socket) return;

        const handleNotification = (payload: any) => {
            // Check role relevance
            const adminRole =
                admin.role === 'super_admin' ? 'super_admin' : 'admin';
            if (
                payload.recipientRole !== 'all' &&
                payload.recipientRole !== adminRole
            ) {
                return; // Not for this admin's role
            }

            setNotifications((prev) => {
                const exists = prev.some((n) => n._id === payload._id);
                if (exists) return prev;
                const n: AdminNotification = {
                    _id: payload._id,
                    type: payload.type,
                    title: payload.title,
                    message: payload.message,
                    link: payload.link,
                    read: false,
                    recipientRole: payload.recipientRole,
                    createdAt: payload.createdAt,
                    metadata: payload.metadata,
                };
                return [n, ...prev];
            });
            setUnreadCount((c) => c + 1);
        };

        socket.on('admin:notification', handleNotification);
        return () => {
            socket?.off('admin:notification', handleNotification);
        };
    }, [token, admin]);

    // Fallback polling
    useEffect(() => {
        if (!token || token === 'legacy-token' || !admin) return;
        pollRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS);
        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [token, admin, fetchNotifications]);

    const value: AdminNotificationContextType = {
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
    };

    return (
        <AdminNotificationContext.Provider value={value}>
            {children}
        </AdminNotificationContext.Provider>
    );
}

export function useAdminNotifications() {
    const ctx = useContext(AdminNotificationContext);
    if (!ctx) {
        throw new Error(
            'useAdminNotifications must be used within AdminNotificationProvider'
        );
    }
    return ctx;
}
