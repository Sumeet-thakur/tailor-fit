import type { Types } from 'mongoose';
import Notification from '../models/Notification.js';
import Customer from '../models/customer.js';
import type { NotificationType } from '../models/Notification.js';
import { emitNotificationToCustomer } from '../socket.js';

interface LinkParams {
  path: string;
  params?: Record<string, string>;
}

interface CreateNotificationInput {
  customerId?: Types.ObjectId;
  customerEmail?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: LinkParams;
  metadata?: { status?: string };
}

/**
 * Create a notification for a customer. Use customerId or customerEmail to identify the customer.
 * If customerEmail is used, looks up Customer by email to get customerId.
 * Emits the notification via Socket.io for real-time delivery.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  let customerId = input.customerId;

  if (!customerId && input.customerEmail) {
    const customer = await Customer.findOne({ email: input.customerEmail.toLowerCase() });
    if (!customer) return;
    customerId = customer._id;
  }

  if (!customerId) return;

  const doc = await Notification.create({
    customerId,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link,
    metadata: input.metadata,
  });

  emitNotificationToCustomer(customerId, {
    _id: doc._id.toString(),
    type: doc.type,
    title: doc.title,
    message: doc.message,
    link: doc.link ? (doc.link as any) : undefined,
    read: doc.read,
    createdAt: doc.createdAt.toISOString(),
  });
}
