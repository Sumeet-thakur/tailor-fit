import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/admin.js';
import Customer from '../models/customer.js';
import Order from '../models/order.js';
import Notification from '../models/Notification.js';
import Conversation from '../models/Conversation.js';
import ChatMessage from '../models/ChatMessage.js';
import AIChatAnalytics from '../models/AIChatAnalytics.js';
import { emitChatMessage } from '../socket.js';
import type { ChatMessagePayload } from '../socket.js';
import { createAdminNotification } from '../utils/createAdminNotification.js';
import { getGeminiResponse } from '../services/aiChatService.js';
import type { ChatTurn } from '../services/aiChatService.js';
import { deleteDesignWithAssets } from '../utils/deleteHandlers.js';
import { deleteFromCloudinaryByUrl, isCloudinaryUrl, extractPublicIdFromUrl } from '../utils/cloudinaryDelete.js';
import type { CustomerDoc } from '../types/express.js';

const router = express.Router();

// Customer Auth Routes

// Secret key for JWT (use env var in production)
const JWT_SECRET = process.env.JWT_SECRET || 'tailor-fit-secret-key-2026';
const JWT_EXPIRES_IN = '7d';

// Helper to sign tokens
const generateToken = (id: unknown): string => {
  return jwt.sign({ id: String(id) }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Middleware to protect routes
const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;
    // Check for Bearer token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    // Verify token and attach user
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    const customer = await Customer.findById(decoded.id);

    if (!customer) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.customer = customer as unknown as CustomerDoc;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authorized' });
  }
};

// Delete customer-owned asset from Cloudinary (screenshots, profile images)
// Only allows URLs in {CLIENT}/saved-designs, {CLIENT}/cart, {CLIENT}/profiles
router.post('/delete-asset', protect, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }
    const clientPrefix = process.env.CLOUDINARY_CLIENT || 'tailor-fit';
    const allowedPrefixes = [`${clientPrefix}/saved-designs`, `${clientPrefix}/cart`, `${clientPrefix}/profiles`, 'saved-designs', 'cart', 'profiles'];
    const isAllowed = allowedPrefixes.some((p) => url.includes(p));
    if (!isAllowed || !isCloudinaryUrl(url)) {
      return res.status(400).json({ success: false, error: 'URL not allowed for deletion' });
    }
    res.json({ success: true, message: 'Deletion queued', data: { deleted: true } });

    // Run in background
    (async () => {
      try {
        await deleteFromCloudinaryByUrl(url);
      } catch (err) {
        console.error('[Customer] Background delete-asset error:', err);
      }
    })();
  } catch (err) {
    console.error('[Customer] delete-asset setup error:', err);
    res.status(500).json({ success: false, error: 'Failed to queue asset for deletion' });
  }
});

// Create a new account
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Prevent duplicate accounts
    const existingCustomer = await Customer.findOne({ email: email.toLowerCase() });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Security: Check if this email belongs to an Admin
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'This email is reserved for administrative use.',
      });
    }

    // Create the user
    const customer = await Customer.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
    });

    const token = generateToken(customer._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        token,
      },
    });

    // Fire-and-forget: Notify admins about the new customer
    createAdminNotification({
      type: 'new_customer',
      title: 'New Customer Registered',
      message: `${customer.name} just signed up`,
      link: { tab: 'customers' },
      metadata: { customerId: customer._id.toString(), customerName: customer.name },
      recipientRole: 'all',
    }).catch((err) => console.error('[Customers] Admin notification failed:', err));
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create account',
    });
  }
});

// User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Check if user exists and password matches
    const customer = await Customer.findOne({ email: email.toLowerCase() }).select('+password') as CustomerDoc | null;

    if (!customer || !(await customer.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(customer._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,

        address: customer.address,
        profileImage: customer.profileImage, // return image on login
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
});

// Get current user profile
router.get('/me', protect, async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer!._id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Count their orders
    const orderCount = await Order.countDocuments({ 'customer.email': customer.email });

    res.json({
      success: true,
      data: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        profileImage: customer.profileImage,
        savedMeasurements: customer.savedMeasurements,
        savedDesigns: customer.savedDesigns,
        orderCount,
        createdAt: customer.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
    });
  }
});

