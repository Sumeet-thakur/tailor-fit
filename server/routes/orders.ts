import express from 'express';
import type { Request, Response } from 'express';
import Order from '../models/order.js';
import { createNotification } from '../utils/createNotification.js';
import { createAdminNotification } from '../utils/createAdminNotification.js';
import { getIO } from '../socket.js';

const router = express.Router();

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_production: 'In Production',
  ready: 'Ready for Pickup',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  refunded: 'Refunded',
};

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      customer,
      items,
      subtotal,
      shippingCost,
      tax,
      total,
      paymentMethod,
      notes,
      transactionId,
      paymentGateway,
      paymentDetails,
      discount,
      promoCode,
      orderNumber, // Added to bypass duplicate key race condition in load tests
    } = req.body;

    if (!customer || !items || items.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Customer info and at least one item required',
      });
      return;
    }

    // [Order Creation Logic] - Saves new order and defaults payment to COD
    const order = new Order({
      orderNumber,
      customer,
      items,
      subtotal,
      shippingCost: shippingCost || 0,
      tax: tax || 0,
      total,
      paymentMethod: paymentMethod || 'cod',
      notes,
      transactionId,
      paymentGateway,
      paymentDetails,
      discount: discount || 0,
      promoCode: promoCode || undefined,
    });

    await order.save(); // Generates orderNumber

    // [Promo Code Usage] - Increment usage count for applied promo code
    // Non-blocking: promo tracking is fire-and-forget so order creation never fails due to promo
    if (promoCode) {
      try {
        const PromoCodeModel = (await import('../models/promoCode.js')).default;
        await PromoCodeModel.findOneAndUpdate(
          { code: promoCode.toUpperCase(), isActive: true },
          { $inc: { usedCount: 1 } }
        );
      } catch (promoErr) {
        console.error('[Orders] Failed to increment promo usage:', promoErr);
      }
    }

    // [Screenshot Organization] - Move/rename screenshots to orders/{orderNumber}/
    // Only runs if items have real screenshot URLs (skipped for K6/load tests)
    const hasScreenshots = items.some((item: any) => item.screenshot && typeof item.screenshot === 'string');
    if (hasScreenshots) {
      try {
        const { organizeOrderScreenshots } = await import('../utils/organizeOrderScreenshots.js');
        const orderNum = order.orderNumber || order._id.toString();
        const originalUrls = order.items.map((item: any) => item.screenshot || '');

        const updatedItems = await organizeOrderScreenshots(order.items as any, orderNum);

        // [Perf] Only save again if screenshot URLs actually changed
        const hasChanges = updatedItems.some(
          (item: any, i: number) => item.screenshot !== originalUrls[i]
        );
        if (hasChanges) {
          order.items = updatedItems as any;
          await order.save();
          console.log(`[OrderController] Organized screenshots for order ${orderNum}`);
        }
      } catch (orgError) {
        console.error('[OrderController] Failed to organize screenshots:', orgError);
        // Non-critical: screenshots stay in old location
      }
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: order,
    });

    // Fire-and-forget: Notify admins about the new order
    const orderNum = order.orderNumber || order._id.toString();
    const custName = order.customer?.name || 'Customer';
    createAdminNotification({
      type: 'new_order',
      title: `New Order ${orderNum}`,
      message: `${custName} placed a new order`,
      link: { tab: 'orders' },
      metadata: { orderId: order._id.toString(), customerName: custName },
      recipientRole: 'all',
    }).catch((err) => console.error('[Orders] Admin notification failed:', err));
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: (error as Error).message,
    });
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    const query = status ? { status } : {};

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      count: orders.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: (error as Error).message,
    });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    let order = null;
    if (/^[0-9a-fA-F]{24}$/.test(id as string)) {
      order = await Order.findById(id);
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: (id as string).toUpperCase() });
    }

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: (error as Error).message,
    });
  }
});

