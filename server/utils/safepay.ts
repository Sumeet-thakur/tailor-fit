/**
 * Safepay Sandbox Payment Utility
 * Handles tracker creation and HMAC-SHA512 webhook signature verification.
 * Docs: https://getsafepay.com/docs
 */
import crypto from 'crypto';

const SAFEPAY_BASE = 'https://sandbox.api.getsafepay.com';

// ─── Tracker Creation ─────────────────────────────────────────────────────────
export async function createTracker(
    amount: number,
    currency: string,
    orderId: string
): Promise<string> {
    const merchantApiKey = process.env.SAFEPAY_PUBLIC_KEY;
    if (!merchantApiKey) throw new Error('SAFEPAY_PUBLIC_KEY is not set');

    const isSandbox = SAFEPAY_BASE.includes('sandbox');

    // [Safepay V1 Tracker Init]
    // V1 Trackers are STRICTLY required for the standard Hosted Checkout redirect experience.
    const res = await fetch(`${SAFEPAY_BASE}/order/v1/init`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            client: merchantApiKey,
            intent: 'CYBERSOURCE',
            mode: 'payment',
            currency: currency.toUpperCase(),
            amount: Math.round(amount), // Exact amount for PKR
            environment: isSandbox ? 'sandbox' : 'production',
            metadata: { order_id: orderId, source: 'tailor-fit' },
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Safepay tracker init failed (${res.status}): ${text}`);
    }

    const json = (await res.json()) as { data: { token: string } };
    return json.data.token;
}

// ─── Refund Request ───────────────────────────────────────────────────────────
export async function createRefund(transactionId: string): Promise<boolean> {
    const merchantSecret = process.env.SAFEPAY_SECRET_KEY;
    if (!merchantSecret) throw new Error('SAFEPAY_SECRET_KEY is not set');

    // [Safepay V1 Transaction Refund API]
    const res = await fetch(`${SAFEPAY_BASE}/client/transactions/v1/${transactionId}/refund`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-SFPY-MERCHANT-SECRET': merchantSecret,
        },
        body: JSON.stringify({}), // V1 transaction refund endpoint usually doesn't need body, just the ID
    });

    if (!res.ok) {
        const text = await res.text();
        console.error(`[Safepay Refund Failed]: ${res.status} - ${text}`);
        return false;
    }

    return true;
}

// ─── Webhook Signature Verification ──────────────────────────────────────────
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = process.env.SAFEPAY_SECRET_KEY;
    if (!secret) throw new Error('SAFEPAY_SECRET_KEY is not set');

    const computed = crypto
        .createHmac('sha512', secret)
        .update(rawBody)
        .digest('hex');

    try {
        return crypto.timingSafeEqual(
            Buffer.from(computed, 'hex'),
            Buffer.from(signature, 'hex')
        );
    } catch {
        return false;
    }
}

// ─── Callback Signature Verification (Frontend Redirect) ──────────────────────
export function verifyCallbackSignature(tracker: string, signature: string): boolean {
    const secret = process.env.SAFEPAY_SECRET_KEY;
    if (!secret) return false;

    const computed = crypto
        .createHmac('sha256', secret)
        .update(tracker)
        .digest('hex');

    try {
        return crypto.timingSafeEqual(
            Buffer.from(computed, 'hex'),
            Buffer.from(signature, 'hex')
        );
    } catch {
        return false;
    }
}

// ─── Checkout URL Builder ─────────────────────────────────────────────────────
export function buildCheckoutUrl(tracker: string, orderId: string, callbackUrl: string): string {
    const isSandbox = SAFEPAY_BASE.includes('sandbox');
    const params = new URLSearchParams({
        beacon: tracker,
        env: isSandbox ? 'sandbox' : 'production',
        order_id: orderId,
        source: 'custom',
        webhooks: 'true',
        redirect_url: callbackUrl,
        cancel_url: callbackUrl,
    });
    return `${SAFEPAY_BASE}/checkout/pay?${params.toString()}`;
}
