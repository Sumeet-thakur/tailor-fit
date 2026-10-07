import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import customerRoutes from './routes/customers.js';
import adminRoutes from './routes/admin/index.js';
import fabricRoutes from './routes/fabrics.js';
import paymentRoutes from './routes/payments.js';
import settingsRoutes from './routes/settings.js';
import errorHandler from './middleware/errorHandler.js';
import { cloudinary, storage } from './config/cloudinary.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Trust proxy
app.set('trust proxy', 1);

export const allowedOrigins = [
    "http://localhost",
    "https://localhost",
    "capacitor://localhost",
    "app://localhost",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:8080",
    "http://localhost:5174",
    "http://localhost:5175",
    "https://tailor-fit-darosoft.vercel.app",
    "https://tailor-fit-darosoft-api.onrender.com",
    "https://tailor-fit-darosoft.duckdns.org",
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN
].filter(Boolean) as string[];

// Configure CORS
app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json({
    verify: (req, _res, buf) => {
        (req as any).rawBody = buf.toString();
    }
}));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    if (req.path === '/api/customers/designs' && req.method === 'POST') {
        console.log('[DEBUG] Receiving Saved Design Request');
        console.log('[DEBUG] Screenshot present:', !!req.body.screenshot);
        console.log('[DEBUG] Screenshot length:', req.body.screenshot?.length || 0);
    }
    next();
});

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Serve static files from the React app (dist folder)
// In production, we are running from server/dist/server.js, so dist is at ../../dist
// In development, we are running from server/server.ts, so dist is at ../dist
let distPath = path.join(__dirname, '../dist');
if (!fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, 'index.html'))) {
    distPath = path.join(__dirname, '../../dist');
}

// Only log in non-test environment to reduce noise
if (process.env.NODE_ENV !== 'test') {
    console.log('Serving static files from:', distPath);
    console.log('Static Dir Exists:', fs.existsSync(distPath));
    console.log('Index.html Exists:', fs.existsSync(path.join(distPath, 'index.html')));
}

app.use(express.static(distPath, {
    index: false,
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 },
});

const DB_PATH = path.join(__dirname, 'data', 'db.json');
if (!fs.existsSync(DB_PATH)) {
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify({ fabrics: [], collars: [], cuffs: [], pockets: [], buttons: [], sleeves: [], plackets: [], backs: [] }, null, 2));
}

// Log requests
app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'test') {
        console.log(`${req.method} ${req.path}`);
    }
    next();
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/fabrics', fabricRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/data', (req, res) => {
    fs.readFile(DB_PATH, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read data' });
        }
        try {
            res.json(JSON.parse(data));
        } catch (e) {
            res.status(500).json({ error: 'Invalid DB format' });
        }
    });
});

app.post('/api/data', (req, res) => {
    const newData = req.body;
    fs.writeFile(DB_PATH, JSON.stringify(newData, null, 2), (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to save data' });
        }
        res.json({ success: true });
    });
});

app.post('/api/upload', (req, res) => {
    upload.single('image')(req, res, function (err) { // This still handles images via CloudinaryStorage
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: err.message });
        } else if (err) {
            console.error('Upload Error:', err);
            return res.status(500).json({ error: err.message || 'Unknown upload error' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        if (process.env.NODE_ENV !== 'test') {
            console.log('CLOUDINARY UPLOAD SUCCESS:', {
                filename: req.file.filename || req.file.originalname,
                size_bytes: req.file.size,
                format: req.file.mimetype,
                path: req.file.path,
            });
        }
        res.json({ path: req.file.path, size: req.file.size });
    });
});

import { glbUpload, compressAndUploadGLB } from './utils/glbCompressor.js';
import { hdrUpload, compressAndUploadHDR } from './utils/hdrCompressor.js';
import { CLOUDINARY_BASE } from './constants/cloudinaryFolders.js';
import { extractPublicIdFromUrl } from './utils/cloudinaryDelete.js';
import { protectAdmin } from './middleware/adminAuth.js';

