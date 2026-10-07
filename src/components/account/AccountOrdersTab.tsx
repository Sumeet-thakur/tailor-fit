import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Package, ArrowRight, ChevronRight, RotateCcw, Printer, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { OrderCard } from '@/components/orders/OrderCard';
import { showSuccess, showError, showLoading } from '@/lib/toastHelpers';
import { orderService } from '@/services/orders';
import { ApiError } from '@/lib/apiClient';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { paymentService } from '@/services/payments';
import { printOrderReceipt } from '@/lib/printReceipt';
import { CancelOrderDialog } from '@/components/orders/CancelOrderDialog';

interface AccountOrdersTabProps {
    orders: any[];
    onRefresh: () => Promise<void>;
}

export function AccountOrdersTab({ orders, onRefresh }: AccountOrdersTabProps) {
    const { token } = useCustomerAuth();
    const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
    const [selectedOrderForTx, setSelectedOrderForTx] = useState<any>(null);
    const [transactionIdInput, setTransactionIdInput] = useState('');
    const [retryingId, setRetryingId] = useState<string | null>(null);

    // Cancellation State
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [selectedOrderForCancel, setSelectedOrderForCancel] = useState<any>(null);

    // [Action] Retry a failed Safepay payment by creating a new tracker and redirecting
    // [Purpose] Customers can recover from failed card payments without creating a new order
    const handleRetryPayment = async (orderId: string, orderNumber: string) => {
        setRetryingId(orderId);
        try {
            const callbackUrl = `${window.location.origin}/payment/callback?order_number=${orderNumber}&order_id=${orderId}`;
            const { checkoutUrl } = await paymentService.createSafepayTracker(orderId, callbackUrl);
            if (checkoutUrl) {
                window.location.href = checkoutUrl;
            } else {
                showError('Could not initiate payment. Please try again.');
                setRetryingId(null);
            }
        } catch {
            showError('Could not initiate payment. Please try again.');
            setRetryingId(null);
        }
    };

    const handleUpdateTransactionId = async () => {
        if (!selectedOrderForTx) return;

        const dismissToast = showLoading('Updating transaction ID...');
        try {
            await orderService.updatePaymentDetails(
                selectedOrderForTx._id,
                { transactionId: transactionIdInput.trim(), paymentStatus: 'pending_verification' },
                token || undefined
            );

            await onRefresh();

            dismissToast();
            showSuccess('Transaction ID updated successfully');
            setIsTransactionDialogOpen(false);
            setSelectedOrderForTx(null);
            setTransactionIdInput('');
        } catch (error) {
            console.error('Failed to update transaction ID:', error);
            dismissToast();
            const apiError = error as ApiError;
            showError(apiError.message || 'Failed to update transaction ID');
        }
    };

    const handleCancelOrder = async () => {
        if (!selectedOrderForCancel || !token) return;
        
        const dismissToast = showLoading('Cancelling order...');
        try {
            await orderService.updateStatus(selectedOrderForCancel._id, 'cancelled', token);
            await onRefresh();
            dismissToast();
            showSuccess('Order cancelled successfully');
        } catch (error) {
            console.error('Cancel order error:', error);
            dismissToast();
            const apiError = error as ApiError;
            showError(apiError.message || 'Failed to cancel order');
            throw error; // Let the dialog know it failed
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-semibold text-foreground">My Orders</h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        const dismissToast = showLoading('Refreshing orders...');
                        onRefresh().then(() => {
                            dismissToast();
                            showSuccess('Orders refreshed');
                        });
                    }}
                    className="rounded-lg"
                >
                    <Loader2 className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {orders.length === 0 ? (
                <div className="text-center py-12">
                    <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-medium text-lg text-foreground mb-2">No orders yet</h3>
                    <p className="text-muted-foreground mb-6">Start shopping to see your orders here</p>
                    <Link
                        to="/products"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-all"
                    >
                        Browse Products
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
                    {orders.map((order) => (
                        <OrderCard
                            key={order._id}
                            order={order}
                            variant="customer"
                            actions={
                                <>
                                    {order.paymentMethod !== 'cod' && order.paymentStatus !== 'paid' && order.status !== 'cancelled' && order.paymentGateway !== 'safepay' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedOrderForTx(order);
                                                setTransactionIdInput(order.transactionId || '');
                                                setIsTransactionDialogOpen(true);
                                            }}
                                            className="whitespace-nowrap rounded-xl"
                                        >
                                            Add Transaction ID
                                        </Button>
                                    )}
                                    {/* [Visual Context] Order actions area — Safepay retry button */}
                                    {/* [Action] Creates a new Safepay tracker and redirects to hosted checkout */}
                                    {/* [Purpose] Lets customers retry payment after a failed card attempt */}
                                    {order.paymentGateway === 'safepay' && order.paymentStatus === 'failed' && order.status !== 'cancelled' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRetryPayment(order._id, order.orderNumber);
                                            }}
                                            disabled={retryingId === order._id}
                                            className="gap-2 rounded-xl border-red-200 text-red-700 hover:bg-red-50"
                                        >
                                            {retryingId === order._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                            Retry Payment
                                        </Button>
                                    )}
                                    {/* Customer Cancellation Allowed if Status Pending/Confirmed */}
                                    {(order.status === 'pending' || order.status === 'confirmed') && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedOrderForCancel(order);
                                                setIsCancelDialogOpen(true);
                                            }}
                                            className="text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl"
                                        >
                                            Cancel Order
                                        </Button>
                                    )}
                                    <Link to={`/order/${order.orderNumber}`} onClick={(e) => e.stopPropagation()}>
                                        <Button size="sm" variant="ghost" className="gap-2 w-full sm:w-auto justify-center rounded-xl">
                                            View Details <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </Link>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            printOrderReceipt(order);
                                        }}
                                        className="gap-2 rounded-xl text-muted-foreground"
                                    >
                                        <Printer className="w-3 h-3" /> Receipt
                                    </Button>
                                </>
                            }
                        />
                    ))}
                </div>
            )}

            {/* Transaction ID Dialog */}
            <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Transaction ID</DialogTitle>
                        <DialogDescription>
                            Enter the bank transfer transaction ID/reference number for order {selectedOrderForTx?.orderNumber}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="transactionId">Transaction ID</Label>
                            <Input
                                id="transactionId"
                                value={transactionIdInput}
                                onChange={(e) => setTransactionIdInput(e.target.value)}
                                placeholder="e.g., TXN123456789"
                                className="h-12 rounded-xl"
                            />
                            <p className="text-xs text-muted-foreground">
                                This helps us verify your payment faster
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsTransactionDialogOpen(false)}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateTransactionId}
                            disabled={!transactionIdInput.trim()}
                            className="rounded-xl"
                        >
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CancelOrderDialog
                isOpen={isCancelDialogOpen}
                onOpenChange={setIsCancelDialogOpen}
                onConfirm={handleCancelOrder}
                orderNumber={selectedOrderForCancel?.orderNumber || ''}
            />
        </div>
    );
}
