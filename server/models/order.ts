import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  productCategory: { type: String, required: true },
  baseImage: { type: String },
  screenshot: { type: String },
  fabric: {
    id: String,
    name: String,
    priceModifier: { type: Number, default: 0 },
  },
  styles: { type: mongoose.Schema.Types.Mixed, default: {} },
  measurements: { type: mongoose.Schema.Types.Mixed, default: {} },
  basePrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  quantity: { type: Number, default: 1 },
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  customer: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String },
      postalCode: { type: String, required: true },
      country: { type: String, default: 'Pakistan' },
    },
  },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true },
  shippingCost: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'bank_transfer', 'safepay', 'card'],
    default: 'cod',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'pending_verification', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  transactionId: { type: String },
  paymentGateway: {
    type: String,
    enum: ['safepay', 'stripe', 'paypal', 'none'],
    default: 'none',
  },
  paymentDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
  discount: { type: Number, default: 0 },
  promoCode: { type: String, default: null },
  cancelReason: { type: String, default: null },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

orderSchema.pre('save', async function () {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const count = (await mongoose.model('Order').countDocuments()) + 1;
    this.orderNumber = `TF${year}${month}${count.toString().padStart(5, '0')}`;
  }
  this.updatedAt = new Date();
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
