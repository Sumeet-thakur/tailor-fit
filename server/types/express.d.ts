import type { Document } from 'mongoose';

export interface CustomerDoc extends Document {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: Record<string, unknown>;
  profileImage?: string;
  password?: string;
  savedMeasurements?: unknown[];
  savedDesigns?: unknown[];
  comparePassword: (candidate: string) => Promise<boolean>;
  createdAt?: Date;
}

export interface AdminDoc extends Document {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  profileImage?: string;
  lastLogin?: Date;
  password?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  comparePassword: (candidate: string) => Promise<boolean>;
  createPasswordResetToken: () => string;
}

declare global {
  namespace Express {
    interface Request {
      customer?: CustomerDoc;
      admin?: AdminDoc;
    }
  }
}
