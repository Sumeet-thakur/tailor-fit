/**
 * Admin CLI: Safe 3D Fabric Deletion
 * ────────────────────────────────────
 * Deletes a 3D fabric with full Cloudinary texture cleanup.
 *
 * Usage:
 *   pnpm run admin:delete-fabric -- --id=65f1a2b3c4d5e6f7
 *   pnpm run admin:delete-fabric -- --name="Caban Wool"
 *
 * Works locally and on VPS (uses .env MONGODB_URI).
 */
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { deleteFabricWithAssets } from '../utils/deleteHandlers.js';
import Fabric from '../models/fabric.js';

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
        console.error('❌ Usage: --id=<objectId> OR --name=<fabricName>');
        process.exit(1);
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) { console.error('❌ MONGODB_URI not set in .env'); process.exit(1); }

    await mongoose.connect(uri);
    console.log(`✅ Connected to MongoDB`);

    let targetId = id;

    if (name && !targetId) {
        const doc = await Fabric.findOne({ name: new RegExp(`^${name}$`, 'i') }).select('_id name').lean();
        if (!doc) { console.error(`❌ Fabric with name "${name}" not found`); process.exit(1); }
        targetId = doc._id.toString();
        console.log(`🧵 Resolved name "${name}" → ID: ${targetId}`);
    }

    console.log(`🗑️  Deleting fabric ${targetId} (DB + Cloudinary textures)...`);
    const result = await deleteFabricWithAssets(targetId!);

    if (result.deleted) {
        console.log(`✅ Fabric deleted. ${result.assetsDeleted} Cloudinary assets removed.`);
    } else {
        console.error(`❌ Fabric not found with ID: ${targetId}`);
    }

    await mongoose.disconnect();
    process.exit(0);
}

run().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
