import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Bell, CheckCheck, Loader2, ShoppingCart, MessageCircle,
    Users, HelpCircle, Settings, Package, XCircle
} from 'lucide-react';
import { useAdminNotifications } from '@/context/AdminNotificationContext';
import type { AdminNotification } from '@/services/adminNotifications';

/** Map notification type to icon */
const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    new_order: ShoppingCart,
    order_update: Package,
    order_cancelled: XCircle,
    new_customer: Users,
    chat_message: MessageCircle,
    admin_support: HelpCircle,
    system: Settings,
};

/** Map notification type to color theme */
const typeColors: Record<string, { bg: string; icon: string; dot: string }> = {
    new_order: { bg: 'bg-emerald-500/15', icon: 'text-emerald-600', dot: 'bg-emerald-500' },
    order_update: { bg: 'bg-blue-500/15', icon: 'text-blue-600', dot: 'bg-blue-500' },
    order_cancelled: { bg: 'bg-red-500/15', icon: 'text-red-600', dot: 'bg-red-500' },
    new_customer: { bg: 'bg-purple-500/15', icon: 'text-purple-600', dot: 'bg-purple-500' },
    chat_message: { bg: 'bg-amber-500/15', icon: 'text-amber-600', dot: 'bg-amber-500' },
    admin_support: { bg: 'bg-cyan-500/15', icon: 'text-cyan-600', dot: 'bg-cyan-500' },
    system: { bg: 'bg-gray-500/15', icon: 'text-gray-600', dot: 'bg-gray-500' },
};

const DEFAULT_COLORS = { bg: 'bg-primary/10', icon: 'text-primary', dot: 'bg-primary' };

/** Map notification type to admin dashboard tab for navigation */
function getTargetTab(n: AdminNotification): string | null {
    if (n.link?.tab) return n.link.tab;
    switch (n.type) {
        case 'new_order':
        case 'order_update':
        case 'order_cancelled':
            return 'orders';
        case 'chat_message':
            return 'chat';
        case 'admin_support':
            return 'admin-queries';
        case 'new_customer':
            return 'customers';
        default:
            return null;
    }
}

interface AdminNotificationPanelProps {
    onNavigateTab?: (tab: string) => void;
}

export function AdminNotificationPanel({ onNavigateTab }: AdminNotificationPanelProps) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
        useAdminNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
    const [panelPosition, setPanelPosition] = useState<{ top: number; right: number } | null>(null);

    const handleOpen = useCallback(() => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPanelPosition({
                top: rect.bottom + 16,
                right: window.innerWidth - rect.right,
            });
        }
        setIsOpen(true);
    }, []);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        setIsExiting(true);
    }, []);

    const handleNotificationClick = useCallback(
        (n: AdminNotification) => {
            markAsRead(n._id);
            handleClose();
            const targetTab = getTargetTab(n);
            if (targetTab && onNavigateTab) {
                onNavigateTab(targetTab);
            }
        },
        [markAsRead, onNavigateTab, handleClose]
    );

    const handleMarkAllRead = useCallback(() => {
        markAllAsRead();
    }, [markAllAsRead]);

    // Escape key closes panel
    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, handleClose]);

    // Position tracking on resize/scroll
    useEffect(() => {
        if (!isOpen && !isExiting) return;

        const updatePosition = () => {
            const isMobile = window.innerWidth < 700;
            if (isMobile) {
                setPanelPosition({ top: 72, right: 0 });
            } else if (buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                setPanelPosition({
                    top: rect.bottom + 16,
                    right: window.innerWidth - rect.right,
                });
            }
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen, isExiting]);

    const effectivePosition = panelPosition ?? { top: 0, right: 0 };
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 700;

    // Animation
    useEffect(() => {
        if (!isOpen && isExiting) {
            const t = setTimeout(() => {
                setIsExiting(false);
                setHasAnimatedIn(false);
            }, 200);
            return () => clearTimeout(t);
        }
        if (isOpen) {
            setIsExiting(false);
            setHasAnimatedIn(false);
            const t = requestAnimationFrame(() => {
                requestAnimationFrame(() => setHasAnimatedIn(true));
            });
            return () => cancelAnimationFrame(t);
        }
    }, [isOpen, isExiting]);

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => (isOpen || isExiting ? handleClose() : handleOpen())}
                className={`relative p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all duration-300 ${isOpen ? 'bg-white/20 ring-1 ring-white' : ''}`}
                aria-label={`Admin Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-pulse-soft">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {(isOpen || isExiting) &&
                createPortal(
                    <>
                        <div
                            className={`fixed inset-0 z-[100] transition-opacity duration-300 ease-out ${isOpen && !isExiting && hasAnimatedIn
                                    ? 'opacity-100 pointer-events-auto'
                                    : 'opacity-0 pointer-events-none'
                                }`}
                            aria-hidden
                            onClick={handleClose}
                        />
                        <div
                            className={`fixed z-[110] transition-all duration-300 ease-out ${isOpen && !isExiting && hasAnimatedIn
                                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                                    : 'opacity-0 translate-y-2 pointer-events-none'
                                }`}
                            style={
                                isMobile
                                    ? {
                                        top: effectivePosition.top,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        width: '95%',
                                        maxWidth: '400px',
                                    }
                                    : {
                                        top: effectivePosition.top,
                                        right: effectivePosition.right,
                                    }
                            }
                        >
                            <div className="w-full sm:w-[400px] h-[520px] max-h-[80vh] rounded-2xl bg-white border border-primary/20 shadow-float overflow-hidden flex flex-col">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
                                    <h3 className="font-display text-sm font-semibold text-foreground">
                                        Admin Notifications
                                    </h3>
                                    {unreadCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleMarkAllRead}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                        >
                                            <CheckCheck className="w-3.5 h-3.5" />
                                            Mark all read
                                        </button>
                                    )}
                                </div>

                                <div className="overflow-y-auto flex-1">
                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : notifications.length === 0 ? (
                                        <div className="text-center py-12 px-4">
                                            <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                                            <p className="text-sm text-muted-foreground">No notifications yet</p>
                                        </div>
                                    ) : (
                                        <ul className="divide-y divide-border/50" role="list">
                                            {notifications.map((n) => {
                                                const Icon = typeIcons[n.type] ?? Bell;
                                                const colors = typeColors[n.type] ?? DEFAULT_COLORS;
                                                return (
                                                    <li key={n._id}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleNotificationClick(n)}
                                                            className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${!n.read ? 'bg-primary/5' : ''
                                                                }`}
                                                        >
                                                            <div
                                                                className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${colors.bg}`}
                                                            >
                                                                <Icon className={`w-4 h-4 ${colors.icon}`} />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p
                                                                    className={`text-sm font-medium ${!n.read
                                                                            ? 'text-foreground'
                                                                            : 'text-muted-foreground'
                                                                        }`}
                                                                >
                                                                    {n.title}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                                                    {n.message}
                                                                </p>
                                                                <p className="text-[11px] text-muted-foreground/80 mt-1">
                                                                    {new Date(n.createdAt).toLocaleDateString(
                                                                        'en-PK',
                                                                        {
                                                                            day: 'numeric',
                                                                            month: 'short',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit',
                                                                        }
                                                                    )}
                                                                </p>
                                                            </div>
                                                            {!n.read && (
                                                                <span
                                                                    className={`shrink-0 w-2 h-2 rounded-full mt-2 ${colors.dot}`}
                                                                />
                                                            )}
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>,
                    document.body
                )}
        </div>
    );
}
