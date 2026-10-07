import express, { type Request, Response } from 'express';
import Conversation from '../../models/Conversation.js';
import ChatMessage from '../../models/ChatMessage.js';
import AIChatAnalytics from '../../models/AIChatAnalytics.js';
import AdminSupportConversation from '../../models/AdminSupportConversation.js';
import AdminSupportMessage from '../../models/AdminSupportMessage.js';
import { emitChatMessage, emitAdminSupportMessage } from '../../socket.js';
import { createNotification } from '../../utils/createNotification.js';
import { createAdminNotification } from '../../utils/createAdminNotification.js';
import { protectAdmin, requireSuperAdmin } from '../../middleware/adminAuth.js';

const router = express.Router();

// Chat - count of conversations with unread messages (for badge - shows how many customers)
router.get('/chat/unread-total', protectAdmin, async (req, res) => {
    try {
        const convs = await Conversation.find().select('_id adminLastViewedAt').lean();
        let count = 0;
        for (const c of convs) {
            const since = c.adminLastViewedAt || new Date(0);
            const hasUnread = await ChatMessage.exists({
                conversationId: c._id,
                senderModel: 'Customer',
                createdAt: { $gt: since },
            });
            if (hasUnread) count++;
        }
        res.json({ success: true, data: count });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
    }
});

// Chat - list all conversations
router.get('/chat/conversations', protectAdmin, async (req, res) => {
    try {
        const convs = await Conversation.find()
            .sort({ lastMessageAt: -1 })
            .populate('customerId', 'name email profileImage')
            .lean();

        const items = await Promise.all(
            convs.map(async (c) => {
                const since = c.adminLastViewedAt || new Date(0);
                const unreadCount = await ChatMessage.countDocuments({
                    conversationId: c._id,
                    senderModel: 'Customer',
                    createdAt: { $gt: since },
                });
                const customerId = c.customerId as { name?: string; email?: string; profileImage?: string } | undefined;
                return {
                    _id: c._id,
                    customerId: c.customerId,
                    customerName: customerId?.name,
                    customerEmail: customerId?.email,
                    customerProfileImage: customerId?.profileImage,
                    lastMessageAt: c.lastMessageAt,
                    createdAt: c.createdAt,
                    unreadCount,
                };
            })
        );

        res.json({ success: true, data: items });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
    }
});

// Chat - get messages for a conversation
router.get('/chat/conversations/:id/messages', protectAdmin, async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        if (!id) {
            res.status(400).json({ success: false, message: 'Conversation ID required' });
            return;
        }
        const conv = await Conversation.findById(id);
        if (!conv) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        await Conversation.findByIdAndUpdate(conv._id, { adminLastViewedAt: new Date() });

        const limit = Math.min(parseInt(String(req.query.limit)) || 50, 100);
        const before = req.query.before;
        const query: Record<string, unknown> = { conversationId: conv._id };
        if (before && typeof before === 'string') query.createdAt = { $lt: new Date(before) };

        const messages = await ChatMessage.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        res.json({ success: true, data: messages.reverse() });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch messages' });
    }
});

