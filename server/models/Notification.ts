import mongoose from 'mongoose';

export type NotificationType =
  | 'order_status'
  | 'payment_status'
  | 'payment_failed'
  | 'payment_refunded'
  | 'password_reset'
  | 'profile_update'
  | 'chat_message';

const notificationSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['order_status', 'payment_status', 'payment_failed', 'payment_refunded', 'password_reset', 'profile_update', 'chat_message'],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  metadata: {
    status: { type: String },
  },
  link: {
    path: { type: String },
    params: { type: mongoose.Schema.Types.Mixed },
  },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ customerId: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
