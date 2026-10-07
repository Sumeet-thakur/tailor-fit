import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2, Package, CreditCard, Key, User, MessageCircle } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { useChat } from '@/context/ChatContext';
import type { Notification, NotificationLink } from '@/services/notifications';

function buildNotificationUrl(link?: NotificationLink): string {
  if (!link?.path) return '/account';
  if (!link.params || Object.keys(link.params).length === 0) return link.path;
  const search = new URLSearchParams(link.params).toString();
  return `${link.path}?${search}`;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  order_status: Package,
  payment_status: CreditCard,
  password_reset: Key,
  profile_update: User,
  chat_message: MessageCircle,
};

/** Order status colors with light transparency (matches TrackOrder, Account, Admin) */
const ORDER_STATUS_COLORS: Record<string, { bg: string; icon: string; dot: string }> = {
  pending: { bg: 'bg-yellow-500/15', icon: 'text-yellow-700', dot: 'bg-yellow-500' },
  confirmed: { bg: 'bg-blue-500/15', icon: 'text-blue-700', dot: 'bg-blue-500' },
  in_production: { bg: 'bg-purple-500/15', icon: 'text-purple-700', dot: 'bg-purple-500' },
  processing: { bg: 'bg-purple-500/15', icon: 'text-purple-700', dot: 'bg-purple-500' },
  ready: { bg: 'bg-green-500/15', icon: 'text-green-700', dot: 'bg-green-500' },
  shipped: { bg: 'bg-cyan-500/15', icon: 'text-cyan-700', dot: 'bg-cyan-500' },
  delivered: { bg: 'bg-emerald-500/15', icon: 'text-emerald-700', dot: 'bg-emerald-500' },
  cancelled: { bg: 'bg-red-500/15', icon: 'text-red-700', dot: 'bg-red-500' },
};

/** Payment status colors (matches paymentConstants) */
const PAYMENT_STATUS_COLORS: Record<string, { bg: string; icon: string; dot: string }> = {
  paid: { bg: 'bg-emerald-500/15', icon: 'text-emerald-700', dot: 'bg-emerald-500' },
  pending: { bg: 'bg-amber-500/15', icon: 'text-amber-700', dot: 'bg-amber-500' },
  unpaid: { bg: 'bg-amber-500/15', icon: 'text-amber-700', dot: 'bg-amber-500' },
  refunded: { bg: 'bg-red-500/15', icon: 'text-red-700', dot: 'bg-red-500' },
  failed: { bg: 'bg-red-500/15', icon: 'text-red-700', dot: 'bg-red-500' },
};

const DEFAULT_COLORS = { bg: 'bg-primary/10', icon: 'text-primary', dot: 'bg-primary' };