// Chat - send message as admin
router.post('/chat/conversations/:id/messages', protectAdmin, async (req: Request, res: Response) => {
    try {
        const { content } = req.body;
        if (!content || typeof content !== 'string') {
            res.status(400).json({ success: false, message: 'Message content is required' });
            return;
        }
        const trimmed = content.trim().slice(0, 2000);
        if (!trimmed) {
            res.status(400).json({ success: false, message: 'Message cannot be empty' });
            return;
        }

        const id = req.params.id;
        if (!id) {
            res.status(400).json({ success: false, message: 'Conversation ID required' });
            return;
        }

        const conv = await Conversation.findById(id);
        if (!conv) {
            res.status(404).json({ success: false, message: 'Conversation not found' });
            return;
        }

        const admin = req.admin;
        if (!admin) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        const msg = await ChatMessage.create({
            conversationId: conv._id,
            senderId: admin._id,
            senderModel: 'Admin',
            content: trimmed,
        });

        await Conversation.findByIdAndUpdate(conv._id, { lastMessageAt: new Date() });

        const payload = {
            _id: msg._id.toString(),
            conversationId: conv._id.toString(),
            senderId: (msg.senderId ?? msg._id).toString(),
            senderModel: msg.senderModel,
            content: msg.content,
            createdAt: msg.createdAt.toISOString(),
        };
        emitChatMessage(conv._id, payload);

        const preview = trimmed.length > 80 ? trimmed.slice(0, 80) + '...' : trimmed;
        createNotification({
            customerId: conv.customerId,
            type: 'chat_message',
            title: 'New message from support',
            message: preview,
            link: { path: '/account' },
        }).catch(() => { });

        res.status(201).json({ success: true, data: msg });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
});

// AI Chat Analytics (super admin only)
router.get('/ai-chat/analytics', protectAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
        const days = Math.min(parseInt(String(req.query.days)) || 7, 90);
        const since = new Date();
        since.setDate(since.getDate() - days);

        const [aiMessages, escalations] = await Promise.all([
            AIChatAnalytics.aggregate([
                { $match: { eventType: 'ai_message', createdAt: { $gte: since } } },
                { $group: { _id: null, count: { $sum: 1 }, totalTokens: { $sum: '$tokensUsed' } } },
            ]),
            AIChatAnalytics.countDocuments({ eventType: 'escalation_request', createdAt: { $gte: since } }),
        ]);

        const aiCount = aiMessages[0]?.count ?? 0;
        const totalTokens = aiMessages[0]?.totalTokens ?? 0;
        const escalationRate = aiCount > 0 ? ((escalations / aiCount) * 100).toFixed(1) : 0;

        res.json({
            success: true,
            data: {
                aiMessageCount: aiCount,
                escalationCount: escalations,
                escalationRatePercent: escalationRate,
                totalTokensUsed: totalTokens,
                periodDays: days,
                modelName: 'Gemini 2.5 Flash',
                provider: 'Google AI',
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch AI chat analytics' });
    }
});

// ========== Admin Support (Admin → Super Admin) ==========

// Admin: get or create my support conversation
router.get('/support/conversation', protectAdmin, async (req: Request, res: Response) => {
    try {
        const admin = req.admin;
        if (!admin) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }
        let conv = await AdminSupportConversation.findOne({ adminId: admin._id }).lean();
        if (!conv) {
            const created = await AdminSupportConversation.create({ adminId: admin._id });
            res.json({ success: true, data: created.toObject ? created.toObject() : created });
            return;
        }
        res.json({ success: true, data: conv });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get support conversation' });
    }
});

// Admin: get my support messages
router.get('/support/messages', protectAdmin, async (req: Request, res: Response) => {
    try {
        const admin = req.admin;
        if (!admin) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }
        const conv = await AdminSupportConversation.findOne({ adminId: admin._id });
        if (!conv) {
            res.json({ success: true, data: [] });
            return;
        }
        const limit = Math.min(parseInt(String(req.query.limit)) || 50, 100);
        const before = req.query.before;
        const query: Record<string, unknown> = { conversationId: conv._id };
        if (before && typeof before === 'string') query.createdAt = { $lt: new Date(before) };

        const messages = await AdminSupportMessage.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        res.json({ success: true, data: messages.reverse() });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch messages' });
    }
});

