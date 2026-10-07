import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { CheckCircle2, XCircle, Loader2, ArrowRight, Home } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { paymentService } from '@/services/payments';

type CallbackStatus = 'loading' | 'success' | 'failed';

export default function PaymentCallbackPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { clearCart } = useCart();
    const [status, setStatus] = useState<CallbackStatus>('loading');
    const [countdown, setCountdown] = useState(5);

    const orderId = searchParams.get('order_id');
    const tracker = searchParams.get('tracker');
    const [fetchedOrderNumber, setFetchedOrderNumber] = useState<string | null>(null);
    const [fetchedReference, setFetchedReference] = useState<string | null>(null);

    useEffect(() => {
        // Safepay redirects strictly with order_id and tracker on V1 Success
        if (!orderId || !tracker) {
            setStatus('failed');
            return;
        }

        let isMounted = true;

        const verifyPayment = async () => {
            try {
                // The backend hits the Safepay REST API to definitively verify the state
                const res = await paymentService.verifySafepayCallback({ orderId, tracker });
                
                if (isMounted) {
                    setStatus('success');
                    if (res.orderNumber) setFetchedOrderNumber(res.orderNumber);
                    setFetchedReference(tracker); // Reference is securely managed in DB, we just show the tracker
                    clearCart();

                    // Auto-redirect to order confirmation
                    const timer = setInterval(() => {
                        setCountdown(prev => {
                            if (prev <= 1) {
                                clearInterval(timer);
                                if (res.orderNumber) navigate(`/order/${res.orderNumber}`);
                                else navigate('/');
                                return 0;
                            }
                            return prev - 1;
                        });
                    }, 1000);
                }
            } catch (error) {
                console.error('Failed to verify payment via callback:', error);
                if (isMounted) setStatus('failed');
            }
        };

        verifyPayment();

        return () => { isMounted = false; };
    }, [tracker, orderId, navigate, clearCart]);

    return (
        <SiteLayout>
            <div className="min-h-[70vh] flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-white rounded-3xl border border-border/50 shadow-soft p-8 text-center">

                    {status === 'loading' && (
                        <>
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-6">
                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                            </div>
                            <h1 className="font-display text-2xl font-bold text-foreground mb-2">Processing Payment</h1>
                            <p className="text-muted-foreground text-sm">Please wait while we verify your payment…</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            </div>
                            <h1 className="font-display text-2xl font-bold text-foreground mb-2">Payment Successful!</h1>
                            <p className="text-muted-foreground text-sm mb-1">
                                Your Safepay payment has been received.
                            </p>
                            {fetchedReference && (
                                <p className="text-xs text-muted-foreground mb-6 font-mono bg-muted/30 px-3 py-2 rounded-lg">
                                    Tracker: {fetchedReference.slice(0, 16)}...
                                </p>
                            )}
                            <p className="text-sm text-muted-foreground mb-6">
                                Redirecting to your order in <span className="font-bold text-primary">{countdown}s</span>…
                            </p>
                            <div className="flex flex-col gap-3">
                                {fetchedOrderNumber && (
                                    <Link
                                        to={`/order/${fetchedOrderNumber}`}
                                        className="w-full h-12 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                                    >
                                        View Order <ArrowRight className="w-4 h-4" />
                                    </Link>
                                )}
                                <Link
                                    to="/"
                                    className="w-full h-12 rounded-xl border border-border/50 text-foreground text-sm font-medium hover:bg-muted/30 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Home className="w-4 h-4" /> Back to Home
                                </Link>
                            </div>
                        </>
                    )}

                    {status === 'failed' && (
                        <>
                            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
                                <XCircle className="w-8 h-8 text-red-600" />
                            </div>
                            <h1 className="font-display text-2xl font-bold text-foreground mb-2">Payment Failed</h1>
                            <p className="text-muted-foreground text-sm mb-6">
                                Your payment could not be processed. Your order has been saved — you can retry or choose another method.
                            </p>
                            {orderId && (
                                <p className="text-xs text-muted-foreground mb-4 font-mono bg-muted/30 px-3 py-2 rounded-lg">
                                    Order ID: {orderId}
                                </p>
                            )}
                            <div className="flex flex-col gap-3">
                                <Link
                                    to="/checkout"
                                    className="w-full h-12 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                                >
                                    Try Again <ArrowRight className="w-4 h-4" />
                                </Link>
                                <Link
                                    to="/"
                                    className="w-full h-12 rounded-xl border border-border/50 text-foreground text-sm font-medium hover:bg-muted/30 transition-colors flex items-center justify-center"
                                >
                                    <Home className="w-4 h-4 mr-2" /> Back to Home
                                </Link>
                            </div>
                        </>
                    )}

                </div>
            </div>
        </SiteLayout>
    );
}
