import mongoose from 'mongoose';
import Admin from '../models/admin.js';

const connectDB = async (): Promise<void> => {
  try {
    console.log('Attempting to connect to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('Missing MongoDB connection string. Set MONGODB_URI in .env.');
    }
    const conn = await mongoose.connect(mongoUri, {
      // ─── Connection pool — prevent overloading on small VPS ────────
      maxPoolSize: 20,              // Default 100 is overkill for 4GB RAM
      minPoolSize: 2,               // Keep 2 warm connections ready
      serverSelectionTimeoutMS: 5000, // Fail fast if MongoDB unreachable
      socketTimeoutMS: 45_000,      // Close idle sockets after 45s
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Auto-seed super admin on first start (empty database)
    const adminCount = await Admin.countDocuments({ role: 'super_admin' });
    if (adminCount === 0 && process.env.SEED_ADMIN_EMAIL) {
      await Admin.create({
        name: process.env.SEED_ADMIN_NAME || 'Super Admin',
        email: process.env.SEED_ADMIN_EMAIL,
        password: process.env.SEED_ADMIN_PASSWORD || 'Admin123!',
        role: 'super_admin',
      });
      console.log('✅ Seeded initial super admin:', process.env.SEED_ADMIN_EMAIL);
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
};

export default connectDB;