const LABEL_TO_ORDER_STATUS: Record<string, string> = {
  pending: 'pending',
  confirmed: 'confirmed',
  'in production': 'in_production',
  ready: 'ready',
  'ready for pickup': 'ready',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

function getNotificationColors(n: Notification): { bg: string; icon: string; dot: string } {
  let status = n.metadata?.status?.toLowerCase().replace(/\s+/g, '_');
  if (!status && n.type === 'order_status') {
    const m = n.message.match(/status is now:\s*(.+?)(?:\s*$|\.)/i);
    const label = m ? m[1].toLowerCase().trim() : '';
    status = LABEL_TO_ORDER_STATUS[label] ?? label.replace(/\s+/g, '_');
  }
  if (!status && n.type === 'payment_status') {
    const m = n.message.match(/status:\s*(\w+)/i);
    status = m ? m[1].toLowerCase() : undefined;
  }
  if (n.type === 'order_status' && status) {
    return ORDER_STATUS_COLORS[status] ?? ORDER_STATUS_COLORS.pending;
  }
  if (n.type === 'payment_status' && status) {
    return PAYMENT_STATUS_COLORS[status] ?? PAYMENT_STATUS_COLORS.pending;
  }
  if (n.type === 'password_reset') return { bg: 'bg-red-500/15', icon: 'text-red-700', dot: 'bg-red-500' };
  if (n.type === 'profile_update') return { bg: 'bg-primary/15', icon: 'text-primary', dot: 'bg-primary' };
  if (n.type === 'chat_message') return { bg: 'bg-accent/20', icon: 'text-primary', dot: 'bg-accent' };
  return DEFAULT_COLORS;
}

export function NotificationPanel() {
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const { openChat } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{ top: number; right: number } | null>(null);
  const [isScrolledToTop, setIsScrolledToTop] = useState(true);
  const [hiddenBadgeCount, setHiddenBadgeCount] = useState(0);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolledToTop(e.currentTarget.scrollTop < 10);
  }, []);

  const handleOpen = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPanelPosition({
        top: rect.bottom + 16,
        right: window.innerWidth - rect.right,
      });
    }
    setIsOpen(true);
    setIsScrolledToTop(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsExiting(true);
  }, []);

  const handleNotificationClick = useCallback(
    (n: Notification) => {
      if (!n.read) {
        markAsRead(n._id);
        setHiddenBadgeCount(prev => Math.max(0, prev - 1));
      }
      handleClose();
      if (n.type === 'chat_message') {
        openChat();
      } else {
        const url = buildNotificationUrl(n.link);
        navigate(url);
      }
    },
    [markAsRead, navigate, openChat, handleClose]
  );

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead();
    setHiddenBadgeCount(0);
  }, [markAllAsRead]);

  useEffect(() => {
    if (isOpen && isScrolledToTop) {
      setHiddenBadgeCount(unreadCount);
    }
  }, [isOpen, isScrolledToTop, unreadCount]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  // Update position on resize and scroll
  useEffect(() => {
    if ((!isOpen && !isExiting)) return;

    const updatePosition = () => {
      const isMobile = window.innerWidth < 700;

      if (isMobile) {
        // Center on mobile
        setPanelPosition({
          top: 72, // Below header approx
          right: 0 // Not used for mobile centered
        });
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

  const displayUnread = Math.max(0, unreadCount - hiddenBadgeCount);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen || isExiting ? handleClose() : handleOpen())}
        className={`relative p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 hover:ring-1 hover:ring-white transition-all duration-300  ${isOpen ? 'bg-white/20 ring-1 ring-white' : ''}`}
        aria-label={`Notifications${displayUnread > 0 ? ` (${displayUnread} unread)` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {displayUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
            {displayUnread > 99 ? '99+' : displayUnread}
          </span>
        )}
      </button>

      {(isOpen || isExiting) &&
        createPortal(
          <>
            <div
              className={`fixed inset-0 z-[100] transition-opacity duration-300 ease-out ${isOpen && !isExiting && hasAnimatedIn ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
              aria-hidden
              onClick={handleClose}
            />
            <div
              className={`fixed z-[110] transition-all duration-300 ease-out ${isOpen && !isExiting && hasAnimatedIn ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'}`}
              style={
                isMobile
                  ? {
                    top: effectivePosition.top,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '95%',
                    maxWidth: '400px'
                  }
                  : {
                    top: effectivePosition.top,
                    right: effectivePosition.right
                  }
              }
            >
              <div className="w-full sm:w-[400px] h-[520px] max-h-[80vh] rounded-2xl bg-white border border-primary/20 shadow-float overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
                  <h3 className="font-display text-md font-semibold text-foreground">
                    Notifications
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

                <div className="overflow-y-auto flex-1" onScroll={handleScroll}>
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
                        const colors = getNotificationColors(n);
                        return (
                          <li key={n._id}>
                            <button
                              type="button"
                              onClick={() => handleNotificationClick(n)}
                              className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${!n.read ? 'bg-primary/5' : ''}`}
                            >
                              <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${colors.bg}`}>
                                <Icon className={`w-4 h-4 ${colors.icon}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm font-medium ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {n.title}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                  {n.message}
                                </p>
                                <p className="text-[11px] text-muted-foreground/80 mt-1">
                                  {new Date(n.createdAt).toLocaleDateString('en-PK', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                              {!n.read && (
                                <span className={`shrink-0 w-2 h-2 rounded-full mt-2 ${colors.dot}`} />
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
