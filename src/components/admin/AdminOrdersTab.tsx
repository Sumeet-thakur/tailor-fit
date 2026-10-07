import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatPrice } from '@/lib/formatPrice';
import { getOrderStatusInfo, ORDER_STATUS_OPTIONS } from '@/lib/orderStatusUtils';
import { getPaymentStatusInfo } from '@/lib/paymentConstants';
import { PaymentStatusBadge, TransactionIdDisplay, AdminPaymentActions } from '@/components/common/PaymentStatusBadge';
import { OrderSpecs } from '@/components/orders/OrderSpecs';
import {
  ShoppingCart,
  ShoppingBag,
  Eye,
  User,
  Calendar,
  Clock,
  CreditCard,
  Truck,
  RotateCcw,
  Loader2,
  Printer,
  Shield,
} from 'lucide-react';
import { OrderCard } from '@/components/orders/OrderCard';
import { Order } from '@/types/order';
import { paymentService } from '@/services/payments';
import { printOrderReceipt } from '@/lib/printReceipt';
import { showSuccess, showError, showLoading } from '@/lib/toastHelpers';
import { useAuth } from '@/context/AuthContext';



interface AdminOrdersTabProps {
  orders: Order[];
  ordersLoading: boolean;
  ordersError: string;
  searchTerm: string;
  selectedOrder: Order | null;
  isOrderDialogOpen: boolean;
  fetchOrders: () => Promise<void>;
  setSelectedOrder: (order: Order | null) => void;
  setIsOrderDialogOpen: (open: boolean) => void;
  updateOrderStatus: (orderId: string, status: string) => Promise<void>;
  updatePaymentDetails: (orderId: string, payload: { paymentStatus?: string; transactionId?: string }) => Promise<void>;
}

function getStatusBadgeClasses(status: string): string {
  const info = getOrderStatusInfo(status);
  return `${info.bgColor} ${info.color}`;
}

