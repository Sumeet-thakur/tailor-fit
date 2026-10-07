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
import { chatService, type ChatMessage } from '@/services/chat';
import {
  connectChatSocket,
  disconnectChatSocket,
  onChatMessage,
} from '@/lib/chatSocket';

export type ChatMode = 'ai' | 'human';

interface ChatContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  unreadCount: number;
  chatMode: ChatMode;
  setChatMode: (mode: ChatMode) => void;
  markAsRead: () => void;
  openChat: () => void;
  registerOpenChat: (fn: () => void) => () => void;
  fetchMessages: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  escalateToHuman: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, token } = useCustomerAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>('ai');
  const [lastReadAt, setLastReadAt] = useState<Date | null>(null);
  const isInitialLoad = useRef(true);
  const openChatRef = useRef<(() => void) | null>(null);

  const registerOpenChat = useCallback((fn: () => void) => {
    openChatRef.current = fn;
    return () => {
      openChatRef.current = null;
    };
  }, []);

  const openChat = useCallback(() => {
    openChatRef.current?.();
  }, []);

  const fetchMessages = useCallback(
    async (silent = false) => {
      if (!token || !isAuthenticated) {
        setMessages([]);
        return;
      }

      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const data = await chatService.getMessages(token);
        setMessages(data || []);
        if (isInitialLoad.current) {
          setLastReadAt(new Date());
          isInitialLoad.current = false;
        }
      } catch (err: any) {
        setMessages([]);
        // Silently ignore 401 (expired/missing token) — not a user-facing error
        if (!silent && err?.status !== 401) setError('Failed to load messages');
      } finally {
        if (!silent) setIsLoading(false);
        isInitialLoad.current = false;
      }
    },
    [token, isAuthenticated]
  );

  const unreadCount = messages.filter(
    (m) =>
      m.senderModel === 'Admin' &&
      (!lastReadAt || new Date(m.createdAt) > lastReadAt)
  ).length;

  const markAsRead = useCallback(() => {
    setLastReadAt(new Date());
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!token || !content.trim()) return;

      setIsSending(true);
      setError(null);
      try {
        if (chatMode === 'ai') {
          const { customerMsg, aiMsg } = await chatService.sendAIMessage(content.trim(), token);
          setMessages((prev) => {
            const next = [...prev];
            if (!next.some((m) => m._id === customerMsg._id)) next.push(customerMsg);
            if (!next.some((m) => m._id === aiMsg._id)) next.push(aiMsg);
            return next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          });
        } else {
          const msg = await chatService.sendMessage(content.trim(), token);
          setMessages((prev) => {
            if (prev.some((m) => m._id === msg._id)) return prev;
            return [...prev, msg];
          });
        }
      } catch {
        setError('Failed to send message');
      } finally {
        setIsSending(false);
      }
    },
    [token, chatMode]
  );

  const escalateToHuman = useCallback(async () => {
    if (!token) return;
    try {
      await chatService.escalate(token);
      setChatMode('human');
    } catch {
      setError('Failed to connect to human support');
    }
  }, [token]);

  useEffect(() => {
    fetchMessages(false);
  }, [fetchMessages]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      disconnectChatSocket();
      return;
    }

    connectChatSocket(token);
    const unsubscribe = onChatMessage((msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });
    return () => {
      unsubscribe();
      disconnectChatSocket();
    };
  }, [isAuthenticated, token]);

  const value: ChatContextType = {
    messages,
    isLoading,
    isSending,
    error,
    unreadCount,
    chatMode,
    setChatMode,
    markAsRead,
    openChat,
    registerOpenChat,
    fetchMessages: () => fetchMessages(false),
    sendMessage,
    escalateToHuman,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return ctx;
}
