import mongoose from 'mongoose';

const aiChatAnalyticsSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true,
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  },
  eventType: {
    type: String,
    required: true,
    enum: ['ai_message', 'escalation_request'],
    index: true,
  },
  messageCount: { type: Number, default: 1 },
  tokensUsed: { type: Number },
  aiModelUsed: { type: String },
  lastUserMessage: { type: String },
  createdAt: { type: Date, default: Date.now },
});

aiChatAnalyticsSchema.index({ createdAt: -1 });
aiChatAnalyticsSchema.index({ customerId: 1, eventType: 1, createdAt: -1 });

const AIChatAnalytics = mongoose.model(
  'AIChatAnalytics',
  aiChatAnalyticsSchema
);

export default AIChatAnalytics;
