/**
 * AdminPaymentsTab — Unified payment management panel.
 * Covers: payment overview, Safepay transactions, refunds, promo codes.
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { promoCodeService, type PromoCode } from '@/services/promoCode';
import { paymentService } from '@/services/payments';
import { formatPrice } from '@/lib/formatPrice';
import { getPaymentStatusInfo, formatPaymentMethodLabel } from '@/lib/paymentConstants';
import { PaymentStatusBadge } from '@/components/common/PaymentStatusBadge';
import { showSuccess, showError, showLoading } from '@/lib/toastHelpers';
import {
    CreditCard, RotateCcw, Plus, Trash2, ToggleLeft, ToggleRight,
    Shield, Tag, TrendingUp, RefreshCw, X, Loader2, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Order } from '@/types/order';

// ─── PROMO CODE FORM ──────────────────────────────────────────────────────────
const DEFAULT_PROMO_FORM = {
    code: '', discountType: 'percentage' as const, discountValue: 10,
    minOrderAmount: 0, maxUses: '', validUntil: '', description: '', isActive: true,
};

export function AdminPaymentsTab() {
    const { token } = useAuth();
    const [activeSection, setActiveSection] = useState<'overview' | 'promo'>('overview');

    // ── Payments state ──────────────────────────────────────────────────────────
    const [orders, setOrders] = useState<Order[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [gatewayFilter, setGatewayFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [refundingId, setRefundingId] = useState<string | null>(null);

    // ── Promo state ─────────────────────────────────────────────────────────────
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [promoLoading, setPromoLoading] = useState(false);
    const [showPromoForm, setShowPromoForm] = useState(false);
    const [promoForm, setPromoForm] = useState(DEFAULT_PROMO_FORM);
    const [promoSaving, setPromoSaving] = useState(false);

    const fetchOrders = useCallback(async () => {
        try {
            const data = await apiClient.get<Order[]>('/orders', token ? { Authorization: `Bearer ${token}` } : undefined);
            setOrders(data);
        } catch { /* silent */ } finally {
            setOrdersLoading(false);
        }
    }, [token]);

    const fetchPromos = useCallback(async () => {
        if (!token) return;
        setPromoLoading(true);
        try {
            const data = await promoCodeService.getAll(token);
            setPromoCodes(data);
        } catch { /* silent */ } finally {
            setPromoLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);
    useEffect(() => { if (activeSection === 'promo') fetchPromos(); }, [activeSection, fetchPromos]);

    // ── Metrics ─────────────────────────────────────────────────────────────────
    const safepayOrders = orders.filter(o => o.paymentGateway === 'safepay');
    const totalRevenueSafepay = safepayOrders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + (o.total || 0), 0);
    const pendingSafepay = safepayOrders.filter(o => o.paymentStatus === 'pending').length;
    const failedSafepay = safepayOrders.filter(o => o.paymentStatus === 'failed').length;

    // ── Filtered orders ──────────────────────────────────────────────────────────
    const filteredOrders = orders.filter(o => {
        const gwMatch = gatewayFilter === 'all' || o.paymentGateway === gatewayFilter || (gatewayFilter === 'none' && (!o.paymentGateway || o.paymentGateway === 'none'));
        const stMatch = statusFilter === 'all' || o.paymentStatus === statusFilter;
        return gwMatch && stMatch;
    });

    // ── Refund handler ───────────────────────────────────────────────────────────
    const handleRefund = async (orderId: string, orderNumber: string) => {
        if (!token) return;
        if (!confirm(`Initiate refund for order ${orderNumber}? This cannot be undone.`)) return;
        setRefundingId(orderId);
        const tid = showLoading('Initiating refund…');
        try {
            await paymentService.initiateSafepayRefund(orderId, token);
            showSuccess('Refund initiated successfully');
            fetchOrders();
        } catch (err: any) {
            showError(err?.message || 'Refund failed');
        } finally {
            setRefundingId(null);
        }
    };

    // ── Promo handlers ────────────────────────────────────────────────────────────
    const handleSavePromo = async () => {
        if (!token || !promoForm.code) return;
        setPromoSaving(true);
        try {
            await promoCodeService.create({
                ...promoForm,
                maxUses: promoForm.maxUses ? Number(promoForm.maxUses) : null,
                validUntil: promoForm.validUntil || null,
            } as any, token);
            showSuccess('Promo code created');
            setShowPromoForm(false);
            setPromoForm(DEFAULT_PROMO_FORM);
            fetchPromos();
        } catch (err: any) {
            showError(err?.message || 'Failed to create promo');
        } finally {
            setPromoSaving(false);
        }
    };

    const handleTogglePromo = async (promo: PromoCode) => {
        if (!token) return;
        try {
            await promoCodeService.update(promo._id, { isActive: !promo.isActive }, token);
            fetchPromos();
        } catch { showError('Failed to update promo'); }
    };

    const handleDeletePromo = async (id: string, code: string) => {
        if (!token || !confirm(`Delete promo code "${code}"?`)) return;
        try {
            await promoCodeService.delete(id, token);
            showSuccess('Promo code deleted');
            fetchPromos();
        } catch { showError('Failed to delete promo'); }
    };

    return (
        <div className="space-y-6">
            {/* Section Tabs */}
            <div className="flex gap-2 bg-muted/30 p-1 rounded-xl w-fit">
                {(['overview', 'promo'] as const).map(s => (
                    <button
                        key={s}
                        onClick={() => setActiveSection(s)}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${activeSection === s ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        {s === 'promo' ? '🎟 Promo Codes' : '💳 Payments'}
                    </button>
                ))}
            </div>

            {/* ── OVERVIEW ─────────────────────────────────────────────────────────── */}
            {activeSection === 'overview' && (
                <div className="space-y-6">
                    {/* Safepay KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Safepay Revenue', value: formatPrice(totalRevenueSafepay), icon: TrendingUp, color: 'green' },
                            { label: 'Total Safepay Txns', value: safepayOrders.length, icon: Shield, color: 'blue' },
                            { label: 'Pending', value: pendingSafepay, icon: RefreshCw, color: 'amber' },
                            { label: 'Failed', value: failedSafepay, icon: X, color: 'red' },
                        ].map(card => (
                            <div key={card.label} className="bg-white rounded-2xl border border-border/50 shadow-soft p-5">
                                <card.icon className={`w-5 h-5 text-${card.color}-500 mb-3`} />
                                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                                <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-3 items-center">
                        <Select value={gatewayFilter} onValueChange={setGatewayFilter}>
                            <SelectTrigger className="w-40 h-9 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Gateways</SelectItem>
                                <SelectItem value="safepay">Safepay</SelectItem>
                                <SelectItem value="none">Manual (COD/Bank)</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-40 h-9 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {['all', 'pending', 'paid', 'failed', 'refunded', 'pending_verification'].map(s => (
                                    <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <button onClick={fetchOrders} className="h-9 px-3 rounded-lg border border-border/50 hover:bg-muted/30 text-sm text-muted-foreground flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" /> Refresh
                        </button>
                    </div>

                    {/* Payments Table */}
                    <div className="bg-white rounded-2xl border border-border/50 shadow-soft overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border/50 bg-muted/20">
                                        {['Order', 'Customer', 'Amount', 'Method', 'Gateway', 'Status', 'Actions'].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {ordersLoading ? (
                                        <tr><td colSpan={7} className="text-center py-12 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
                                    ) : filteredOrders.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No payments found</td></tr>
                                    ) : filteredOrders.map(order => (
                                        <tr key={order._id} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs font-medium">{order.orderNumber}</td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-foreground text-xs">{order.customer?.name}</p>
                                                <p className="text-muted-foreground text-[10px]">{order.customer?.email}</p>
                                            </td>
                                            <td className="px-4 py-3 font-semibold">{formatPrice(order.total || 0)}</td>
                                            <td className="px-4 py-3 text-xs capitalize">{formatPaymentMethodLabel(order.paymentMethod || '')}</td>
                                            <td className="px-4 py-3">
                                                {order.paymentGateway === 'safepay' ? (
                                                    <span className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full w-fit">
                                                        <Shield className="w-3 h-3" /> Safepay
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <PaymentStatusBadge paymentStatus={order.paymentStatus} paymentMethod={order.paymentMethod} variant="inline" showHint={false} />
                                            </td>
                                            <td className="px-4 py-3">
                                                {order.paymentGateway === 'safepay' && order.paymentStatus === 'paid' && (
                                                    <button
                                                        onClick={() => handleRefund(order._id, order.orderNumber || order._id)}
                                                        disabled={refundingId === order._id}
                                                        className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        {refundingId === order._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                                        Refund
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── PROMO CODES ───────────────────────────────────────────────────────── */}
            {activeSection === 'promo' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">Promo Codes & Vouchers</h3>
                        <Button size="sm" onClick={() => setShowPromoForm(true)} className="gap-2">
                            <Plus className="w-4 h-4" /> New Code
                        </Button>
                    </div>

                    {/* Create Promo Dialog */}
                    <Dialog open={showPromoForm} onOpenChange={setShowPromoForm}>
                        <DialogContent className="max-w-md">
                            <DialogHeader><DialogTitle>Create Promo Code</DialogTitle></DialogHeader>
                            <div className="space-y-4 pt-2">
                                <div>
                                    <label className="text-sm font-medium">Code *</label>
                                    <Input value={promoForm.code} onChange={e => setPromoForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="WELCOME20" className="mt-1 uppercase tracking-wider" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-sm font-medium">Discount Type</label>
                                        <Select value={promoForm.discountType} onValueChange={v => setPromoForm(p => ({ ...p, discountType: v as any }))}>
                                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                                <SelectItem value="fixed">Fixed (Rs.)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Value *</label>
                                        <Input type="number" value={promoForm.discountValue} onChange={e => setPromoForm(p => ({ ...p, discountValue: Number(e.target.value) }))} className="mt-1" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-sm font-medium">Min Order (Rs.)</label>
                                        <Input type="number" value={promoForm.minOrderAmount} onChange={e => setPromoForm(p => ({ ...p, minOrderAmount: Number(e.target.value) }))} className="mt-1" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Max Uses</label>
                                        <Input type="number" value={promoForm.maxUses} onChange={e => setPromoForm(p => ({ ...p, maxUses: e.target.value }))} placeholder="Unlimited" className="mt-1" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Valid Until</label>
                                    <Input type="date" value={promoForm.validUntil} onChange={e => setPromoForm(p => ({ ...p, validUntil: e.target.value }))} className="mt-1" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Description (shown to customer)</label>
                                    <Input value={promoForm.description} onChange={e => setPromoForm(p => ({ ...p, description: e.target.value }))} placeholder="e.g. 20% off on first order" className="mt-1" />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <Button onClick={handleSavePromo} disabled={promoSaving || !promoForm.code} className="flex-1 gap-2">
                                        {promoSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Code
                                    </Button>
                                    <Button variant="outline" onClick={() => setShowPromoForm(false)}>Cancel</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Promo Codes List */}
                    <div className="bg-white rounded-2xl border border-border/50 shadow-soft overflow-hidden">
                        {promoLoading ? (
                            <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
                        ) : promoCodes.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground text-sm">No promo codes yet</div>
                        ) : (
                            <div className="divide-y divide-border/30">
                                {promoCodes.map(promo => (
                                    <div key={promo._id} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${promo.isActive ? 'bg-green-50 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                                                <Tag className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm font-mono tracking-wider">{promo.code}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {promo.discountType === 'percentage' ? `${promo.discountValue}% off` : `Rs. ${promo.discountValue} off`}
                                                    {promo.minOrderAmount > 0 && ` · Min Rs. ${promo.minOrderAmount.toLocaleString()}`}
                                                    {promo.maxUses && ` · ${promo.usedCount}/${promo.maxUses} used`}
                                                    {promo.validUntil && ` · Until ${new Date(promo.validUntil).toLocaleDateString()}`}
                                                </p>
                                                {promo.description && <p className="text-xs text-muted-foreground italic">{promo.description}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button onClick={() => handleTogglePromo(promo)} className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors" title={promo.isActive ? 'Deactivate' : 'Activate'}>
                                                {promo.isActive ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5" />}
                                            </button>
                                            <button onClick={() => handleDeletePromo(promo._id, promo.code)} className="p-2 hover:bg-red-50 rounded-full text-red-500 hover:text-red-600 transition-colors" title="Delete">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