// Update personal details
router.patch('/me', protect, async (req, res) => {
  try {
    const { name, phone, address, profileImage: newProfileImage } = req.body;

    // When uploading new profile image: delete old Cloudinary URL first
    // Only delete if the URL actually changed. Since we now use `custom_public_id: 'profile'`, the new URL is often identical to the old one.
    if (newProfileImage != null && typeof newProfileImage === 'string') {
      const oldCustomer = await Customer.findById(req.customer!._id).select('profileImage').lean();
      const oldUrl = oldCustomer?.profileImage;
      // Also compare public_ids because Cloudinary versions (v123... urls) change on overwrite
      const oldPublicId = (oldUrl && isCloudinaryUrl(oldUrl)) ? extractPublicIdFromUrl(oldUrl) : null;
      const newPublicId = (newProfileImage && isCloudinaryUrl(newProfileImage)) ? extractPublicIdFromUrl(newProfileImage) : null;

      if (oldUrl && isCloudinaryUrl(oldUrl) && oldUrl !== newProfileImage && oldPublicId !== newPublicId) {
        // Fire and forget deletion to avoid UI blocking
        deleteFromCloudinaryByUrl(oldUrl).catch(err => {
          console.error('[Customer] Failed to delete old profile image in background:', err);
        });
      }
    }

    const customer = await Customer.findByIdAndUpdate(
      req.customer!._id,
      { name, phone, address, profileImage: req.body.profileImage, updatedAt: Date.now() },
      { returnDocument: 'after', runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({
      success: true,
      message: 'Profile updated',
      data: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,

        address: customer.address,
        profileImage: customer.profileImage,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
});

// Notifications
router.get('/notifications', protect, async (req, res) => {
  try {
    const { limit = 50, unreadOnly } = req.query;
    const query: Record<string, unknown> = { customerId: req.customer!._id };
    if (unreadOnly === 'true') query.read = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    const unreadCount = await Notification.countDocuments({
      customerId: req.customer!._id,
      read: false,
    });

    res.json({
      success: true,
      data: { data: notifications, unreadCount },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
    });
  }
});

router.patch('/notifications/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { customerId: req.customer!._id, read: false },
      { $set: { read: true } }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read',
    });
  }
});

router.patch('/notifications/:id/read', protect, async (req, res) => {
  try {
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, customerId: req.customer!._id },
      { $set: { read: true } },
      { returnDocument: 'after' }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
    });
  }
});

router.patch('/notifications/read-by-type', protect, async (req, res) => {
  try {
    const { type } = req.body;
    if (!type || type !== 'chat_message') {
      return res.status(400).json({ success: false, message: 'Invalid type' });
    }
    const result = await Notification.updateMany(
      { customerId: req.customer!._id, type: 'chat_message', read: false },
      { $set: { read: true } }
    );
    res.json({ success: true, data: { modifiedCount: result.modifiedCount ?? 0 } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read',
    });
  }
});

// Get my order history
router.get('/orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ 'customer.email': req.customer!.email })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
    });
  }
});
// Cancel an order
router.post('/orders/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      'customer.email': req.customer!.email
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending orders can be cancelled'
      });
    }

    order.status = 'cancelled';
    // [Action] Save optional cancellation reason from customer
    // [Purpose] Admins can see why the customer cancelled for support and analytics
    const { reason } = req.body;
    if (reason && typeof reason === 'string') {
      (order as any).cancelReason = reason.trim().slice(0, 500);
    }
    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order'
    });
  }
});