// Admin: send support message
router.post('/support/messages', protectAdmin, async (req: Request, res: Response) => {
    try {
        const { content } = req.body;
        if (!content || typeof content !== 'string') {
            res.status(400).json({ success: false, message: 'Message content is required' });
            return;
        }
        const trimmed = content.trim().slice(0, 2000);
        if (!trimmed) {
            res.status(400).json({ success: false, message: 'Message cannot be empty' });
            return;
        }

        const admin = req.admin;
        if (!admin) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        let conv = await AdminSupportConversation.findOne({ adminId: admin._id });
        if (!conv) {
            conv = await AdminSupportConversation.create({ adminId: admin._id });
        }

        const msg = await AdminSupportMessage.create({
            conversationId: conv._id,
            senderId: admin._id,
            senderModel: 'Admin',
            content: trimmed,
        });

        await AdminSupportConversation.findByIdAndUpdate(conv._id, { lastMessageAt: new Date() });

        const payload = {
            _id: msg._id.toString(),
            conversationId: conv._id.toString(),
            senderId: (msg.senderId ?? msg._id).toString(),
            senderModel: msg.senderModel,
            content: msg.content,
            createdAt: (msg.createdAt as Date).toISOString(),
        };
        emitAdminSupportMessage(conv._id, payload);

        // Fire-and-forget: Notify super admins about admin support message
        createAdminNotification({
            type: 'admin_support',
            title: 'Admin Support Query',
            message: `${admin.name}: ${trimmed.slice(0, 80)}${trimmed.length > 80 ? '...' : ''}`,
            link: { tab: 'admin-queries' },
            metadata: { conversationId: conv._id.toString() },
            recipientRole: 'super_admin',
        }).catch((err) => console.error('[AdminChat] Support notification failed:', err));

        res.status(201).json({ success: true, data: msg });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
});

// Super Admin: get unread total (conversations with unread messages)
router.get('/support/unread-total', protectAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
        const convs = await AdminSupportConversation.find().select('_id superAdminLastViewedAt').lean();
        let count = 0;
        for (const c of convs) {
            const since = c.superAdminLastViewedAt || new Date(0);
            const hasUnread = await AdminSupportMessage.exists({
                conversationId: c._id,
                senderModel: 'Admin',
                createdAt: { $gt: since },
            });
            if (hasUnread) count++;
        }
        res.json({ success: true, data: count });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch unread total' });
    }
});

// Super Admin: list all admin support conversations
router.get('/support/conversations', protectAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
        const convs = await AdminSupportConversation.find()
            .populate('adminId', 'name email profileImage')
            .sort({ lastMessageAt: -1 })
            .lean();

        const list = await Promise.all(
            convs.map(async (c) => {
                const adminId = c.adminId;
                const adminObj: { name: string; email: string; profileImage?: string } =
                    (typeof adminId === 'object' && adminId && 'name' in adminId && 'email' in adminId)
                        ? (adminId as { name: string; email: string; profileImage?: string })
                        : { name: 'Admin', email: '', profileImage: undefined };
                const sinceDate = (c.superAdminLastViewedAt && new Date(c.superAdminLastViewedAt)) || new Date(0);
                const unread = await AdminSupportMessage.countDocuments({
                    conversationId: c._id,
                    senderModel: 'Admin',
                    createdAt: { $gt: sinceDate },
                });
                return {
                    _id: c._id,
                    adminId: adminId,
                    adminName: adminObj.name,
                    adminEmail: adminObj.email,
                    adminProfileImage: adminObj.profileImage,
                    lastMessageAt: c.lastMessageAt,
                    createdAt: c.createdAt,
                    unreadCount: unread,
                };
            })
        );

        res.json({ success: true, data: list });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
    }
});

// Super Admin: get messages for a conversation
router.get('/support/conversations/:id/messages', protectAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        if (!id) {
            res.status(400).json({ success: false, message: 'Conversation ID required' });
            return;
        }
        const conv = await AdminSupportConversation.findById(id);
        if (!conv) {
            res.status(404).json({ success: false, message: 'Conversation not found' });
            return;
        }
        const limit = Math.min(parseInt(String(req.query.limit)) || 50, 100);
        const before = req.query.before;
        const query: Record<string, unknown> = { conversationId: conv._id };
        if (before && typeof before === 'string') query.createdAt = { $lt: new Date(before) };

        const messages = await AdminSupportMessage.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        await AdminSupportConversation.findByIdAndUpdate(conv._id, { superAdminLastViewedAt: new Date() });

        res.json({ success: true, data: messages.reverse() });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch messages' });
    }
});

export default router;
