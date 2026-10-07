import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Fabric from '../models/fabric.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tailor-fit';

// All 12 fabrics with proper PBR texture maps
export const fabrics = [
    // ============ FROM POLY HAVEN ============
    {
        name: 'Caban Wool',
        category: 'wool',
        colorMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/caban_2k/textures/caban_diff_2k.jpg',
        normalMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/caban_2k/textures/caban_nor_gl_2k.jpg',
        roughnessMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/caban_2k/textures/caban_arm_2k.jpg',
        thumbnailUrl: '/3d-shirt-style-customization/fabric swatches thumbnails/caban-wool-thumb.jpg',
        baseColor: '#2C3E50',
        roughness: 0.8,
        metalness: 0.0,
        normalScale: 1.3,
        price: 9000
    },
    {
        name: 'Soft Cotton Jersey',
        category: 'cotton',
        colorMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/cotton_jersey_2k/textures/cotton_jersey_diff_2k.jpg',
        normalMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/cotton_jersey_2k/textures/cotton_jersey_nor_gl_2k.jpg',
        roughnessMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/cotton_jersey_2k/textures/cotton_jersey_arm_2k.jpg',
        thumbnailUrl: '/3d-shirt-style-customization/fabric swatches thumbnails/soft-cotton-jersey-thumb.jpg',
        baseColor: '#E8E8E8',
        roughness: 0.85,
        metalness: 0.0,
        normalScale: 0.9,
        price: 4000
    },
    {
        name: 'Crepe Satin',
        category: 'silk',
        colorMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/crepe_satin_2k/textures/crepe_satin_diff_2k.jpg',
        normalMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/crepe_satin_2k/textures/crepe_satin_nor_gl_2k.jpg',
        roughnessMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/crepe_satin_2k/textures/crepe_satin_arm_2k.jpg',
        thumbnailUrl: '/3d-shirt-style-customization/fabric swatches thumbnails/crepe-satin-thumb.jpg',
        baseColor: '#F5E6D3',
        roughness: 0.3,
        metalness: 0.2,
        normalScale: 0.7,
        price: 11000
    },
    {
        name: 'Classic Blue Denim',
        category: 'denim',
        colorMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/denim_fabric_06_2k/textures/denim_fabric_06_diff_2k.jpg',
        normalMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/denim_fabric_06_2k/textures/denim_fabric_06_nor_gl_2k.jpg',
        roughnessMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/denim_fabric_06_2k/textures/denim_fabric_06_arm_2k.jpg',
        thumbnailUrl: '/3d-shirt-style-customization/fabric swatches thumbnails/classic-blue-denim-thumb.jpg',
        baseColor: '#3B5998',
        roughness: 0.7,
        metalness: 0.0,
        normalScale: 1.4,
        price: 3500
    },
    {
        name: 'Houndstooth Check',
        category: 'wool',
        colorMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/fabric_pattern/fabric_pattern_05_col_01_2k.jpg',
        normalMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/fabric_pattern/fabric_pattern_05_nor_gl_2k.jpg',
        roughnessMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/fabric_pattern/fabric_pattern_05_arm_2k.jpg',
        thumbnailUrl: '/3d-shirt-style-customization/fabric swatches thumbnails/houndstooth-check-thumb.jpg',
        baseColor: '#1A1A1A',
        roughness: 0.75,
        metalness: 0.0,
        normalScale: 1.1,
        price: 9500
    },
    {
        name: 'Floral Jacquard',
        category: 'silk',
        colorMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/floral_jacquard_2k/textures/floral_jacquard_diff_2k.jpg',
        normalMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/floral_jacquard_2k/textures/floral_jacquard_nor_gl_2k.jpg',
        roughnessMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/floral_jacquard_2k/textures/floral_jacquard_arm_2k.jpg',
        thumbnailUrl: '/3d-shirt-style-customization/fabric swatches thumbnails/floral-jacquard-thumb.jpg',
        baseColor: '#8B4513',
        roughness: 0.4,
        metalness: 0.1,
        normalScale: 1.0,
        price: 15000
    },
    {
        // Gingham isn't visibly in polyhaven so keeping old names but changing directory config, actually skipping to ensure clean links
        name: 'Gingham Check',
        category: 'cotton',
        colorMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/gingham_check/gingham_check_diff_2k.jpg',
        normalMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/gingham_check/gingham_check_nor_gl_2k.jpg',
        roughnessMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/gingham_check/gingham_check_arm_2k.jpg',
        thumbnailUrl: '/3d-shirt-style-customization/fabric swatches thumbnails/gingham-check-thumb.jpg',
        baseColor: '#E74C3C',
        roughness: 0.88,
        metalness: 0.0,
        normalScale: 0.8,
        price: 4200
    },
    {
        name: 'Rough Linen',
        category: 'linen',
        colorMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/rough_linen_2k/textures/rough_linen_diff_2k.jpg',
        normalMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/rough_linen_2k/textures/rough_linen_nor_gl_2k.jpg',
        roughnessMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/rough_linen_2k/textures/rough_linen_arm_2k.jpg',
        thumbnailUrl: '/3d-shirt-style-customization/fabric swatches thumbnails/rough-linen-thumb.jpg',
        baseColor: '#C4A484',
        roughness: 0.95,
        metalness: 0.0,
        normalScale: 1.6,
        price: 5800
    },
    {
        name: 'Waffle Pique',
        category: 'cotton',
        colorMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/waffle_pique_cotton_2k/waffle_pique_cotton_diff_2k.jpg',
        normalMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/waffle_pique_cotton_2k/waffle_pique_cotton_nor_gl_2k.jpg',
        roughnessMapUrl: '/3d-shirt-style-customization/Textures - polyhaven.com:textures:fabric/waffle_pique_cotton_2k/waffle_pique_cotton_arm_2k.jpg',
        thumbnailUrl: '/3d-shirt-style-customization/fabric swatches thumbnails/waffle-pique-thumb.jpg',
        baseColor: '#FDFDFD',
        roughness: 0.9,
        metalness: 0.0,
        normalScale: 1.2,
        price: 5000
    }
];

export async function seedFabrics() {
    try {
        // Clear existing fabrics
        console.log('🗑️  Clearing existing fabrics...');
        await Fabric.deleteMany({});

        // The Admin UI will naturally use these cleanly duplicated jpg thumbnails
        const fabricsWithThumbnails = fabrics.map(f => ({
            ...f,
            thumbnailUrl: `/3d-shirt-style-customization/fabric swatches thumbnails/${f.name.toLowerCase().replace(/\s+/g, '-')}-thumb.jpg`
        }));
        const result = await Fabric.insertMany(fabricsWithThumbnails);

        // Summary
        console.log('\n✅ Successfully seeded fabrics!');
        console.log('━'.repeat(40));

        const categories: Record<string, number> = {};
        result.forEach((fabric: any) => {
            categories[fabric.category] = (categories[fabric.category] || 0) + 1;
        });

        console.log('📊 Fabrics by category:');
        Object.entries(categories).forEach(([cat, count]) => {
            console.log(`   ${cat}: ${count}`);
        });

        console.log('━'.repeat(40));
        console.log(`📁 Total: ${result.length} fabrics`);
        console.log('\n🎨 Each fabric includes:');
        console.log('   • Color/Diffuse map');
        console.log('   • Normal map');
        console.log('   • Roughness/ARM map');

        return result;

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        return [];
    }
}
