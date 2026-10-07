/**
 * hdrCompressor.ts
 *
 * Server-side HDR / EXR optimization pipeline.
 *
 * Why ffmpeg instead of sharp?
 *   - sharp does NOT support Radiance HDR (.hdr / RGBE) — it will throw on upload.
 *   - ffmpeg natively reads and writes Radiance HDR with full float32 precision.
 *   - ffmpeg uses Lanczos area-average downscale — the same algorithm used locally
 *     to produce the proven 6.1 MB → 1.5 MB result (75% savings at 1K).
 *   - ffmpeg is already present on Render/Ubuntu VPS. Zero new npm dependencies.
 *
 * Pipeline:
 *   .hdr upload → ffmpeg scale=1024:512 → Cloudinary raw → { url, stats }
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import multer from 'multer';
import { cloudinary } from '../config/cloudinary.js';

const execAsync = promisify(exec);

export interface HdrCompressResult {
    cloudinaryUrl: string;
    originalBytes: number;
    compressedBytes: number;
    savingsPercent: number;
    outputResolution: string;   // e.g. "1024x512"
}

// ─── Disk storage for HDR uploads ─────────────────────────────────────────────
export const hdrDiskStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, os.tmpdir());
    },
    filename: (_req, file, cb) => {
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-');
        cb(null, `hdr-${Date.now()}-${safe}`);
    },
});

export const hdrUpload = multer({
    storage: hdrDiskStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB — 2K HDRs are typically ~6-8MB
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowed = ['.hdr', '.exr'];
        if (!allowed.includes(ext)) {
            cb(new Error(`Unsupported HDR format: ${ext}. Accepted: .hdr, .exr`));
            return;
        }
        cb(null, true);
    },
});

// ffmpeg processing is disabled. We bypass compression to preserve 1:1 original files.

// ─── Main export ──────────────────────────────────────────────────────────────
export async function compressAndUploadHDR(
    inputPath: string,
    cloudinaryFolder: string,
    publicId: string,
    targetWidth = 1024   // Pass 512 for ultra-light environments, 1024 for standard
): Promise<HdrCompressResult> {
    const originalBytes = fs.statSync(inputPath).size;
    const ext = path.extname(inputPath).toLowerCase(); // .hdr or .exr
    const outputPath = path.join(os.tmpdir(), `hdr-opt-${Date.now()}${ext}`);

    try {
        // ── Bypass Compression ───────────────────────────────────────────
        // User requested to download pre-compressed 1K files and bypass server processing
        console.log(`[HDR Compress] Bypassing compression for ${ext}. Uploading as-is.`);
        fs.copyFileSync(inputPath, outputPath);

        console.log(
            `[HDR Compress] DONE: Uploaded ${fmtBytes(originalBytes)} ${ext} file.`
        );

        // ── Upload optimized HDR to Cloudinary as raw ─────────────────────────
        const result = await cloudinary.uploader.upload(outputPath, {
            folder: cloudinaryFolder,
            public_id: publicId,
            resource_type: 'raw',
            overwrite: true,
            invalidate: true,
        });

        return {
            cloudinaryUrl: result.secure_url,
            originalBytes,
            compressedBytes: originalBytes,
            savingsPercent: 0,
            outputResolution: 'bypassed',
        };

    } finally {
        // ── Always cleanup temp files — no disk leaks on Render ───────────────
        for (const f of [inputPath, outputPath]) {
            try {
                if (fs.existsSync(f)) fs.unlinkSync(f);
            } catch {
                // Best-effort — don't throw in finally
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