// ─── Unprotected Route for Temporary Cart Image Deletion ──────────────────
// Used by both Guests and Authenticated Customers when removing items from the cart.
app.post('/api/upload/delete-cart-item', async (req: Request, res: Response) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const publicId = extractPublicIdFromUrl(url);
        if (!publicId) {
            return res.status(400).json({ error: 'Invalid Cloudinary URL' });
        }

        // Strictly enforce that this unprotected route can ONLY delete cart assets.
        // E.g., `dev/client/cart/...` or `dev/client/customers/xyz/cart/...`
        const isCartAsset = publicId.includes('/cart/');
        const isProtectedAsset =
            publicId.includes('/saved-designs/') ||
            publicId.includes('/products/') ||
            publicId.includes('/orders/') ||
            publicId.includes('/admins/') ||
            publicId.includes('/profile/');

        if (!isCartAsset || isProtectedAsset) {
            console.warn(`[Security Block] Attempted to cross-delete protected or non-cart asset via public route: ${publicId}`);
            return res.status(403).json({ error: 'This route can only delete temporary cart items.' });
        }

        await cloudinary.uploader.destroy(publicId, { invalidate: true });
        res.json({ success: true, message: 'Cart asset deleted cleanly.' });
    } catch (err: any) {
        console.error('[Delete Cart Item Error]:', err);
        res.status(500).json({ error: 'Internal server error while deleting cart item' });
    }
});

// ─── NEW: Dedicated compressed GLB upload route ───────────────────────────────
app.post('/api/upload/model', protectAdmin, glbUpload.single('model'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No .glb file provided' });
    }

    // Frontend sends folder via getProductAssetsFolder() → products/3d/{id}-{slug}/assets/3d-model
    let folder = req.body?.folder;
    if (folder && !folder.startsWith(CLOUDINARY_BASE)) {
        folder = `${CLOUDINARY_BASE}/${folder}`;
    }
    folder = folder || `${CLOUDINARY_BASE}/products/3d/unassigned/assets/3d-model`;

    // Frontend sends custom_public_id field (not public_id)
    const publicId = req.body?.custom_public_id || req.body?.public_id || `model-${Date.now()}`;

    if (!req.body?.folder) {
        console.warn('[GLB Upload] No folder sent by client — using fallback path. Model may not be in the correct product folder.');
    }

    try {
        const result = await compressAndUploadGLB(req.file.path, folder, publicId);

        res.json({
            path: result.cloudinaryUrl,
            size: result.compressedBytes,
            compression: {
                originalMB: (result.originalBytes / 1024 / 1024).toFixed(2),
                compressedMB: (result.compressedBytes / 1024 / 1024).toFixed(2),
                savedPercent: result.savingsPercent,
            }
        });
    } catch (err) {
        console.error('[GLB Upload] Compression failed:', err);
        // Cleanup temp file if compressor didn't already
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Model compression failed. Please try again.' });
    }
});

