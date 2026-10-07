/**
 * PaymentStatusBadge — Shared payment status display component.
 * Renders: payment status badge + COD/Bank Transfer/Safepay hints.
 * Used by: Account, Admin, OrderConfirmation, TrackOrder.
 * Single source of truth for payment status rendering.
 */
import React, { useState } from 'react';
import { getPaymentStatusInfo } from '@/lib/paymentConstants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldAlert, Info, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { paymentService } from '@/services/payments';
import { useAuth } from '@/context/AuthContext';
import { showLoading, showSuccess, showError } from '@/lib/toastHelpers';

interface PaymentStatusBadgeProps {
    paymentStatus?: string;
    paymentMethod?: string;
    /** 'inline' = tiny pill for order list rows, 'card' = larger badge for detail views */
    variant?: 'inline' | 'card';
    /** If true, shows the payment hint text below the badge */
    showHint?: boolean;
}

export function getPaymentHint(method?: string, status?: string): React.ReactNode | null {
    const m = (method || '').toLowerCase();
    const s = (status || '').toLowerCase();

    if (m === 'safepay' && s === 'pending') {
        return (
            <span className="flex items-center gap-1.5 text-amber-600">
                <ShieldAlert className="w-3.5 h-3.5" />
                Waiting for Safepay webhook confirmation.
            </span>
        );
    }
    if (m === 'bank_transfer' && s === 'pending_verification') {
        return (
            <span className="flex items-center gap-1.5 text-blue-600">
                <Info className="w-3.5 h-3.5" />
                Verifying bank transfer. Takes up to 24 hours.
            </span>
        );
    }
    if (m === 'cod' && (s === 'pending' || s === 'unpaid' || !s)) {
        return (
            <span className="flex items-center gap-1.5 text-muted-foreground">
                <AlertTriangle className="w-3.5 h-3.5" />
                Please have exact cash ready at delivery.
            </span>
        );
    }
    return null;
}

export function PaymentStatusBadge({
    paymentStatus,
    paymentMethod,
    variant = 'inline',
    showHint = true,
}: PaymentStatusBadgeProps) {
    const ps = getPaymentStatusInfo(paymentStatus || 'pending');
    const hint = showHint ? getPaymentHint(paymentMethod, paymentStatus) : null;

    if (variant === 'card') {
        return (
            <div className="flex flex-col items-start">
                <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize border-0 ${ps.bgColor} ${ps.color}`}
                >
                    {ps.label}
                </span>
                {hint && <p className="text-xs mt-1.5 font-medium">{hint}</p>}
            </div>
        );
    }

    // inline variant — tiny pill for order list rows
    return (
        <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide border shrink-0 ${ps.color} ${ps.borderColor ?? 'border-gray-200'} ${ps.bgColor}`}
        >
            {ps.label}
        </span>
    );
}

/**
 * TransactionIdDisplay — Shared transaction ID read-only display.
 * Used by: OrderConfirmation, Admin detail dialogs, Account page.
 */
interface TransactionIdDisplayProps {
    transactionId?: string;
    /** Optional fallback text when there's a paymentProof but no ID */
    fallbackText?: string;
}

export function TransactionIdDisplay({
    transactionId,
    fallbackText,
}: TransactionIdDisplayProps) {
    if (!transactionId && !fallbackText) return null;

    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Transaction ID</span>
            <span className="text-sm font-mono bg-muted/50 px-2 py-1 rounded text-foreground break-all select-all">
                {transactionId || fallbackText || 'Uploaded (Pending Review)'}
            </span>
        </div>
    );
}

/**
 * AdminPaymentActions — Shared admin-only payment management panel.
 * Mark as Paid / Mark Unpaid + Transaction ID input.
 * Used by: AdminOrdersTab, AdminDashboard (customer order detail).
 */
interface AdminPaymentActionsProps {
    orderId: string;
    orderStatus?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    paymentGateway?: string;
    transactionId?: string;
    updatePaymentDetails: (orderId: string, payload: { paymentStatus?: string; transactionId?: string }) => Promise<void>;
}

