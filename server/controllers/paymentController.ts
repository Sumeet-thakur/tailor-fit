/**
 * Payment Controller — Safepay Integration
 * Handles tracker creation, webhook processing, and refund initiation.
 */
import type { Request, Response } from 'express';
import Order from '../models/order.js';
import { createTracker, createRefund, verifyWebhookSignature, verifyCallbackSignature, buildCheckoutUrl } from '../utils/safepay.js';
import { getIO } from '../socket.js';
import { createNotification } from '../utils/createNotification.js';
import { createAdminNotification } from '../utils/createAdminNotification.js';

// ─── POST /api/payments/safepay/intent ────────────────────────────────────────
export const createSafepayTracker = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, callbackUrl } = req.body;
    if (!orderId) {
      res.status(400).json({ success: false, message: 'orderId is required' });
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const tracker = await createTracker(order.total, 'PKR', order._id.toString());

    // Persist tracker token so webhook can match it back
    await Order.findByIdAndUpdate(orderId, {
      paymentGateway: 'safepay',
      paymentMethod: 'safepay',
      paymentStatus: 'pending',
      $set: {
        'paymentDetails.tracker': tracker,
        'paymentDetails.initiatedAt': new Date().toISOString(),
      },
    });

    const checkoutUrl = buildCheckoutUrl(tracker, order._id.toString(), callbackUrl || 'http://localhost:5174/payment/callback');

    res.json({ success: true, data: { tracker, checkoutUrl } });
  } catch (error) {
    console.error('[Safepay] createTracker error:', error);
    res.status(500).json({ success: false, message: 'Payment initiation failed' });
  }
};

// ─── POST /api/payments/safepay/verify-callback (Frontend Fallback) ───────────
export const verifySafepayCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, tracker } = req.body;

    if (!orderId || !tracker) {
      res.status(400).json({ success: false, message: 'Missing required callback parameters' });
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    if (order.paymentDetails?.tracker !== tracker) {
      res.status(400).json({ success: false, message: 'Tracker mismatch' });
      return;
    }

    const orderNum = order.orderNumber || order._id.toString();

    // Idempotency check
    if (order.paymentStatus === 'paid') {
      res.json({ success: true, message: 'Payment already verified', data: { orderNumber: orderNum } });
      return;
    }

    // Ping Safepay directly to securely verify the payment state natively.
    const isSandbox = process.env.SAFEPAY_PUBLIC_KEY?.includes('sandbox') || process.env.NODE_ENV !== 'production';
    const safepayBase = isSandbox ? 'https://sandbox.api.getsafepay.com' : 'https://api.getsafepay.com';
    
    // Safepay strictly exposes V1 tracker states publicly on GET
    const sfpyRes = await fetch(`${safepayBase}/order/v1/${tracker}`);
    if (!sfpyRes.ok) {
      console.error('[Safepay] verify-callback failed to fetch tracker state', await sfpyRes.text());
      res.status(400).json({ success: false, message: 'Failed to communicate with Safepay' });
      return;
    }

    const sfpyData = (await sfpyRes.json()) as any;
    
    // Validate tracker effectively converted into a captured transaction
    if (sfpyData.data?.state !== 'TRACKER_ENDED' || !sfpyData.data?.transaction) {
      res.status(400).json({ success: false, message: 'Payment has not been completed on Safepay' });
      return;
    }

    const reference = sfpyData.data.transaction.reference || tracker;

    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: 'paid',
      transactionId: reference || tracker,
      $set: {
        'paymentDetails.webhook_event': 'payment.succeeded.callback_fallback',
        'paymentDetails.paidAt': new Date().toISOString(),
        'paymentDetails.reference': reference || tracker,
      },
    });

    // Notify customer
    await createNotification({
      customerEmail: order.customer?.email,
      type: 'payment_status',
      title: `Payment confirmed for order ${orderNum}`,
      message: 'Your Safepay payment has been successfully verified via redirect. We\'re preparing your order.',
      link: { path: '/order', params: { orderNumber: orderNum } },
      metadata: { status: 'paid' },
    });

    // Notify admins via socket
    const io = getIO();
    if (io) {
      io.of('/admin').emit('payment_status_update', {
        orderId: order._id,
        paymentStatus: 'paid',
        message: `Safepay payment confirmed via redirect for order ${orderNum}`,
      });
    }

    await createAdminNotification({
      type: 'payment_received',
      title: 'Payment Received (Fallback)',
      message: `Safepay verification sync for order ${orderNum}`,
      link: `/admin/orders/${orderId}`,
    });

    res.json({ success: true, message: 'Payment successfully verified via callback', data: { orderNumber: orderNum } });
  } catch (error) {
    console.error('[Safepay] verifySafepayCallback error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify payment callback' });
  }
};

