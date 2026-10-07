import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import Admin from '../models/admin.js';

dotenv.config();

/**
 * CLI script to reset an admin password.
 * Usage: pnpm run admin:reset-password <email> <newPassword>
 */
const resetPassword = async () => {
  const args = process.argv.slice(2).filter(arg => arg !== '--');
  const [email, newPassword] = args;

  if (!email || !newPassword) {
    console.error('❌ Usage: pnpm run admin:reset-password <email> <newPassword>');
    process.exit(1);
  }

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in .env');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!admin) {
      console.error(`❌ Admin with email "${email}" not found.`);
      process.exit(1);
    }

    admin.password = newPassword;
    await admin.save();

    console.log(`✅ Password for admin "${email}" has been successfully updated.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    process.exit(1);
  }
};

resetPassword();
