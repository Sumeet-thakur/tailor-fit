import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const measurementsSchema = new mongoose.Schema({
  label: { type: String, default: 'Default' },
  chest: Number,
  waist: Number,
  hips: Number,
  shoulders: Number,
  sleeveLength: Number,
  shirtLength: Number,
  neck: Number,
  inseam: Number,
  thigh: Number,
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const savedDesignSchema = new mongoose.Schema({
  productId: String,
  productName: String,
  productCategory: String,
  baseImage: String,
  fabric: {
    id: String,
    name: String,
    image: String,
    previewImage: String,
    backPreviewImage: String,
  },
  styles: mongoose.Schema.Types.Mixed,
  measurements: mongoose.Schema.Types.Mixed,
  totalPrice: Number,
  screenshot: String,
  savedAt: { type: Date, default: Date.now },
});

const customerSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  phone: { type: String, trim: true },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: 'Pakistan' },
  },
  profileImage: { type: String, default: '' },
  savedMeasurements: [measurementsSchema],
  savedDesigns: [savedDesignSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

customerSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
  this.updatedAt = new Date();
});

customerSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

customerSchema.pre('save', function () {
  this.updatedAt = new Date();
});

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