// ─── Dedicated Route for HDR Environment Maps (Compression + Upload) ──────────
// Handles .hdr and .exr files. Downscales to 1K via ffmpeg, then uploads to Cloudinary raw.
app.post(
    '/api/upload/hdri',
    protectAdmin,
    hdrUpload.single('file'),
    async (req: Request, res: Response) => {
        if (!req.file) {
            res.status(400).json({ error: 'No HDR file provided.' });
            return;
        }

        try {
            // Guard: if the client sent a bare path (e.g. products/3d/.../assets/environment-map),
            // prepend CLOUDINARY_BASE so it lands under {env}/{client}/... — mirrors the GLB route guard
            let folder = (req.body.folder as string) || '';
            if (folder && !folder.startsWith(CLOUDINARY_BASE)) {
                folder = `${CLOUDINARY_BASE}/${folder}`;
            }
            folder = folder || `${CLOUDINARY_BASE}/assets/environment-map`;
            const publicId = (req.body.publicId as string) || `hdri-${Date.now()}`;

            const result = await compressAndUploadHDR(
                req.file.path,
                folder,
                publicId,
                1024    // Target width for 3D Customizer environments (1024x512)
            );

            // Using inline formatter for the response message
            const fmtBytes = (b: number) => {
                if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(2)} MB`;
                if (b >= 1_024) return `${(b / 1_024).toFixed(1)} KB`;
                return `${b} B`;
            };

            res.json({
                url: result.cloudinaryUrl,
                originalBytes: result.originalBytes,
                compressedBytes: result.compressedBytes,
                savingsPercent: result.savingsPercent,
                outputResolution: result.outputResolution,
                message:
                    // `HDR optimized: ${fmtBytes(result.originalBytes)} → ` +
                    // `${fmtBytes(result.compressedBytes)} ` +
                    `(${result.savingsPercent}% saved, ${result.outputResolution})`,
            });

        } catch (err: any) {
            console.error('[/api/upload/hdri] Error:', err.message);
            res.status(500).json({ error: err.message ?? 'HDR compression failed.' });
        }
    }
);

// ─── Dedicated Route for 3D Texture Maps (WebP Conversion + Upload) ───────────
// upload_stream ignores the `format` param — Cloudinary stores original format.
// This route uses multer memoryStorage → base64 data URI → cloudinary.uploader.upload()
// which DOES respect `format: 'webp'`, ensuring textures are stored as WebP.
// Optional `max_dimension` param resizes before storing (e.g., 512 for thumbnails).
const textureUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

app.post('/api/upload/texture', protectAdmin, textureUpload.single('image'), async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ error: 'No image file provided.' });
        return;
    }

    try {
        // Build folder path (same logic as CloudinaryStorage config)
        let folder = req.body?.folder as string | undefined;
        if (folder) {
            const safe = folder.replace(/[^a-zA-Z0-9-_/]/g, '-');
            folder = safe.startsWith(CLOUDINARY_BASE) ? safe : `${CLOUDINARY_BASE}/${safe}`;
        } else {
            folder = `${CLOUDINARY_BASE}/uploads`;
        }

        const customId = req.body?.custom_public_id
            ? (req.body.custom_public_id as string).replace(/[^a-zA-Z0-9-_/.]/g, '')
            : undefined;

        // Optional: resize before storing (e.g., 512 for thumbnails, 1024 for PBR textures)
        const maxDim = parseInt(req.body?.max_dimension as string, 10) || 0;

        // Convert buffer to base64 data URI for cloudinary.uploader.upload()
        const b64 = req.file.buffer.toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        // Build upload options — uploader.upload() DOES respect format + transformation
        const uploadOpts: Record<string, any> = {
            folder,
            public_id: customId,
            resource_type: 'image',
            format: 'webp',
            quality: 'auto:best',
            overwrite: true,
            invalidate: true,
        };

        // Apply incoming transformation to resize before storing (not just delivery)
        if (maxDim > 0) {
            uploadOpts.transformation = [{ width: maxDim, height: maxDim, crop: 'limit' }];
        }

        const result = await cloudinary.uploader.upload(dataURI, uploadOpts);

        if (process.env.NODE_ENV !== 'test') {
            const savedPercent = req.file.size > 0
                ? Math.round((1 - result.bytes / req.file.size) * 100)
                : 0;
            console.log('[Texture Upload] WebP conversion success:', {
                public_id: result.public_id,
                originalSize: `${(req.file.size / 1024).toFixed(0)} KB (${req.file.mimetype})`,
                webpSize: `${(result.bytes / 1024).toFixed(0)} KB`,
                saved: `${savedPercent}%`,
                dimensions: `${result.width}×${result.height}`,
                ...(maxDim && { resizedTo: `${maxDim}px max` }),
            });
        }

        res.json({ path: result.secure_url, size: result.bytes });
    } catch (err: any) {
        console.error('[/api/upload/texture] Error:', err.message);
        res.status(500).json({ error: err.message ?? 'Texture upload failed.' });
    }
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'Test endpoint working', timestamp: new Date().toISOString() });
});

app.get('/api/debug', (req, res) => {
    res.status(200).json({ success: true, message: 'Debug route working' });
});

// Serve React App catch-all
app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
});

// Global error handler
app.use(errorHandler);

export default app;
