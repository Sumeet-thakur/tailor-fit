/**
 * Admin CLI: Safe User Deletion
 * ──────────────────────────────
 * Deletes a customer or admin with full Cloudinary cleanup.
 *
 * Usage:
 *   pnpm run admin:delete-user -- --type=customer --email=user@example.com
 *   pnpm run admin:delete-user -- --type=admin --id=65f1a2b3c4d5e6f7
 *
 * Works locally and on VPS (uses .env MONGODB_URI).
 */
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { deleteCustomerWithAssets, deleteAdminWithAssets } from '../utils/deleteHandlers.js';
import Customer from '../models/customer.js';
import Admin from '../models/admin.js';

dotenv.config();

const args = process.argv.slice(2);
const flags = Object.fromEntries(
    args.filter(a => a.startsWith('--')).map(a => {
        const [k, v] = a.replace('--', '').split('=');
        return [k, v || 'true'];
    })
);

async function run() {
    const { type, id, email } = flags;

    if (!type || !['customer', 'admin'].includes(type)) {
        console.error('❌ Usage: --type=customer|admin --id=<id> OR --email=<email>');
        process.exit(1);
    }
    if (!id && !email) {
        console.error('❌ Provide --id=<objectId> or --email=<email>');
        process.exit(1);
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) { console.error('❌ MONGODB_URI not set in .env'); process.exit(1); }

    await mongoose.connect(uri);
    console.log(`✅ Connected to MongoDB`);

    let targetId = id;

    // Resolve email → id
    if (email && !targetId) {
        if (type === 'customer') {
            const doc = await Customer.findOne({ email }).select('_id').lean();
            if (!doc) { console.error(`❌ Customer with email "${email}" not found`); process.exit(1); }
            targetId = doc._id.toString();
        } else {
            const doc = await Admin.findOne({ email }).select('_id').lean();
            if (!doc) { console.error(`❌ Admin with email "${email}" not found`); process.exit(1); }
            targetId = doc._id.toString();
        }
        console.log(`📧 Resolved email "${email}" → ID: ${targetId}`);
    }

    console.log(`🗑️  Deleting ${type} ${targetId} (DB + Cloudinary)...`);

    const result = type === 'customer'
        ? await deleteCustomerWithAssets(targetId!)
        : await deleteAdminWithAssets(targetId!);

    if (result.deleted) {
        console.log(`✅ ${type} deleted. ${result.assetsDeleted} Cloudinary assets removed.`);
    } else {
        console.error(`❌ ${type} not found with ID: ${targetId}`);
    }

    await mongoose.disconnect();
    process.exit(0);
}

run().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