// Add new measurements
router.post('/measurements', protect, async (req, res) => {
  try {
    const { label, ...measurements } = req.body;

    const customer = await Customer.findById(req.customer!._id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Turn off old defaults if this one is default
    if (measurements.isDefault) {
      customer.savedMeasurements.forEach(m => m.isDefault = false);
    }

    customer.savedMeasurements.push({ label, ...measurements });
    await customer.save();

    res.status(201).json({
      success: true,
      message: 'Measurements saved',
      data: customer.savedMeasurements,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to save measurements',
    });
  }
});

// Remove a measurement profile
router.delete('/measurements/:id', protect, async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer!._id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    customer.savedMeasurements.pull(req.params.id);
    await customer.save();

    res.json({
      success: true,
      message: 'Measurements deleted',
      data: customer.savedMeasurements,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete measurements',
    });
  }
});

// Save a design draft
router.post('/designs', protect, async (req, res) => {
  try {
    const design = req.body;

    const customer = await Customer.findById(req.customer!._id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    customer.savedDesigns.push(design);
    await customer.save();

    res.status(201).json({
      success: true,
      message: 'Design saved to your account',
      data: customer.savedDesigns,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to save design',
    });
  }
});

// Delete a saved design (removes Cloudinary screenshot/assets then removes from customer)
router.delete('/designs/:id', protect, async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer!._id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const designId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { removed, assetsDeleted } = await deleteDesignWithAssets(customer as unknown as Parameters<typeof deleteDesignWithAssets>[0], designId);

    if (!removed) {
      return res.status(404).json({ success: false, message: 'Design not found' });
    }

    res.json({
      success: true,
      message: 'Design deleted',
      data: customer.savedDesigns,
      assetsDeleted: assetsDeleted ?? 0,
    });
  } catch (error) {
    console.error('[Customer] Delete design error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete design: ' + (error instanceof Error ? error.message : String(error)),
    });
  }
});

// Chat - get or create my conversation
router.get('/chat/conversation', protect, async (req, res) => {
  try {
    let conv: Record<string, unknown> | null = await Conversation.findOne({ customerId: req.customer!._id }).lean();
    if (!conv) {
      const created = await Conversation.create({ customerId: req.customer!._id });
      conv = created.toObject() as Record<string, unknown>;
    }
    res.json({ success: true, data: conv });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get conversation' });
  }
});