export function AdminPaymentActions({
    orderId,
    orderStatus,
    paymentStatus,
    paymentMethod,
    paymentGateway,
    transactionId,
    updatePaymentDetails,
}: AdminPaymentActionsProps) {
    const { token } = useAuth();
    const isSafepay = paymentGateway === 'safepay' || paymentMethod === 'safepay';
    const isPaid = paymentStatus === 'paid';
    const isRefunded = paymentStatus === 'refunded';
    const isCancelled = orderStatus === 'cancelled';
    const [isRefunding, setIsRefunding] = useState(false);

    const handleSafepayRefund = async () => {
        if (!token) return;
        const dismissToast = showLoading('Initiating Safepay Refund...');
        setIsRefunding(true);
        try {
            await paymentService.initiateSafepayRefund(orderId, token);
            dismissToast();
            showSuccess('Safepay refund initiated successfully. Status will update via webhook.');
        } catch (error: any) {
            console.error(error);
            dismissToast();
            showError(error.message || 'Failed to initiate Safepay refund.');
        } finally {
            setIsRefunding(false);
        }
    };

    return (
        <div className="col-span-2 pt-3 border-t border-border flex flex-col gap-3">
            {/* Admin Verification Helper Instructions */}
            {(!isPaid && !isRefunded && !isCancelled) && (
                <div className="text-xs font-medium px-3 py-2 bg-blue-50 text-blue-800 rounded-md border border-blue-100 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    {isSafepay ? (
                        <span>
                            <strong>Safepay Automated Order:</strong> This order will be automatically marked as Paid when the Safepay webhook fires. Manual marking is disabled.
                        </span>
                    ) : paymentMethod === 'bank_transfer' ? (
                        <span>
                            <strong>Bank Transfer:</strong> Please log in to your bank portal and verify the transaction ID matches the amount before manually marking as paid.
                        </span>
                    ) : (
                        <span>
                            <strong>Cash on Delivery:</strong> Verify that the delivery courier has remitted the cash for this order before manually marking as paid.
                        </span>
                    )}
                </div>
            )}

            <div className="flex items-center justify-between gap-4">
                {isCancelled && (isPaid || isRefunded) ? (
                    <div className="flex-1">
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Refund Action</p>
                        {isRefunded ? (
                            <div className="text-sm font-medium text-emerald-600 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-md border border-emerald-100 w-fit">
                                <CheckCircle2 className="w-4 h-4" /> Refund Processed
                            </div>
                        ) : isSafepay ? (
                            <Button
                                size="sm"
                                disabled={isRefunding}
                                className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg"
                                onClick={handleSafepayRefund}
                            >
                                {isRefunding && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                                Initiate Safepay Refund
                            </Button>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <p className="text-[11px] text-muted-foreground leading-tight">Please refund via bank transfer offline, then click below.</p>
                                <Button
                                    size="sm"
                                    className="h-8 w-fit text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg"
                                    onClick={() => updatePaymentDetails(orderId, { paymentStatus: 'refunded' })}
                                >
                                    Mark as Refunded (Manual)
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1">
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Verification Action</p>
                        <div className="flex gap-2">
                            {!isPaid && !isRefunded && (
                                <Button
                                    size="sm"
                                    disabled={isSafepay}
                                    className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => updatePaymentDetails(orderId, { paymentStatus: 'paid' })}
                                >
                                    Mark as Paid
                                </Button>
                            )}
                            {isPaid && !isRefunded && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isSafepay || isCancelled}
                                    className="h-8 text-xs border-dashed text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                    onClick={() => updatePaymentDetails(orderId, { paymentStatus: 'pending' })}
                                >
                                    Revert to Unpaid
                                </Button>
                            )}
                        </div>
                    </div>
                )}
                <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Transaction Record</p>
                    <div className="flex gap-2">
                        <Input
                            className="h-8 text-xs font-mono"
                            placeholder={isSafepay ? "Webhook will update this" : "Enter Receipt/Tx ID"}
                            defaultValue={transactionId || ''}
                            readOnly={isSafepay}
                            disabled={isSafepay}
                            onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                                if (isSafepay) return;
                                const newVal = e.target.value.trim();
                                const oldVal = (transactionId || '').trim();
                                if (newVal !== oldVal) {
                                    updatePaymentDetails(orderId, { transactionId: newVal });
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
