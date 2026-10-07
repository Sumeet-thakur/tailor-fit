/**
 * Admin CLI: Safe Product Deletion
 * ─────────────────────────────────
 * Deletes a product with full Cloudinary asset cleanup.
 *
 * Usage:
 *   pnpm run admin:delete-product -- --id=65f1a2b3c4d5e6f7
 *   pnpm run admin:delete-product -- --name=shirt
 *
 * Works locally and on VPS (uses .env MONGODB_URI).
 */
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { deleteProductWithAssets } from '../utils/deleteHandlers.js';
import Product from '../models/product.js';

dotenv.config();

const args = process.argv.slice(2);
const flags = Object.fromEntries(
    args.filter(a => a.startsWith('--')).map(a => {
        const [k, v] = a.replace('--', '').split('=');
        return [k, v || 'true'];
    })
);

async function run() {
    const { id, name } = flags;

    if (!id && !name) {
        console.error('❌ Usage: --id=<objectId> OR --name=<productName>');
        process.exit(1);
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) { console.error('❌ MONGODB_URI not set in .env'); process.exit(1); }

    await mongoose.connect(uri);
    console.log(`✅ Connected to MongoDB`);

    let targetId = id;

    // Resolve name → id
    if (name && !targetId) {
        const doc = await Product.findOne({ name: new RegExp(`^${name}$`, 'i') }).select('_id name').lean();
        if (!doc) { console.error(`❌ Product with name "${name}" not found`); process.exit(1); }
        targetId = doc._id.toString();
        console.log(`📋 Resolved name "${name}" → ID: ${targetId}`);
    }

    console.log(`🗑️  Deleting product ${targetId} (DB + Cloudinary)...`);
    const result = await deleteProductWithAssets(targetId!);

    if (result.deleted) {
        console.log(`✅ Product deleted. ${result.assetsDeleted} Cloudinary assets removed.`);
    } else {
        console.error(`❌ Product not found with ID: ${targetId}`);
    }

    await mongoose.disconnect();
    process.exit(0);
}

run().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
