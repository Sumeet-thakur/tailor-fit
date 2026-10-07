import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import Customer from '../models/customer.js';
import Order from '../models/order.js';
import Admin from '../models/admin.js';
import Fabric from '../models/fabric.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const { MONGODB_URI, CLOUDINARY_ENV, CLOUDINARY_CLIENT } = process.env;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is required in .env');
    process.exit(1);
}

if (!CLOUDINARY_ENV || !CLOUDINARY_CLIENT) {
    console.error('❌ CLOUDINARY_ENV and CLOUDINARY_CLIENT are required in .env');
    process.exit(1);
}

const CLOUDINARY_BASE_PATH = `${CLOUDINARY_ENV}/${CLOUDINARY_CLIENT}`;

/**
 * Helper to check if a URL needs migration
 * It needs migration if it's a Cloudinary URL but doesn't start with the current ENV/CLIENT prefix
 */
function needsMigration(url: string | undefined): boolean {
    if (!url) return false;

    // Only migrate Cloudinary URLs
    if (!url.includes('res.cloudinary.com')) return false;

    // Extract the path after /upload/v<version>/ or just /upload/
    const uploadMatch = url.match(/\/upload\/(?:v\d+\/)?(.+)/);
    if (!uploadMatch) return false;

    const cloudinaryPath = uploadMatch[1];

    // If it already starts with the correct base path, skip
    if (cloudinaryPath.startsWith(`${CLOUDINARY_BASE_PATH}/`)) return false;

    return true;
}

/**
 * Helper to rewrite a Cloudinary URL with the new base path
 */
function migrateUrl(url: string): string {
    if (!needsMigration(url)) return url;

    const uploadMatch = url.match(/(.*\/upload\/(?:v\d+\/)?)(.+)/);
    if (!uploadMatch) return url;

    const prefix = uploadMatch[1];
    let oldPath = uploadMatch[2];

    // If the old path already has an environment prefix (e.g., 'dev/products/...'), we need to strip it
    // We assume environments are 'dev', 'staging', 'prod'
    const pathParts = oldPath.split('/');
    if (['dev', 'staging', 'prod'].includes(pathParts[0])) {
        // Remove old env
        pathParts.shift();

        // Remove old client if it exists (assuming it's the second part if the first was env)
        // Wait, the old structure might not have had a client prefix. We just strip the env if it matches.
        // Let's be safer: if the old path was `dev/cherry/products/...`, shift twice.
        // If it was just `dev/products/...`, shift once.
        if (pathParts[0] !== 'products' && pathParts[0] !== 'customers' && pathParts[0] !== 'admins' && pathParts[0] !== 'orders' && pathParts[0] !== 'shared-fabrics') {
            // It's probably an old client name, strip it too
            pathParts.shift();
        }
        oldPath = pathParts.join('/');
    }

    const newPath = `${CLOUDINARY_BASE_PATH}/${oldPath}`;
    const newUrl = `${prefix}${newPath}`;

    return newUrl;
}

async function migrateCustomers() {
    console.log('\n🧑‍🤝‍🧑 Migrating Customers...');
    const customers = await Customer.find({});
    let updatedCount = 0;

    for (const doc of customers) {
        const customer = doc as any;
        let isUpdated = false;

        // 1. Profile Image
        if (needsMigration(customer.profileImage)) {
            customer.profileImage = migrateUrl(customer.profileImage);
            isUpdated = true;
        }

        // 2. Saved Designs
        if (customer.savedDesigns && customer.savedDesigns.length > 0) {
            customer.savedDesigns.forEach((design: any) => {
                if (needsMigration(design.baseImage)) {
                    design.baseImage = migrateUrl(design.baseImage);
                    isUpdated = true;
                }
                if (needsMigration(design.screenshot)) {
                    design.screenshot = migrateUrl(design.screenshot);
                    isUpdated = true;
                }
                if (design.fabric) {
                    if (needsMigration(design.fabric.image)) {
                        design.fabric.image = migrateUrl(design.fabric.image);
                        isUpdated = true;
                    }
                    if (needsMigration(design.fabric.previewImage)) {
                        design.fabric.previewImage = migrateUrl(design.fabric.previewImage);
                        isUpdated = true;
                    }
                    if (needsMigration(design.fabric.backPreviewImage)) {
                        design.fabric.backPreviewImage = migrateUrl(design.fabric.backPreviewImage);
                        isUpdated = true;
                    }
                }
            });
            // Mark mixed types as modified
            if (isUpdated) {
                customer.markModified('savedDesigns');
            }
        }

        if (isUpdated) {
            await customer.save();
            updatedCount++;
        }
    }
    console.log(`✅ Updated ${updatedCount} Customers`);
}


async function migrateOrders() {
    console.log('\n📦 Migrating Orders...');
    const orders = await Order.find({});
    let updatedCount = 0;

    for (const doc of orders) {
        const order = doc as any;
        let isUpdated = false;

        if (order.items && order.items.length > 0) {
            order.items.forEach((item: any) => {
                if (needsMigration(item.baseImage)) {
                    item.baseImage = migrateUrl(item.baseImage);
                    isUpdated = true;
                }
                if (needsMigration(item.screenshot)) {
                    item.screenshot = migrateUrl(item.screenshot);
                    isUpdated = true;
                }
            });
            if (isUpdated) {
                order.markModified('items');
            }
        }

        if (isUpdated) {
            await order.save();
            updatedCount++;
        }
    }
    console.log(`✅ Updated ${updatedCount} Orders`);
}

async function migrateAdmins() {
    console.log('\n🛡️  Migrating Admins...');
    const admins = await Admin.find({});
    let updatedCount = 0;

    for (const doc of admins) {
        const admin = doc as any;
        if (needsMigration(admin.profileImage)) {
            admin.profileImage = migrateUrl(admin.profileImage);
            await admin.save();
            updatedCount++;
        }
    }
    console.log(`✅ Updated ${updatedCount} Admins`);
}


async function migrateStandaloneFabrics() {
    console.log('\n🧵 Migrating Standalone Fabrics...');
    const fabrics = await Fabric.find({});
    let updatedCount = 0;

    for (const doc of fabrics) {
        const fabric = doc as any;
        let isUpdated = false;

        if (needsMigration(fabric.thumbnailUrl)) {
            fabric.thumbnailUrl = migrateUrl(fabric.thumbnailUrl);
            isUpdated = true;
        }
        if (needsMigration(fabric.colorMapUrl)) {
            fabric.colorMapUrl = migrateUrl(fabric.colorMapUrl);
            isUpdated = true;
        }
        if (needsMigration(fabric.normalMapUrl)) {
            fabric.normalMapUrl = migrateUrl(fabric.normalMapUrl);
            isUpdated = true;
        }
        if (needsMigration(fabric.roughnessMapUrl)) {
            fabric.roughnessMapUrl = migrateUrl(fabric.roughnessMapUrl);
            isUpdated = true;
        }

        if (isUpdated) {
            await fabric.save();
            updatedCount++;
        }
    }
    console.log(`✅ Updated ${updatedCount} Standalone Fabrics`);
}



async function runMigration() {
    try {
        console.log(`\n🚀 Starting Legacy URL Migration to [${CLOUDINARY_BASE_PATH}]...`);
        console.log(`🔗 Target DB: ${MONGODB_URI}`);

        await mongoose.connect(MONGODB_URI as string);
        console.log('✅ Connected to MongoDB\n');

        await migrateCustomers();
        await migrateOrders();
        await migrateAdmins();
        await migrateStandaloneFabrics();

        console.log('\n🎉 All migration tasks completed successfully!');
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

runMigration();
