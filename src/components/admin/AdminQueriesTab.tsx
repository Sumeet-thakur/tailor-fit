import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageCircle, Send, Loader2, Shield, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { superAdminSupportService } from '@/services/adminSupport';
import type { AdminSupportMessage, AdminSupportConversationListItem } from '@/services/adminSupport';
import { connectChatSocket } from '@/lib/chatSocket';
import {
  onAdminSupportMessage,
  joinAdminSupportAsSuperAdmin,
  leaveAdminSupportAsSuperAdmin,
} from '@/lib/adminSupportSocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AdminQueriesTabProps {
  onConversationViewed?: () => void;
}

export function AdminQueriesTab({ onConversationViewed }: AdminQueriesTabProps) {
  const { token } = useAuth();
  const [conversations, setConversations] = useState<AdminSupportConversationListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminSupportMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef(selectedId);
  const prevSelectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await superAdminSupportService.getConversations(token);
      setConversations(data || []);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchMessages = useCallback(
    async (silent = false) => {
      if (!token || !selectedId) return;
      if (!silent) setMessagesLoading(true);
      try {
        const data = await superAdminSupportService.getMessages(selectedId, token);
        setMessages(data || []);
        if (!silent) {
          setConversations((prev) =>
            prev.map((c) =>
              c._id === selectedId ? { ...c, unreadCount: 0 } : c
            )
          );
          onConversationViewed?.();
        }
      } catch {
        setMessages([]);
      } finally {
        if (!silent) setMessagesLoading(false);
      }
    },
    [token, selectedId, onConversationViewed]
  );

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!selectedId) return;
    setConversations((prev) =>
      prev.map((c) => (c._id === selectedId ? { ...c, unreadCount: 0 } : c))
    );
    fetchMessages(false);
  }, [selectedId, fetchMessages]);

  useEffect(() => {
    if (!token) return;
    connectChatSocket(token);
    const unsubscribe = onAdminSupportMessage((msg) => {
      const isViewingConversation = msg.conversationId === selectedIdRef.current;

      if (isViewingConversation) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }

      if (msg.senderModel === 'Admin' && !isViewingConversation) {
        setConversations((prev) => {
          const exists = prev.some((c) => c._id === msg.conversationId);
          if (!exists) return prev;
          return prev.map((c) =>
            c._id === msg.conversationId
              ? { ...c, unreadCount: (c.unreadCount ?? 0) + 1 }
              : c
          );
        });
        onConversationViewed?.();
      }
    });
    return () => unsubscribe();
  }, [token, onConversationViewed]);

  useEffect(() => {
    if (!token) return;
    const prev = prevSelectedIdRef.current;
    if (prev) leaveAdminSupportAsSuperAdmin(prev);
    if (selectedId) joinAdminSupportAsSuperAdmin(selectedId, prev);
    prevSelectedIdRef.current = selectedId;
  }, [token, selectedId]);

  useEffect(() => {
    if (selectedId && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedId, messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || !selectedId || !token || sending) return;
    setInputValue('');
    setSending(true);
    try {
      const msg = await superAdminSupportService.sendMessage(selectedId, text, token);
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    } finally {
      setSending(false);
    }
  };

  const selected = conversations.find((c) => c._id === selectedId);
  const adminName =
    selected?.adminName ??
    (typeof selected?.adminId === 'object' && selected?.adminId
      ? (selected.adminId as { name?: string }).name
      : 'Admin');
  const adminEmail =
    selected?.adminEmail ??
    (typeof selected?.adminId === 'object' && selected?.adminId
      ? (selected.adminId as { email?: string }).email
      : '');
  const adminProfileImage =
    selected?.adminProfileImage ??
    (typeof selected?.adminId === 'object' && selected?.adminId
      ? (selected.adminId as { profileImage?: string }).profileImage
      : undefined);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-280px)] min-h-[400px]">
      <div className="lg:col-span-1 border border-border/50 rounded-xl bg-card overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
          <h3 className="font-display text-sm font-semibold text-foreground">Admin Queries</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No admin queries yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {conversations.map((c) => {
                const name =
                  c.adminName ??
                  (typeof c.adminId === 'object' && c.adminId
                    ? (c.adminId as { name?: string }).name
                    : 'Admin');
                const email =
                  c.adminEmail ??
                  (typeof c.adminId === 'object' && c.adminId
                    ? (c.adminId as { email?: string }).email
                    : '');
                const profileImage =
                  c.adminProfileImage ??
                  (typeof c.adminId === 'object' && c.adminId
                    ? (c.adminId as { profileImage?: string }).profileImage
                    : undefined);
                const unread = c.unreadCount ?? 0;
                return (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => setSelectedId(c._id)}
                    className={`relative w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                      selectedId === c._id ? 'bg-primary/10 border-l-2 border-primary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0" style={{ width: 40, height: 40 }}>
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {profileImage ? (
                            <img src={profileImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        {unread > 0 && (
                          <span
                            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-card z-10"
                            aria-label={`${unread} unread messages`}
                          >
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-foreground truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">{email}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-2 border border-border/50 rounded-xl bg-card overflow-hidden flex flex-col">
        {selectedId ? (
          <>
            <div className="px-4 py-3 border-b border-border/50 bg-muted/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                {adminProfileImage ? (
                  <img src={adminProfileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Shield className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-sm font-semibold text-foreground">{adminName}</h3>
                {adminEmail && (
                  <p className="text-xs text-muted-foreground truncate">{adminEmail}</p>
                )}
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {messagesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m._id}
                    className={`flex ${m.senderModel === 'SuperAdmin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                        m.senderModel === 'SuperAdmin'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                      <p
                        className={`text-[10px] mt-1 ${
                          m.senderModel === 'SuperAdmin'
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
              className="flex gap-2 p-3 border-t border-border/50 bg-muted/20"
            >
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type a reply..."
                className="flex-1"
                disabled={sending}
                maxLength={2000}
              />
              <Button type="submit" size="icon" disabled={!inputValue.trim() || sending}>
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            <p>Select a conversation to view and reply</p>
          </div>
        )}
      </div>
    </div>
  );
}
