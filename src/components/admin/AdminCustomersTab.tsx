import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminService } from '@/services/admin';
import { orderService } from '@/services/orders';
import { ApiError } from '@/lib/apiClient';
import { showSuccess, showError } from '@/lib/toastHelpers';
import { formatPrice } from '@/lib/formatPrice';
import { getOrderStatusInfo, ORDER_STATUS_OPTIONS } from '@/lib/orderStatusUtils';
import { getPaymentStatusInfo } from '@/lib/paymentConstants';
import { PaymentStatusBadge, TransactionIdDisplay, AdminPaymentActions } from '@/components/common/PaymentStatusBadge';
import { printOrderReceipt } from '@/lib/printReceipt';
import { OrderSpecs } from '@/components/orders/OrderSpecs';
import {
    Users, UserCog, Mail, Phone, MapPin, Clock, Search, ArrowRight,
    Key, CreditCard, User, Truck, Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';

function getStatusBadgeClasses(status: string): string {
    const info = getOrderStatusInfo(status);
    return info.color || 'text-gray-600';
}

interface CustomerData {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    address?: { street?: string; city?: string; state?: string; postalCode?: string; country?: string };
    profileImage?: string;
    savedDesigns?: any[];
    savedMeasurements?: any[];
    orderCount?: number;
    createdAt?: string;
}

interface AdminCustomersTabProps {
    searchTerm: string;
}

export function AdminCustomersTab({ searchTerm }: AdminCustomersTabProps) {
    const { admin, token } = useAuth();

    const [customers, setCustomers] = useState<CustomerData[]>([]);
    const [customersLoading, setCustomersLoading] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
    const [customerOrders, setCustomerOrders] = useState<any[]>([]);
    const [customerStats, setCustomerStats] = useState({ total: 0, delivered: 0, cancelled: 0, active: 0, totalSpent: 0 });
    const [newCustomerPassword, setNewCustomerPassword] = useState('');
    const [customerOrderSearchTerm, setCustomerOrderSearchTerm] = useState('');

    // Nested order dialog
    const [isCustomerOrderDialogOpen, setIsCustomerOrderDialogOpen] = useState(false);
    const [selectedCustomerOrder, setSelectedCustomerOrder] = useState<any>(null);

    const orderStatuses = [...ORDER_STATUS_OPTIONS];

    const handleLogout = useCallback(() => {
        // Minimal — just for error handling (parent handles real logout)
    }, []);

    const fetchCustomers = useCallback(async () => {
        if (!token || token === 'legacy-token') return;
        setCustomersLoading(true);
        try {
            const data = await adminService.getCustomers(token);
            setCustomers(data);
        } catch (err) {
            const apiError = err as ApiError;
            if (apiError.status === 401) {
                showError('Session expired. Please login again.');
                handleLogout();
                return;
            }
            console.error('[Admin] fetchCustomers error:', apiError.message);
            showError(apiError.message || 'Failed to load customers');
        } finally {
            setCustomersLoading(false);
        }
    }, [token, handleLogout]);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const fetchCustomerDetails = async (customerId: string) => {
        if (!token || token === 'legacy-token') return;
        try {
            const data = await adminService.getCustomerDetails(customerId, token);
            setSelectedCustomer(data);
            setCustomerOrders(data.recentOrders || []);
            setCustomerStats(data.stats || {
                total: 0,
                delivered: 0,
                cancelled: 0,
                active: 0,
                totalSpent: 0
            });
        } catch (error) {
            const apiError = error as ApiError;
            showError(apiError.message || 'Failed to load customer details');
        }
    };

    const updateOrderStatus = async (orderId: string, status: string) => {
        if (!token || token === 'legacy-token') return;
        try {
            await orderService.updateStatus(orderId, status, token);
            showSuccess('Order status updated');

            // Update local state
            if (selectedCustomerOrder?._id === orderId) {
                setSelectedCustomerOrder((prev: any) => ({ ...prev, status }));
            }
            setCustomerOrders(prev => prev.map(o => o._id === orderId ? { ...o, status } : o));
        } catch (err: any) {
            showError(err.message || 'Failed to update status');
        }
    };

    const updatePaymentDetails = async (orderId: string, updates: any) => {
        try {
            const res = await fetch(`/api/orders/${orderId}/payment`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });
            const data = await res.json();
            if (data.success) {
                showSuccess('Payment details updated');
                // Update local state
                if (selectedCustomerOrder?._id === orderId) {
                    setSelectedCustomerOrder((prev: any) => prev ? { ...prev, ...updates } : null);
                }
                setCustomerOrders(prev => prev.map(o => o._id === orderId ? { ...o, ...updates } : o));
            } else {
                showError(data.message);
            }
        } catch (error) {
            showError('Failed to update payment details');
        }
    };

    const resetCustomerPassword = async (customerId: string, newPassword: string) => {
        if (!token || token === 'legacy-token') {
            showError('Admin authentication required');
            return;
        }
        try {
            const res = await fetch(`/api/admin/customers/${customerId}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ newPassword }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to reset password');
            showSuccess('Customer password reset successfully');
            setNewCustomerPassword('');
            setIsCustomerDialogOpen(false);
        } catch (err: any) {
            showError(err.message);
        }
    };

    if (customersLoading) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
        );
    }

    if (customers.length === 0) {
        return (
            <div className="text-center py-32">
                <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-display text-xl font-medium">No customers yet</h3>
                <p className="text-muted-foreground">Customers will appear here when they register</p>
                {token === 'legacy-token' && (
                    <p className="text-sm text-amber-600 mt-4">Login with API admin credentials to manage customers</p>
                )}
            </div>
        );
    }

    return (
        <>
            {/* Customers List (Vertical Cards) */}
            <div className="space-y-4">
                {customers.filter(c => !searchTerm ||
                    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((customer, i) => (
                    <div key={customer._id} className="bg-white p-5 rounded-2xl border border-border/50 shadow-soft hover:shadow-elevated transition-all duration-500 animate-fade-up motion-reduce:animate-none flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ animationDelay: `${i * 0.06}s` }}>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden border border-primary/10">
                                {customer.profileImage ? (
                                    <img src={customer.profileImage} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-primary font-display font-semibold text-xl">{customer.name?.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            <div>
                                <h4 className="font-display font-semibold text-foreground text-lg">{customer.name}</h4>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground mt-0.5">
                                    <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{customer.email}</span>
                                    {customer.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{customer.phone}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-0 pt-4 sm:pt-0 mt-2 sm:mt-0">
                            <div className="text-center sm:text-right">
                                <span className="block text-2xl font-bold text-primary">{customer.orderCount || 0}</span>
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Orders</span>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSelectedCustomer(customer);
                                    fetchCustomerDetails(customer._id);
                                    setIsCustomerDialogOpen(true);
                                }}
                                className="rounded-xl h-10 px-5 border-primary/20 hover:bg-primary/5 hover:text-primary hover:border-primary/50"
                            >
                                <UserCog className="w-4 h-4 mr-2" />
                                Manage Profile
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Customer Management Dialog */}
            <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
                <DialogContent hideCloseButton className="w-[95vw] max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl bg-white p-0 shadow-2xl border-none">
                    <DialogTitle className="sr-only">Customer Profile</DialogTitle>
                    <DialogDescription className="sr-only">View and manage customer profile details and order history.</DialogDescription>
                    {selectedCustomer && (
                        <>
                            {/* Profile Header */}
                            <div className="px-6 py-5 border-b sticky top-0 bg-white z-10 flex items-center gap-5 flex-shrink-0">
                                <div className="w-16 h-16 rounded-full bg-slate-50 p-1 shadow-sm border border-slate-200 shrink-0">
                                    <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                                        {selectedCustomer.profileImage ? (
                                            <img src={selectedCustomer.profileImage} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-slate-400 text-2xl font-display font-medium">{selectedCustomer.name?.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-display text-xl font-bold text-slate-900 truncate">{selectedCustomer.name}</h3>
                                    <div className="flex flex-col text-sm text-slate-500 mt-1 space-y-0.5">
                                        <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {selectedCustomer.email}</span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setIsCustomerDialogOpen(false)} className="rounded-full hover:bg-slate-100 self-start -mt-1 -mr-2">
                                    <span className="sr-only">Close</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 opacity-60"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </Button>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-8">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                                        <p className="text-2xl font-bold text-slate-900">{customerStats.total}</p>
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-1">Orders</p>
                                    </div>
                                    <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100 text-center">
                                        <p className="text-2xl font-bold text-green-600">{customerStats.delivered}</p>
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-green-600/70 mt-1">Delivered</p>
                                    </div>
                                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-center">
                                        <p className="text-2xl font-bold text-blue-600">{customerStats.active}</p>
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-blue-600/70 mt-1">Active</p>
                                    </div>
                                    <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 text-center">
                                        <p className="text-2xl font-bold text-rose-600">{customerStats.cancelled}</p>
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-rose-600/70 mt-1">Cancelled</p>
                                    </div>
                                </div>

                                {/* Detail List */}
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                                        <User className="w-4 h-4 text-primary" /> Contact & Address
                                    </h4>
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3 text-sm">
                                        <div className="flex items-start gap-3">
                                            <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                                            <div>
                                                <p className="font-medium text-slate-700">Phone Number</p>
                                                <p className="text-slate-500">{selectedCustomer.phone || 'Not provided'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 pt-3 border-t border-slate-200/50">
                                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                            <div>
                                                <p className="font-medium text-slate-700">Shipping Address</p>
                                                <p className="text-slate-500">
                                                    {[selectedCustomer.address?.street, selectedCustomer.address?.city, selectedCustomer.address?.state, selectedCustomer.address?.country, selectedCustomer.address?.postalCode].filter(Boolean).join(', ') || 'Not provided'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Order History List */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-primary" /> Order History
                                        </h4>
                                        <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded-lg text-slate-600">{customerOrders.length} Records</span>
                                    </div>

                                    <div className="relative mb-4">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            placeholder="Search orders..."
                                            value={customerOrderSearchTerm}
                                            onChange={(e) => setCustomerOrderSearchTerm(e.target.value)}
                                            className="pl-9 h-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                        />
                                    </div>

                                    {customerOrders.length > 0 ? (
                                        <div className="space-y-3">
                                            {customerOrders.filter(order =>
                                                order.orderNumber?.toLowerCase().includes(customerOrderSearchTerm.toLowerCase()) ||
                                                order.transactionId?.toLowerCase().includes(customerOrderSearchTerm.toLowerCase()) ||
                                                (typeof order.total === 'number' && order.total.toString().includes(customerOrderSearchTerm))
                                            ).map((order: any) => (
                                                <div
                                                    key={order._id}
                                                    onClick={() => {
                                                        setSelectedCustomerOrder(order);
                                                        setIsCustomerOrderDialogOpen(true);
                                                    }}
                                                    className="group flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                                                >
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-mono font-medium text-slate-700">{order.orderNumber}</span>
                                                            <div className={`w-2 h-2 rounded-full ${getStatusBadgeClasses(order.status).includes('green') ? 'bg-green-500' : 'bg-slate-300'}`} />
                                                            <span className="text-xs text-slate-500 capitalize">{order.status.replace('_', ' ')}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-400 mt-1">
                                                            {new Date(order.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-slate-900">{formatPrice(order.total || 0)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                            <p className="text-sm text-slate-500">No order history found.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Reset Password */}
                                <div className="bg-amber-50/50 rounded-xl border border-amber-100 p-5">
                                    <h4 className="flex items-center gap-2 font-semibold text-amber-800 mb-3 text-sm">
                                        <Key className="w-4 h-4" /> Reset Password
                                    </h4>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newCustomerPassword}
                                            onChange={(e) => setNewCustomerPassword(e.target.value)}
                                            placeholder="New password (min 6 chars)"
                                            className="bg-white border-amber-200 focus-visible:ring-amber-500/20 h-10 rounded-xl"
                                        />
                                        <Button
                                            onClick={() => resetCustomerPassword(selectedCustomer._id, newCustomerPassword)}
                                            disabled={!newCustomerPassword || newCustomerPassword.length < 6}
                                            className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 rounded-xl h-10"
                                        >
                                            Reset
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="px-6 py-5 border-t bg-slate-50 gap-2 sm:gap-0">
                                <Button variant="outline" onClick={() => setIsCustomerDialogOpen(false)} className="rounded-xl h-12 px-6">Close</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Nested Order Dialog for Customer View */}
            <Dialog open={isCustomerOrderDialogOpen} onOpenChange={setIsCustomerOrderDialogOpen}>
                <DialogContent hideCloseButton className="w-[95vw] max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl bg-white p-0 shadow-2xl border-none">
                    <DialogDescription className="sr-only">Detailed view of a specific customer order.</DialogDescription>
                    {selectedCustomerOrder && (
                        <>
                            <div className="px-6 py-5 border-b sticky top-0 bg-white z-10 flex items-center justify-between">
                                <div>
                                    <DialogTitle className="font-display text-lg font-bold text-slate-900">
                                        {selectedCustomerOrder.orderNumber}
                                    </DialogTitle>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        {new Date(selectedCustomerOrder.createdAt).toLocaleDateString('en-PK', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border ${getOrderStatusInfo(selectedCustomerOrder.status).bgColor} ${getStatusBadgeClasses(selectedCustomerOrder.status)} border-current opacity-90`}>
                                        {getOrderStatusInfo(selectedCustomerOrder.status).label}
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setIsCustomerOrderDialogOpen(false)} className="rounded-full hover:bg-slate-100">
                                        <span className="sr-only">Close</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 opacity-60"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
                                {/* Status Control */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">Update Status</p>
                                            <p className="text-xs text-slate-500">Notify customer of progress</p>
                                        </div>
                                    </div>
                                    <Select value={selectedCustomerOrder.status} onValueChange={(v) => updateOrderStatus(selectedCustomerOrder._id, v)}>
                                        <SelectTrigger className="w-full sm:w-48 h-10 rounded-xl border-slate-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {orderStatuses.map(s => (
                                                <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Order Details Grid */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                        <h4 className="flex items-center gap-2 font-semibold text-slate-900 pb-3 border-b border-slate-100">
                                            <User className="w-4 h-4 text-primary" /> Customer Info
                                        </h4>
                                        <div className="space-y-1 text-sm text-slate-600">
                                            <p><span className="font-medium text-slate-900">{selectedCustomerOrder.customer?.name}</span></p>
                                            <p>{selectedCustomerOrder.customer?.email}</p>
                                            <p>{selectedCustomerOrder.customer?.phone}</p>
                                        </div>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                        <h4 className="flex items-center gap-2 font-semibold text-slate-900 pb-3 border-b border-slate-100">
                                            <Truck className="w-4 h-4 text-primary" /> Shipping Info
                                        </h4>
                                        <div className="space-y-1 text-sm text-slate-600">
                                            <p>{selectedCustomerOrder.customer?.address?.street}</p>
                                            <p>{[selectedCustomerOrder.customer?.address?.city, selectedCustomerOrder.customer?.address?.state, selectedCustomerOrder.customer?.address?.country].filter(Boolean).join(', ')}</p>
                                            <p>{selectedCustomerOrder.customer?.address?.postalCode}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Information */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                        <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-primary" /> Payment Details
                                        </h4>
                                        <PaymentStatusBadge
                                            paymentStatus={selectedCustomerOrder.paymentStatus}
                                            paymentMethod={selectedCustomerOrder.paymentMethod}
                                            variant="card"
                                        />
                                    </div>
                                    <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-slate-500 text-xs">Payment Method</p>
                                            <p className="font-medium text-slate-900 capitalize">
                                                {selectedCustomerOrder.paymentMethod?.replace('_', ' ') || 'COD'}
                                            </p>
                                        </div>
                                        {selectedCustomerOrder.paymentGateway && selectedCustomerOrder.paymentGateway !== 'none' && (
                                            <div>
                                                <p className="text-slate-500 text-xs">Gateway</p>
                                                <p className="font-medium text-slate-900 capitalize">{selectedCustomerOrder.paymentGateway}</p>
                                            </div>
                                        )}
                                        {selectedCustomerOrder.transactionId && (
                                            <div className="col-span-2">
                                                <TransactionIdDisplay transactionId={selectedCustomerOrder.transactionId} />
                                            </div>
                                        )}
                                        <AdminPaymentActions
                                            orderId={selectedCustomerOrder._id}
                                            orderStatus={selectedCustomerOrder.status}
                                            paymentStatus={selectedCustomerOrder.paymentStatus}
                                            paymentMethod={selectedCustomerOrder.paymentMethod}
                                            paymentGateway={selectedCustomerOrder.paymentGateway}
                                            transactionId={selectedCustomerOrder.transactionId}
                                            updatePaymentDetails={updatePaymentDetails}
                                        />
                                    </div>
                                </div>

                                {/* Order Items */}
                                <OrderSpecs items={selectedCustomerOrder.items} />
                            </div>

                            <DialogFooter className="px-6 py-5 border-t bg-slate-50 gap-2 sm:gap-0 sm:justify-between flex-row items-center">
                                <Button
                                    variant="outline"
                                    onClick={() => printOrderReceipt(selectedCustomerOrder)}
                                    className="rounded-xl h-10 px-4 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                                >
                                    <Printer className="w-4 h-4 mr-2" />
                                    Download Receipt
                                </Button>
                                <Button variant="outline" onClick={() => setIsCustomerOrderDialogOpen(false)} className="rounded-xl h-10 px-6">Close</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