// ─── POST /api/payments/safepay/webhook ───────────────────────────────────────
export const handleSafepayWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-sfpy-signature'] as string | undefined;
    const rawBody = (req as any).rawBody as string | undefined;

    if (!signature || !rawBody) {
      res.status(400).json({ success: false, message: 'Missing signature or body' });
      return;
    }

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn('[Safepay] Webhook signature mismatch');
      res.status(401).json({ success: false, message: 'Invalid signature' });
      return;
    }

    const payload = JSON.parse(rawBody);
    const { event, data } = payload as {
      event: 'payment.succeeded' | 'payment:created' | 'payment.failed' | 'payment:failed' | 'payment.refunded' | 'payment:refunded' | 'payment:refund';
      data: { tracker: { token: string; metadata?: { order_id?: string } }; reference?: string };
    };

    const orderId = data?.tracker?.metadata?.order_id;
    const reference = data?.reference || data?.tracker?.token;

    if (!orderId) {
      res.status(200).json({ received: true, note: 'No order_id in metadata' });
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(200).json({ received: true, note: 'Order not found, skipped' });
      return;
    }

    const io = getIO();
    const orderNum = order.orderNumber || order._id.toString();

    if (event === 'payment.succeeded' || event === 'payment:created') {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'paid',
        transactionId: reference,
        $set: {
          'paymentDetails.webhook_event': event,
          'paymentDetails.paidAt': new Date().toISOString(),
          'paymentDetails.reference': reference,
        },
      });

      // Notify customer
      await createNotification({
        customerEmail: order.customer?.email,
        type: 'payment_status',
        title: `Payment confirmed for order ${orderNum}`,
        message: 'Your Safepay payment has been received. We\'re preparing your order.',
        link: { path: '/order', params: { orderNumber: orderNum } },
        metadata: { status: 'paid' },
      });

      // Notify admins via socket
      if (io) {
        io.to('admin:broadcast').emit('payment:confirmed', {
          orderId: order._id,
          orderNumber: orderNum,
          amount: order.total,
          gateway: 'safepay',
          reference,
          timestamp: new Date().toISOString(),
        });
      }

      await createAdminNotification({
        type: 'payment_received',
        title: `Safepay payment received — Order ${orderNum}`,
        message: `Rs. ${order.total.toLocaleString()} paid via Safepay`,
        link: `/admin/dashboard?tab=payments`,
      });
    } else if (event === 'payment.failed' || event === 'payment:failed') {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'failed',
        $set: { 'paymentDetails.webhook_event': event, 'paymentDetails.failedAt': new Date().toISOString() },
      });

      await createNotification({
        customerEmail: order.customer?.email,
        type: 'payment_status',
        title: `Payment failed for order ${orderNum}`,
        message: 'Your Safepay payment could not be processed. Please try again or choose another method.',
        link: { path: '/track-order', params: { order: orderNum } },
        metadata: { status: 'failed' },
      });
    } else if (event === 'payment.refunded' || event === 'payment:refunded' || event === 'payment:refund') {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'refunded',
        $set: { 'paymentDetails.webhook_event': event, 'paymentDetails.refundedAt': new Date().toISOString() },
      });


      await createNotification({
        customerEmail: order.customer?.email,
        type: 'payment_status',
        title: `Refund processed for order ${orderNum}`,
        message: 'Your refund has been initiated via Safepay. Allow 3–5 business days.',
        link: { path: '/track-order', params: { order: orderNum } },
        metadata: { status: 'refunded' },
      });

      if (io) {
        io.to('admin:broadcast').emit('payment:refunded', {
          orderId: order._id,
          orderNumber: orderNum,
          timestamp: new Date().toISOString(),
        });
      }

      await createAdminNotification({
        type: 'refund_processed',
        title: `Safepay refund processed — Order ${orderNum}`,
        message: `Refund via Safepay completed successfully.`,
        link: `/admin/dashboard?tab=payments`,
      });
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Safepay] webhook error:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// ─── POST /api/payments/safepay/refund ────────────────────────────────────────
export const initiateSafepayRefund = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    if (order.paymentStatus !== 'paid') {
      res.status(400).json({ success: false, message: 'Order is not in paid status' });
      return;
    }

    if (!order.transactionId) {
      res.status(400).json({ success: false, message: 'No Safepay transaction ID found on this order' });
      return;
    }

    const success = await createRefund(order.transactionId);
    if (success) {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'refunded',
        $set: { 'paymentDetails.refundInitiatedAt': new Date().toISOString() },
      });
      res.json({ success: true, message: 'Refund initiated successfully' });
    } else {
      res.status(502).json({ success: false, message: 'Safepay refund request failed' });
    }
  } catch (error) {
    console.error('[Safepay] refund error:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};