router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { status } = req.body;

    const validStatuses = [
      'pending',
      'confirmed',
      'in_production',
      'ready',
      'shipped',
      'delivered',
      'cancelled',
    ];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { returnDocument: 'after' }
    );

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    // [Notification Logic] - Alert customer of status change
    // Sends real-time notification with link to track order
    const orderNum = order.orderNumber || order._id.toString();
    const statusLabel = STATUS_LABELS[status] || status;
    await createNotification({
      customerEmail: order.customer?.email,
      type: 'order_status',
      title: `Order ${orderNum} updated`,
      message: `Your order status is now: ${statusLabel}`,
      link: { path: '/track-order', params: { order: orderNum } },
      metadata: { status },
    });

    // [Admin Alert] - Notify admins if an order is cancelled
    if (status === 'cancelled') {
      const io = getIO();
      const customerName = order.customer?.name || 'Customer';
      
      await createAdminNotification({
        type: 'order_cancelled',
        title: `Order Cancelled: ${orderNum}`,
        message: `Order for ${customerName} has been cancelled.`,
        link: `/admin/dashboard?tab=orders`,
        recipientRole: 'all',
      }).catch((err) => console.error('[Orders] Admin cancel notification failed:', err));

      if (io) {
        io.to('admin:broadcast').emit('order:cancelled', {
          orderId: order._id,
          orderNumber: orderNum,
          customerName,
          timestamp: new Date().toISOString(),
        });
      }
    }

    res.json({ success: true, message: 'Order status updated', data: order });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update order',
      error: (error as Error).message,
    });
  }
});

router.patch('/:id/payment', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentStatus, transactionId, paymentDetails } = req.body;

    const updateFields: Record<string, unknown> = { updatedAt: new Date() };
    if (paymentStatus) updateFields.paymentStatus = paymentStatus;
    if (transactionId) updateFields.transactionId = transactionId;
    if (paymentDetails) updateFields.paymentDetails = paymentDetails;

    const order = await Order.findByIdAndUpdate(id, { $set: updateFields }, { returnDocument: 'after' });

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    // Notify customer when admin changes payment status
    if (paymentStatus) {
      const orderNum = order.orderNumber || order._id.toString();
      const paymentLabel = PAYMENT_LABELS[paymentStatus] || paymentStatus;
      await createNotification({
        customerEmail: order.customer?.email,
        type: 'payment_status',
        title: `Payment update for order ${orderNum}`,
        message: `Payment status: ${paymentLabel}`,
        link: { path: '/track-order', params: { order: orderNum } },
        metadata: { status: paymentStatus },
      });

      if (paymentStatus === 'refunded') {
        const io = getIO();
        
        await createAdminNotification({
            type: 'refund_processed',
            title: `Manual refund logged — Order ${orderNum}`,
            message: `Order ${orderNum} was marked as refunded.`,
            link: `/admin/dashboard?tab=orders`,
            recipientRole: 'all',
        }).catch((err) => console.error('[Orders] Admin refund notification failed:', err));

        if (io) {
            io.to('admin:broadcast').emit('payment:refunded', {
                orderId: order._id,
                orderNumber: orderNum,
                timestamp: new Date().toISOString(),
                manual: true
            });
        }
      }
    }

    // [Admin Alert] - Notify specific verification needed event
    // When customer submits a transaction ID, admins need to go verify it manually
    if (transactionId && paymentStatus === 'pending_verification') {
      const io = getIO();
      if (io) {
        const orderNum = order.orderNumber || order._id.toString();
        io.to('admin:broadcast').emit('payment:verification-needed', {
          orderId: order._id,
          orderNumber: orderNum,
          transactionId,
          customerName: order.customer?.name || 'Customer',
          customerEmail: order.customer?.email,
          timestamp: new Date().toISOString(),
        });
      }
    }

    res.json({ success: true, message: 'Payment details updated', data: order });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update payment details',
      error: (error as Error).message,
    });
  }
});

router.get('/customer/:email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.params as { email: string };

    const orders = await Order.find({ 'customer.email': email.toLowerCase() }).sort({
      createdAt: -1,
    });

    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: (error as Error).message,
    });
  }
});

export default router;
