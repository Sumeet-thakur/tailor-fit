import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    unique: true,
    index: true,
  },
  lastMessageAt: { type: Date, default: Date.now },
  adminLastViewedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

conversationSchema.index({ lastMessageAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