export function AdminOrdersTab(props: AdminOrdersTabProps): JSX.Element {
  const {
    orders,
    ordersLoading,
    ordersError,
    searchTerm,
    selectedOrder,
    isOrderDialogOpen,
    fetchOrders,
    setSelectedOrder,
    setIsOrderDialogOpen,
    updateOrderStatus,
    updatePaymentDetails,
  } = props;

  const { token: adminToken } = useAuth();
  const [refundingId, setRefundingId] = useState<string | null>(null);

  // [Action] Initiate Safepay refund for a paid order via the admin panel
  // [Purpose] Admins can reverse Safepay payments directly without using the Safepay dashboard
  const handleSafepayRefund = async (orderId: string, orderNumber: string) => {
    if (!adminToken) return;
    setRefundingId(orderId);
    const dismiss = showLoading(`Initiating refund for ${orderNumber}...`);
    try {
      await paymentService.initiateSafepayRefund(orderId, adminToken);
      dismiss();
      showSuccess(`Refund initiated for order ${orderNumber}`);
      await fetchOrders();
    } catch {
      dismiss();
      showError('Failed to initiate refund. Please try again.');
    } finally {
      setRefundingId(null);
    }
  };

  const orderStatuses = [...ORDER_STATUS_OPTIONS];

  const filteredOrders = orders.filter((order) => {
    const term = searchTerm.toLowerCase();
    return (
      order.orderNumber?.toLowerCase().includes(term) ||
      order.customer?.name?.toLowerCase().includes(term) ||
      order.customer?.email?.toLowerCase().includes(term) ||
      (order as Order & { transactionId?: string }).transactionId?.toLowerCase().includes(term)
    );
  });

  if (ordersLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (ordersError) {
    return (
      <div className="text-center py-32">
        <p className="text-destructive">{ordersError}</p>
        <Button onClick={fetchOrders} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-32">
        <ShoppingCart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-display text-xl font-medium">No orders yet</h3>
        <p className="text-muted-foreground">Orders will appear here when customers place them</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {filteredOrders.map((order, i) => (
          <OrderCard
            key={order._id}
            order={order}
            variant="admin"
            actions={
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedOrder(order);
                  setIsOrderDialogOpen(true);
                }}
                className="w-full md:w-auto rounded-xl border-primary/20 hover:bg-primary/5 hover:text-primary"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            }
          />
        ))}
      </div>

      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent hideCloseButton className="w-[95vw] max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl bg-white p-0 shadow-2xl border-none">
          {selectedOrder && (
            <>
              <div className="px-6 py-5 border-b sticky top-0 bg-white z-10 flex items-center justify-between">
                <div>
                  <DialogTitle className="font-display text-2xl font-semibold text-foreground">
                    {selectedOrder.orderNumber}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Placed on{' '}
                    {new Date(selectedOrder.createdAt).toLocaleDateString('en-PK', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize border ${getOrderStatusInfo(selectedOrder.status).bgColor} ${getStatusBadgeClasses(selectedOrder.status)} border-current opacity-90`}
                >
                  {getOrderStatusInfo(selectedOrder.status).label}
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOrderDialogOpen(false)} className="rounded-full hover:bg-slate-100 sm:hidden absolute top-4 right-4">
                  <span className="sr-only">Close</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 opacity-60"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </Button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
                <div className="bg-white p-5 rounded-xl border border-border/50 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Update Status</p>
                      <p className="text-xs text-muted-foreground">Notify customer of progress</p>
                    </div>
                  </div>
                  <Select
                    value={selectedOrder.status}
                    onValueChange={(v) => updateOrderStatus(selectedOrder._id, v)}
                  >
                    <SelectTrigger className="w-full sm:w-48 h-10 rounded-lg border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {orderStatuses.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-white rounded-xl border border-border/50 shadow-sm overflow-hidden mb-6">
                  <div className="p-4 bg-muted/30 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" /> Payment Details
                    </h4>
                    <PaymentStatusBadge
                      paymentStatus={selectedOrder.paymentStatus}
                      paymentMethod={selectedOrder.paymentMethod}
                      variant="card"
                    />
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Payment Method</p>
                      <p className="font-medium text-foreground capitalize">
                        {selectedOrder.paymentMethod?.replace('_', ' ') || 'COD'}
                      </p>
                    </div>
                    {selectedOrder.paymentGateway && selectedOrder.paymentGateway !== 'none' && (
                      <div>
                        <p className="text-muted-foreground text-xs">Gateway</p>
                        <p className="font-medium text-foreground capitalize">
                          {selectedOrder.paymentGateway}
                        </p>
                      </div>
                    )}
                    {selectedOrder.transactionId && (
                      <div className="col-span-2">
                        <TransactionIdDisplay transactionId={selectedOrder.transactionId} />
                      </div>
                    )}
                    <AdminPaymentActions
                      orderId={selectedOrder._id}
                      orderStatus={selectedOrder.status}
                      paymentStatus={selectedOrder.paymentStatus}
                      paymentMethod={selectedOrder.paymentMethod}
                      paymentGateway={selectedOrder.paymentGateway}
                      transactionId={selectedOrder.transactionId}
                      updatePaymentDetails={updatePaymentDetails}
                    />
                    {/* [Visual Context] Payment details panel — Safepay refund action */}
                    {/* [Action] Calls Safepay reverse API to initiate a refund */}
                    {/* [Purpose] Admins can refund Safepay orders without leaving the dashboard */}
                    {selectedOrder.paymentGateway === 'safepay' && selectedOrder.paymentStatus === 'paid' && (
                      <div className="col-span-2 pt-3 border-t border-border/30">
                        <button
                          onClick={() => handleSafepayRefund(selectedOrder._id, selectedOrder.orderNumber || selectedOrder._id)}
                          disabled={refundingId === selectedOrder._id}
                          className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors w-full justify-center disabled:opacity-50"
                        >
                          {refundingId === selectedOrder._id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <RotateCcw className="w-4 h-4" />
                          }
                          Initiate Safepay Refund
                        </button>
                        <p className="text-[10px] text-muted-foreground text-center mt-1">
                          Refund goes back to customer&apos;s original card. Takes 3–5 business days.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white p-5 rounded-xl border border-border/50 shadow-sm space-y-4">
                    <h4 className="flex items-center gap-2 font-semibold text-foreground pb-3 border-b border-border/50">
                      <User className="w-4 h-4 text-primary" /> Customer Details
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {selectedOrder.customer?.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {selectedOrder.customer?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{selectedOrder.customer?.email}</p>
                          <p className="text-xs text-muted-foreground">{selectedOrder.customer?.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-border/50 shadow-sm space-y-4">
                    <h4 className="flex items-center gap-2 font-semibold text-foreground pb-3 border-b border-border/50">
                      <Truck className="w-4 h-4 text-primary" /> Shipping Address
                    </h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">
                        {selectedOrder.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
                      </p>
                      <p>{selectedOrder.customer?.address?.street}</p>
                      <p>
                        {[
                          selectedOrder.customer?.address?.city,
                          selectedOrder.customer?.address?.state,
                          selectedOrder.customer?.address?.country,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                      <p>{selectedOrder.customer?.address?.postalCode}</p>
                    </div>
                  </div>
                </div>

                <OrderSpecs items={selectedOrder.items} />
              </div>

              <DialogFooter className="px-6 py-5 border-t bg-slate-50 gap-2 sm:gap-0 flex justify-end">
                <Button
                  variant="ghost"
                  onClick={() => printOrderReceipt(selectedOrder as any)}
                  className="rounded-xl gap-2 text-muted-foreground"
                >
                  <Printer className="w-4 h-4" /> Receipt
                </Button>
                <Button variant="outline" onClick={() => setIsOrderDialogOpen(false)} className="rounded-xl h-12 px-6">Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
