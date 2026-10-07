import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import type { Request } from 'express';
import { CLOUDINARY_BASE } from '../constants/cloudinaryFolders.js';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req: Request, file: Express.Multer.File) => {
    let folderName = `${CLOUDINARY_BASE}/uploads`;

    const rawFolder = req.body?.folder || req.query?.folder;
    if (typeof rawFolder === 'string' && rawFolder.length > 0) {
      const safe = rawFolder.replace(/[^a-zA-Z0-9-_/]/g, '-');
      folderName = safe.startsWith(CLOUDINARY_BASE) ? safe : `${CLOUDINARY_BASE}/${safe}`;
    }

    const cleanName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9-_]/g, '');
    const ext = path.extname(file.originalname).toLowerCase().substring(1);

    const isRaw = ['glb', 'gltf', 'hdr', 'exr', 'hdri'].includes(ext);

    if (isRaw) {
      return {
        folder: folderName,
        resource_type: 'raw',
        public_id: cleanName,
        overwrite: true,
        invalidate: true,
        format: ext === 'hdri' ? 'hdr' : ext,
      };
    }

    const isSvg = ext === 'svg' || file.mimetype.includes('svg');
    const isVideo = ['mp4', 'webm', 'mov'].includes(ext) || file.mimetype.includes('video');

    if (isVideo) {
      return {
        folder: folderName,
        public_id: req.body?.custom_public_id ? (req.body.custom_public_id as string).replace(/[^a-zA-Z0-9-_/.]/g, '') : cleanName + `-${Date.now().toString().slice(-6)}`,
        resource_type: 'video',
        overwrite: !!req.body?.custom_public_id,
        invalidate: true,
      };
    }

    // Bypassing multer-storage-cloudinary's buggy format validation for SVGs
    // By omitting 'allowed_formats' specifically for SVGs, the package skips the local MIME validation 
    // that was throwing "An unknown file format not allowed" and streams it safely to Cloudinary as an image.
    if (isSvg) {
      return {
        folder: folderName,
        public_id: req.body?.custom_public_id ? (req.body.custom_public_id as string).replace(/[^a-zA-Z0-9-_/]/g, '') : cleanName + `-${Date.now().toString().slice(-6)}`,
        resource_type: 'image',
        format: 'svg', // Force Cloudinary to save and serve it as .svg natively
        overwrite: !!req.body?.custom_public_id,
        invalidate: true,
      };
    }

    if (req.body?.custom_public_id) {
      const customId = (req.body.custom_public_id as string).replace(/[^a-zA-Z0-9-_/.]/g, '');
      const is3DFabric = folderName.includes('3d') && folderName.includes('fabric');
      return {
        folder: folderName,
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        resource_type: 'image' as const,
        public_id: customId,
        overwrite: true,
        invalidate: true,
        quality: 'auto',  // Strips EXIF + optimizes encoding at storage (~20-40% savings)
        // Note: format: 'webp' here is a fallback for non-texture uploads via generic /api/upload.
        // 3D textures should use POST /api/upload/texture which enforces WebP via uploader.upload().
        // upload_stream (used by multer-storage-cloudinary) silently ignores the format param.
        ...(is3DFabric && { format: 'webp' }),
      };
    }

    const uniqueSuffix = `-${Date.now().toString().slice(-6)}`;
    const uniqueName = cleanName + uniqueSuffix;

    return {
      folder: folderName,
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      resource_type: 'image',
      public_id: uniqueName,
      overwrite: false,
      invalidate: true,
      quality: 'auto',  // Strips EXIF + optimizes encoding at storage (~20-40% savings)
      // Enforce consistent WebP format for 3D textures during original upload
      ...((folderName.includes('3d') && folderName.includes('fabric')) && { format: 'webp' }),
    };
  },
});

export { cloudinary, storage };
