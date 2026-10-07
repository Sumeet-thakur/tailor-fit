import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import multer from 'multer';
import { cloudinary } from '../config/cloudinary.js';

const execFileAsync = promisify(execFile);

export interface CompressResult {
    cloudinaryUrl: string;
    originalBytes: number;
    compressedBytes: number;
    savingsPercent: number;
    pipeline?: string[];     // Steps actually executed, e.g. ['prune', 'resize', 'webp', 'gltfpack']
    warnings?: string[];     // Non-fatal warnings (e.g. gltf-transform unavailable)
}

// ─── Disk storage: ONLY for .glb files that need compression ──────────────────
export const glbDiskStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, os.tmpdir());
    },
    filename: (_req, file, cb) => {
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-');
        cb(null, `glb-${Date.now()}-${safe}`);
    },
});

export const glbUpload = multer({
    storage: glbDiskStorage,
    limits: { fileSize: 200 * 1024 * 1024 }, // 200MB raw — pipeline will shrink it
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, ext === '.glb' || ext === '.gltf');
    },
});

// ─── Resolve CLI bin path from local node_modules ─────────────────────────────
function resolveBin(name: string): string {
    return path.resolve(process.cwd(), 'node_modules/.bin', name);
}

// ─── Check if a binary exists and is executable ───────────────────────────────
function binExists(binPath: string): boolean {
    try {
        fs.accessSync(binPath, fs.constants.X_OK);
        return true;
    } catch {
        return false;
    }
}

// ─── Step 1: gltf-transform prune — remove unused nodes/textures ──────────────
// Cleans up dead weight before any other processing.
async function runGltfTransformPrune(inputPath: string, outputPath: string): Promise<boolean> {
    const bin = resolveBin('gltf-transform');

    if (!binExists(bin)) {
        console.warn('[GLB → prune] gltf-transform not found — skipping prune step.');
        return false;
    }

    console.log('[GLB → prune] Removing unused nodes/textures...');

    try {
        const { stderr } = await execFileAsync(
            bin,
            ['prune', inputPath, outputPath],
            { timeout: 60_000 }
        );

        if (stderr && stderr.toLowerCase().includes('error')) {
            console.warn(`[GLB → prune] Non-fatal warning: ${stderr}`);
            fs.copyFileSync(inputPath, outputPath);
        }

        return true;
    } catch (err: any) {
        console.warn(`[GLB → prune] Failed: ${err.message}`);
        fs.copyFileSync(inputPath, outputPath);
        return false;
    }
}

// ─── Step 2: gltf-transform resize — downscale embedded textures to 1024px ───
// Kills the biggest weight driver: unoptimized embedded JPEG/PNG textures.
// 1024px is the sweet spot — indistinguishable on a 3D shirt at normal FOV.
async function runGltfTransformResize(inputPath: string, outputPath: string): Promise<boolean> {
    const bin = resolveBin('gltf-transform');

    if (!binExists(bin)) {
        console.warn('[GLB → resize] gltf-transform not found — skipping resize step.');
        return false;
    }

    console.log('[GLB → resize] Downscaling embedded textures to 1024px...');

    try {
        const { stderr } = await execFileAsync(
            bin,
            ['resize', '--width', '1024', '--height', '1024', inputPath, outputPath],
            { timeout: 120_000 }
        );

        if (stderr && stderr.toLowerCase().includes('error')) {
            console.warn(`[GLB → resize] Non-fatal warning: ${stderr}`);
            fs.copyFileSync(inputPath, outputPath);
        }

        return true;
    } catch (err: any) {
        console.warn(`[GLB → resize] Failed: ${err.message}`);
        fs.copyFileSync(inputPath, outputPath);
        return false;
    }
}

// ─── Step 3: gltf-transform webp — convert embedded textures to WebP ──────────
// WebP vs JPEG: ~75% smaller at same perceived quality for tiled fabric maps.
// Supported by all modern browsers (Chrome 23+, Firefox 65+, Safari 14+).
async function runGltfTransformWebp(inputPath: string, outputPath: string): Promise<boolean> {
    const bin = resolveBin('gltf-transform');

    if (!binExists(bin)) {
        console.warn('[GLB → webp] gltf-transform not found — skipping webp step.');
        return false;
    }

    console.log('[GLB → webp] Converting embedded textures to WebP (quality 90)...');

    try {
        const { stderr } = await execFileAsync(
            bin,
            ['webp', '--quality', '90', inputPath, outputPath],
            { timeout: 120_000 }
        );

        if (stderr && stderr.toLowerCase().includes('error')) {
            console.warn(`[GLB → webp] Non-fatal warning: ${stderr}`);
            fs.copyFileSync(inputPath, outputPath);
        }

        return true;
    } catch (err: any) {
        console.warn(`[GLB → webp] Failed: ${err.message}`);
        fs.copyFileSync(inputPath, outputPath);
        return false;
    }
}

