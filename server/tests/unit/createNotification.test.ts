import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNotification } from '../../utils/createNotification.js';
import Notification from '../../models/Notification.js';
import Customer from '../../models/customer.js';
import { Types } from 'mongoose';

// Mock socket.js
vi.mock('../../socket.js', () => ({
    emitNotificationToCustomer: vi.fn(),
}));

import { emitNotificationToCustomer } from '../../socket.js';

describe('createNotification', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should create a notification and emit socket event when customerId is provided', async () => {
        const customerId = new Types.ObjectId();
        const input = {
            customerId,
            type: 'order_status' as const,
            title: 'Test Notification',
            message: 'This is a test',
            link: { path: '/orders/123' },
        };

        await createNotification(input);

        // Check DB
        const notifications = await Notification.find({ customerId });
        expect(notifications).toHaveLength(1);
        expect(notifications[0].title).toBe('Test Notification');
        expect(notifications[0].message).toBe('This is a test');

        // Check Socket
        expect(emitNotificationToCustomer).toHaveBeenCalledWith(customerId, expect.objectContaining({
            title: 'Test Notification',
            message: 'This is a test',
        }));
    });

    it('should lookup customer by email and create notification', async () => {
        // Create customer first
        const customer = await Customer.create({
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
        });

        const input = {
            customerEmail: 'test@example.com',
            type: 'chat_message' as const,
            title: 'Email Promo',
            message: 'Promo message',
        };

        await createNotification(input);

        const notifications = await Notification.find({ customerId: customer._id });
        expect(notifications).toHaveLength(1);
        expect(notifications[0].title).toBe('Email Promo');

        expect(emitNotificationToCustomer).toHaveBeenCalledWith(customer._id, expect.any(Object));
    });

    it('should do nothing if customer not found by email', async () => {
        const input = {
            customerEmail: 'nonexistent@example.com',
            type: 'order_status' as const,
            title: 'System',
            message: 'Message',
        };

        await createNotification(input);

        const count = await Notification.countDocuments();
        expect(count).toBe(0);
        expect(emitNotificationToCustomer).not.toHaveBeenCalled();
    });
});
