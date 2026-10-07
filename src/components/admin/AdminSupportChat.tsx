import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageCircle, Send, Loader2, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { adminSupportService } from '@/services/adminSupport';
import type { AdminSupportMessage } from '@/services/adminSupport';
import { connectChatSocket } from '@/lib/chatSocket';
import { joinAdminSupport, onAdminSupportMessage } from '@/lib/adminSupportSocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AdminSupportChat() {
  const { token } = useAuth();
  const [messages, setMessages] = useState<AdminSupportMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const conv = await adminSupportService.getMyConversation(token);
      setConversationId(conv._id);
      const data = await adminSupportService.getMessages(token);
      setMessages(data || []);
      joinAdminSupport(conv._id);
    } catch {
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!token) return;
    connectChatSocket(token);
    const unsubscribe = onAdminSupportMessage((msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });
    return () => {
      unsubscribe();
    };
  }, [token]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || !token || isSending) return;
    setInputValue('');
    setIsSending(true);
    try {
      const msg = await adminSupportService.sendMessage(text, token);
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-muted/30 rounded-t-xl">
        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">Contact Super Admin</h3>
          <p className="text-xs text-muted-foreground">Ask questions or report issues</p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No messages yet.</p>
            <p className="mt-1">Start a conversation with the Super Admin.</p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m._id}
              className={`flex ${m.senderModel === 'Admin' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                  m.senderModel === 'Admin'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-amber-500/20 text-foreground rounded-bl-md border border-amber-500/30'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    m.senderModel === 'Admin'
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
          ))
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="flex gap-2 p-3 border-t border-border/50 bg-muted/20 rounded-b-xl"
      >
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your message..."
          className="flex-1"
          disabled={isSending}
          maxLength={2000}
        />
        <Button type="submit" size="icon" disabled={!inputValue.trim() || isSending}>
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
