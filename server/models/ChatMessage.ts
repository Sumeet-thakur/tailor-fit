import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
    refPath: 'senderModel',
  },
  senderModel: {
    type: String,
    required: true,
    enum: ['Customer', 'Admin', 'AI'],
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  metadata: {
    aiModelUsed: { type: String },
    tokensUsed: { type: Number },
    isEscalationRequest: { type: Boolean, default: false },
  },
  createdAt: { type: Date, default: Date.now },
});

chatMessageSchema.index({ conversationId: 1, createdAt: -1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export default ChatMessage;
