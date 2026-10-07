import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Send, Loader2, X, User, Bot } from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ChatWidget() {
  const { isAuthenticated } = useCustomerAuth();
  const { messages, isLoading, isSending, error, unreadCount, chatMode, setChatMode, markAsRead, registerOpenChat, sendMessage, escalateToHuman } = useChat();
  const { markChatNotificationsAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const isScrolledToBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const atBottom = Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 10;
    setIsScrolledToBottom(atBottom);
    isScrolledToBottomRef.current = atBottom;
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsExiting(true);
  }, []);

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

  useEffect(() => {
    const unregister = registerOpenChat(() => setIsOpen(true));
    return unregister;
  }, [registerOpenChat]);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setIsScrolledToBottom(true);
      isScrolledToBottomRef.current = true;
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && scrollRef.current && isScrolledToBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isOpen, messages]);

  useEffect(() => {
    if (isOpen && isScrolledToBottom) {
      if (unreadCount > 0) markAsRead();
      markChatNotificationsAsRead();
    }
  }, [isOpen, isScrolledToBottom, markAsRead, markChatNotificationsAsRead, unreadCount]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isSending) return;
    setInputValue('');
    await sendMessage(text);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      {(isOpen || isExiting) && (
        <>
          <div
            className={`fixed inset-0 bg-black/20 z-40 lg:hidden transition-opacity duration-300 ease-out ${isOpen && !isExiting && hasAnimatedIn ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            aria-hidden
            onClick={handleClose}
          />
          <div
            className={`absolute right-0 mb-2 bottom-14 sm:bottom-16 w-[calc(100vw-2rem)] max-w-[380px] h-[480px] sm:h-[520px] max-h-[80vh] rounded-2xl bg-card border border-border/50 shadow-float overflow-hidden flex flex-col z-[55] transition-all duration-300 ease-out ${isOpen && !isExiting && hasAnimatedIn ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30 shrink-0" role="region" aria-label="Support chat">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-display text-sm font-semibold text-foreground">
                    Customer Support
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    {chatMode === 'ai' ? 'AI Assistant' : 'Human support'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4"
              onScroll={handleScroll}
            >
              <div className="space-y-3 min-h-full">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {messages.length === 0 && !error && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <p>Hi! I'm your AI assistant.</p>
                        <p className="mt-1">Ask about sizing, fabrics, orders, or customization.</p>
                        <p className="mt-1 text-xs">Need a human? Click &quot;Talk to a human&quot; below.</p>
                      </div>
                    )}
                    {messages.map((m) => (
                      <div
                        key={m._id}
                        className={`flex ${m.senderModel === 'Customer' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2 ${m.senderModel === 'Customer'
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted text-foreground rounded-bl-md'
                            }`}
                        >
                          {m.senderModel !== 'Customer' && (
                            <div className="flex items-center gap-1.5 mb-1">
                              {m.senderModel === 'AI' ? (
                                <Bot className="w-3 h-3 text-primary" />
                              ) : (
                                <User className="w-3 h-3 text-primary" />
                              )}
                              <span className="text-[10px] font-medium text-muted-foreground">
                                {m.senderModel === 'AI' ? 'AI Assistant' : 'Support'}
                              </span>
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                          <p
                            className={`text-[10px] mt-1 ${m.senderModel === 'Customer'
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                              }`}
                          >
                            {new Date(m.createdAt).toLocaleTimeString('en-PK', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {error && (
              <p className="px-4 py-1 text-xs text-destructive bg-destructive/10">{error}</p>
            )}

            {chatMode === 'ai' && (
              <div className="px-3 py-2 border-t border-border/50 bg-muted/20 shrink-0">
                <button
                  type="button"
                  onClick={escalateToHuman}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <User className="w-4 h-4" />
                  Talk to a human
                </button>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="flex gap-2 p-3 border-t border-border/50 bg-muted/20 shrink-0"
            >
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
                disabled={isSending}
                maxLength={2000}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputValue.trim() || isSending}
                className="shrink-0"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => (isOpen ? handleClose() : setIsOpen(true))}
        className={`relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 group  ${isOpen ? 'bg-primary text-white ring-1 ring-white hover:bg-primary/90 transition-all duration-300 ease-out' : 'bg-accent text-primary hover:bg-accent/90'}`}
        aria-label={isOpen ? 'Close chat' : `Open support chat${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        {!isOpen && unreadCount === 0 && (
          <span className="absolute flex h-full w-full inset-0 -z-10">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-20" style={{ animationDuration: '3s' }}></span>
          </span>
        )}
        <MessageCircle className="w-6 h-6 relative z-10" />
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow-md z-20">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
