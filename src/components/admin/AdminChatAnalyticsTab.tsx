/**
 * Chat Analytics - Super admin only
 * Shows AI usage, escalation rate, token usage, and editable custom descriptions
 */
import { useState, useEffect, useCallback } from 'react';
import { Bot, TrendingUp, MessageCircle, ArrowUpRight, Plus, Edit, Trash2, Sparkles } from 'lucide-react';
import { adminService } from '@/services/admin';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface AnalyticsData {
  aiMessageCount: number;
  escalationCount: number;
  escalationRatePercent: string | number;
  totalTokensUsed: number;
  periodDays: number;
  modelName: string;
  provider: string;
}

interface AnalyticsDescription {
  id: string;
  text: string;
  createdAt: string;
}

const STORAGE_KEY = 'admin-chat-analytics-descriptions';

export function AdminChatAnalyticsTab(): JSX.Element {
  const { token } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState(7);
  const [descriptions, setDescriptions] = useLocalStorage<AnalyticsDescription[]>(STORAGE_KEY, []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newText, setNewText] = useState('');

  const fetchAnalytics = useCallback(async () => {
    if (!token || token === 'legacy-token') return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await adminService.getAIChatAnalytics(token, periodDays);
      setData(result);
    } catch {
      setError('Failed to load chat analytics');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [token, periodDays]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-32">
        <Bot className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-display text-xl font-medium">Failed to load analytics</h3>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button onClick={fetchAnalytics} className="mt-4 rounded-xl">
          Retry
        </Button>
      </div>
    );
  }

  const stats = data ?? {
    aiMessageCount: 0,
    escalationCount: 0,
    escalationRatePercent: 0,
    totalTokensUsed: 0,
    periodDays: 7,
    modelName: 'Gemini 2.5 Flash',
    provider: 'Google AI',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Chat Analytics</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Understand what users ask and how often they escalate to human support
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 14, 30].map((d) => (
            <Button
              key={d}
              variant={periodDays === d ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodDays(d)}
              className="rounded-xl"
            >
              {d} days
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={fetchAnalytics} className="rounded-xl">
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* AI Model Config */}
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group h-full flex flex-col justify-center">
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-5 transition-opacity">
            <Sparkles className="w-16 h-16" />
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-violet-500/10 flex items-center justify-center ring-1 ring-violet-500/20">
              <Sparkles className="w-6 h-6 text-violet-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stats.provider}</p>
              <p className="text-lg font-bold text-foreground truncate" title={stats.modelName}>{stats.modelName}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">250 RPD / 10 RPM</p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Messages Count */}
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm hover:shadow-md transition-all group h-full flex flex-col justify-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-bold text-foreground tabular-nums">{stats.aiMessageCount}</p>
              <p className="text-sm text-muted-foreground">Total AI Messages</p>
            </div>
          </div>
        </div>

        {/* Escalations Count */}
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm hover:shadow-md transition-all group h-full flex flex-col justify-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
              <ArrowUpRight className="w-6 h-6 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-bold text-foreground tabular-nums">{stats.escalationCount}</p>
              <p className="text-sm text-muted-foreground">Human Escalations</p>
            </div>
          </div>
        </div>

        {/* Escalation Rate */}
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm hover:shadow-md transition-all group h-full flex flex-col justify-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-bold text-foreground tabular-nums">{stats.escalationRatePercent}%</p>
              <p className="text-sm text-muted-foreground">Escalation Rate</p>
            </div>
          </div>
        </div>

        {/* Tokens Used */}
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm hover:shadow-md transition-all group h-full flex flex-col justify-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
              <MessageCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {stats.totalTokensUsed.toLocaleString()}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate" title="Check Google Cloud Console for quota">
                  Input + Output Tokens
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-muted/30 p-6">
        <h3 className="font-display font-semibold text-foreground mb-2">Insights</h3>
        <p className="text-sm text-muted-foreground">
          Over the last {stats.periodDays} days, customers sent {stats.aiMessageCount} messages to the AI
          assistant. {stats.escalationCount} of those conversations were escalated to human support
          ({stats.escalationRatePercent}% escalation rate). Use this data to improve the AI system prompt
          or identify common topics that need human support.
        </p>
      </div>

      {/* Custom Descriptions - Add, Edit, Remove */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold text-foreground">Custom Descriptions</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Add, edit, or remove analytics notes for your team</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsAddingNew(true);
              setNewText('');
            }}
            className="rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" /> Add
          </Button>
        </div>

        {isAddingNew && (
          <div className="flex gap-3 mb-4 p-4 bg-muted/30 rounded-xl border border-border/50">
            <div className="flex-1 space-y-2">
              <Label className="text-xs">New description</Label>
              <Input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="e.g. Q4: Focus on reducing escalation for shipping queries"
                className="rounded-xl"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                size="sm"
                onClick={() => {
                  if (newText.trim()) {
                    setDescriptions(prev => [
                      ...prev,
                      { id: crypto.randomUUID(), text: newText.trim(), createdAt: new Date().toISOString() },
                    ]);
                    setNewText('');
                    setIsAddingNew(false);
                  }
                }}
                className="rounded-xl"
              >
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setIsAddingNew(false); setNewText(''); }} className="rounded-xl">
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {descriptions.length === 0 && !isAddingNew ? (
            <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-xl">
              No custom descriptions yet. Click Add to create one.
            </p>
          ) : (
            descriptions.map((d) => (
              <div
                key={d.id}
                className="flex gap-3 items-start p-4 bg-muted/20 rounded-xl border border-border/50 group"
              >
                {editingId === d.id ? (
                  <>
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Edit description</Label>
                      <Input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (editText.trim()) {
                            setDescriptions(prev =>
                              prev.map((x) => (x.id === d.id ? { ...x, text: editText.trim() } : x))
                            );
                            setEditingId(null);
                            setEditText('');
                          }
                        }}
                        className="rounded-xl"
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          setEditText('');
                        }}
                        className="rounded-xl"
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="flex-1 text-sm text-foreground">{d.text}</p>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => {
                          setEditingId(d.id);
                          setEditText(d.text);
                        }}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm('Remove this description?')) {
                            setDescriptions(prev => prev.filter((x) => x.id !== d.id));
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
