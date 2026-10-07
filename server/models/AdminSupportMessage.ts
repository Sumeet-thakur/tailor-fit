import mongoose from 'mongoose';

const adminSupportMessageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminSupportConversation',
    required: true,
    index: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  senderModel: {
    type: String,
    required: true,
    enum: ['Admin', 'SuperAdmin'],
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  createdAt: { type: Date, default: Date.now },
});

adminSupportMessageSchema.index({ conversationId: 1, createdAt: -1 });

const AdminSupportMessage = mongoose.model(
  'AdminSupportMessage',
  adminSupportMessageSchema
);
export default AdminSupportMessage;
