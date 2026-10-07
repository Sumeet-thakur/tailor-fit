import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import type { AdminDoc } from '../types/express.js';

const adminSchema = new mongoose.Schema({
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
  role: {
    type: String,
    enum: ['admin', 'super_admin'],
    default: 'admin',
  },
  profileImage: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

adminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
  this.updatedAt = new Date();
});

adminSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

adminSchema.methods.createPasswordResetToken = function (): string {
  const resetToken =
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  this.passwordResetToken = resetToken;
  this.passwordResetExpires = new Date(Date.now() + 3600000);
  return resetToken;
};

const Admin = mongoose.model<AdminDoc>('Admin', adminSchema);
export default Admin;