// ─── Step 4: gltfpack — mesh compression + hierarchy preservation ─────────────
// MUST run LAST. gltf-transform does not output Meshopt compression.
// If gltfpack ran first, gltf-transform would decompress the mesh data to edit
// textures, then save an uncompressed mesh — destroying the 93% savings.
// Running gltfpack last seals in both texture optimization AND geometry compression.
async function runGltfpack(inputPath: string, outputPath: string): Promise<void> {
    const bin = resolveBin('gltfpack');

    if (!binExists(bin)) {
        throw new Error(
            `gltfpack not found at ${bin}. Run: pnpm add gltfpack`
        );
    }

    console.log('[GLB → gltfpack] Compressing mesh + normals/UVs (runs LAST)...');

    const { stderr } = await execFileAsync(
        bin,
        [
            '-i', inputPath,
            '-o', outputPath,
            '-cc',      // Meshopt compression (geometry + attributes)
            '-kn',      // Keep node names/hierarchy
            '-km',      // Keep materials separate
            '-vt', '14',// UV precision 14-bit (default 8 destroys tiled fabric textures)
            '-vn', '10',// Normal precision 10-bit (prevents shading artifacts on curved shirt)
        ],
        { timeout: 90_000 }
    );

    if (stderr && stderr.toLowerCase().includes('error')) {
        throw new Error(`gltfpack failed: ${stderr}`);
    }
}

// ─── Main export ──────────────────────────────────────────────────────────────
// Pipeline order (proven locally: 9.96MB → 748KB):
//   1. gltf-transform prune   → remove dead nodes
//   2. gltf-transform resize  → downscale textures to 1024px
//   3. gltf-transform webp    → convert textures to WebP
//   4. gltfpack -cc -kn -km   → Meshopt geometry compression (LAST)
export async function compressAndUploadGLB(
    inputPath: string,
    cloudinaryFolder: string,
    publicId: string
): Promise<CompressResult> {
    const originalBytes = fs.statSync(inputPath).size;
    const pipeline: string[] = [];
    const warnings: string[] = [];

    // Each step writes to its own temp file — no corruption between steps
    const afterPrune = path.join(os.tmpdir(), `glb-prune-${Date.now()}.glb`);
    const afterResize = path.join(os.tmpdir(), `glb-resize-${Date.now()}.glb`);
    const afterWebp = path.join(os.tmpdir(), `glb-webp-${Date.now()}.glb`);
    const finalGlb = path.join(os.tmpdir(), `glb-final-${Date.now()}.glb`);

    const tempFiles = [afterPrune, afterResize, afterWebp, finalGlb];

    try {
        // ── ALL COMPRESSION STEPS BYPASSED ───────────────────────────────
        // The user requested to bypass GLB compression because it messes up the 
        // quality and grid scales on bespoke models.
        /*
        // Step 1: gltf-transform prune
        const pruneOk = await runGltfTransformPrune(inputPath, afterPrune);
        // Step 2: gltf-transform resize
        const resizeOk = await runGltfTransformResize(afterPrune, afterResize);
        // Step 3: gltf-transform webp
        const webpOk = await runGltfTransformWebp(afterResize, afterWebp);
        // Step 4: gltfpack
        await runGltfpack(afterWebp, finalGlb);
        */
       
        fs.copyFileSync(inputPath, finalGlb);
        pipeline.push('all-compression-bypassed');

        // ── Result stats ─────────────────────────────────────────────────────
        const compressedBytes = fs.statSync(finalGlb).size;
        const savingsPercent = Math.round((1 - compressedBytes / originalBytes) * 100);

        console.log(
            `[GLB Compress] DONE: ${fmtBytes(originalBytes)} → ${fmtBytes(compressedBytes)} ` +
            `(${savingsPercent}% saved) | Pipeline: ${pipeline.join(' → ')}`
        );

        if (warnings.length) {
            warnings.forEach(w => console.warn(`[GLB Compress] ⚠️  ${w}`));
        }

        // ── Step 5: Upload final output to Cloudinary ────────────────────────
        const result = await cloudinary.uploader.upload(finalGlb, {
            folder: cloudinaryFolder,
            public_id: publicId,
            resource_type: 'raw',
            overwrite: true,
            invalidate: true,
            format: 'glb',
        });

        return {
            cloudinaryUrl: result.secure_url,
            originalBytes,
            compressedBytes,
            savingsPercent,
            pipeline,
            warnings: warnings.length ? warnings : undefined,
        };

    } finally {
        // ── Always cleanup ALL temp files — never leak disk on Render ─────────
        const allTemps = [inputPath, ...tempFiles];
        for (const f of allTemps) {
            try {
                if (fs.existsSync(f)) fs.unlinkSync(f);
            } catch {
                // Best-effort cleanup — don't throw in finally
            }
        }
    }
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function fmtBytes(b: number): string {
    if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(2)} MB`;
    if (b >= 1_024) return `${(b / 1_024).toFixed(1)} KB`;
    return `${b} B`;
}

function logSize(step: string, originalBytes: number, currentBytes: number): void {
    const pct = Math.round((1 - currentBytes / originalBytes) * 100);
    console.log(`[GLB → ${step}] ${fmtBytes(currentBytes)} (${pct}% from original)`);
}
