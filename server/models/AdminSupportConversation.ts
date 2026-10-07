import mongoose from 'mongoose';

const adminSupportConversationSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    unique: true,
    index: true,
  },
  lastMessageAt: { type: Date, default: Date.now },
  superAdminLastViewedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

adminSupportConversationSchema.index({ lastMessageAt: -1 });

const AdminSupportConversation = mongoose.model(
  'AdminSupportConversation',
  adminSupportConversationSchema
);
export default AdminSupportConversation;