// Chat - get messages
router.get('/chat/messages', protect, async (req, res) => {
  try {
    const conv = await Conversation.findOne({ customerId: req.customer!._id });
    if (!conv) {
      return res.json({ success: true, data: [] });
    }
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const before = req.query.before as string | undefined;
    const query: Record<string, unknown> = { conversationId: conv._id };
    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, data: messages.reverse() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

// Chat - send message
router.post('/chat/messages', protect, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }
    const trimmed = content.trim().slice(0, 2000);
    if (!trimmed) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    let conv = await Conversation.findOne({ customerId: req.customer!._id });
    if (!conv) {
      conv = await Conversation.create({ customerId: req.customer!._id });
    }

    const msg = await ChatMessage.create({
      conversationId: conv._id,
      senderId: req.customer!._id,
      senderModel: 'Customer',
      content: trimmed,
    });

    await Conversation.findByIdAndUpdate(conv._id, { lastMessageAt: new Date() });

    const payload: ChatMessagePayload = {
      _id: msg._id.toString(),
      conversationId: conv._id.toString(),
      senderId: msg.senderId!.toString(),
      senderModel: msg.senderModel as ChatMessagePayload['senderModel'],
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
    };
    emitChatMessage(conv._id, payload);

    // Fire-and-forget: Notify admins about the new customer chat message
    createAdminNotification({
      type: 'chat_message',
      title: 'New Customer Message',
      message: `${req.customer!.name}: ${trimmed.slice(0, 80)}${trimmed.length > 80 ? '...' : ''}`,
      link: { tab: 'chat' },
      metadata: { customerId: req.customer!._id.toString(), customerName: req.customer!.name, conversationId: conv._id.toString() },
      recipientRole: 'all',
    }).catch((err) => console.error('[Customers] Chat admin notification failed:', err));

    res.status(201).json({ success: true, data: msg });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

// Chat - send message to AI assistant (Gemini)
router.post('/chat/ai-message', protect, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }
    const trimmed = content.trim().slice(0, 2000);
    if (!trimmed) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    let conv = await Conversation.findOne({ customerId: req.customer!._id });
    if (!conv) {
      conv = await Conversation.create({ customerId: req.customer!._id });
    }

    const recentMessages = await ChatMessage.find({ conversationId: conv._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const history: ChatTurn[] = recentMessages
      .reverse()
      .map((m) => ({
        role: (m.senderModel === 'Customer' ? 'user' : 'model') as ChatTurn['role'],
        content: m.content,
      }));

    const customerMsg = await ChatMessage.create({
      conversationId: conv._id,
      senderId: req.customer!._id,
      senderModel: 'Customer',
      content: trimmed,
    });

    await Conversation.findByIdAndUpdate(conv._id, { lastMessageAt: new Date() });

    const customerPayload: ChatMessagePayload = {
      _id: customerMsg._id.toString(),
      conversationId: conv._id.toString(),
      senderId: customerMsg.senderId!.toString(),
      senderModel: 'Customer' as const,
      content: customerMsg.content,
      createdAt: customerMsg.createdAt.toISOString(),
    };
    emitChatMessage(conv._id, customerPayload);

    const { text: aiResponse, tokensUsed } = await getGeminiResponse(trimmed, history);

    const aiMsg = await ChatMessage.create({
      conversationId: conv._id,
      senderModel: 'AI',
      content: aiResponse.slice(0, 2000),
      metadata: {
        aiModelUsed: 'gemini-2.5-flash',
        tokensUsed: tokensUsed ?? undefined,
      },
    });

    await Conversation.findByIdAndUpdate(conv._id, { lastMessageAt: new Date() });

    const aiPayload: ChatMessagePayload = {
      _id: aiMsg._id.toString(),
      conversationId: conv._id.toString(),
      senderId: '',
      senderModel: 'AI' as const,
      content: aiMsg.content,
      createdAt: aiMsg.createdAt.toISOString(),
      metadata: aiMsg.metadata ? { aiModelUsed: aiMsg.metadata.aiModelUsed ?? undefined, tokensUsed: aiMsg.metadata.tokensUsed ?? undefined } as ChatMessagePayload['metadata'] : undefined,
    };
    emitChatMessage(conv._id, aiPayload);

    await AIChatAnalytics.create({
      customerId: req.customer!._id,
      conversationId: conv._id,
      eventType: 'ai_message',
      messageCount: 1,
      tokensUsed: tokensUsed ?? undefined,
      aiModelUsed: 'gemini-2.5-flash',
      lastUserMessage: trimmed,
    });

    res.status(201).json({ success: true, data: { customerMsg, aiMsg } });
  } catch (error) {
    console.error('[AI Chat] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get AI response' });
  }
});

// Chat - escalate to human (log analytics)
router.post('/chat/escalate', protect, async (req, res) => {
  try {
    let conv = await Conversation.findOne({ customerId: req.customer!._id });
    if (!conv) {
      conv = await Conversation.create({ customerId: req.customer!._id });
    }

    await AIChatAnalytics.create({
      customerId: req.customer!._id,
      conversationId: conv._id,
      eventType: 'escalation_request',
    });

    res.json({ success: true, message: 'Escalation requested' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to escalate' });
  }
});

// Update password
router.patch('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const customer = await Customer.findById(req.customer!._id).select('+password') as CustomerDoc | null;
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (!(await customer.comparePassword(currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    customer.password = newPassword;
    await customer.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
    });
  }
});

export default router;
