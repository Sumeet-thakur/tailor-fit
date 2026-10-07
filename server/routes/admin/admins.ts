import express, { type Request, Response } from 'express';
import Admin from '../../models/admin.js';
import { protectAdmin, requireSuperAdmin } from '../../middleware/adminAuth.js';
import { deleteAdminWithAssets } from '../../utils/deleteHandlers.js';

const router = express.Router();

// List all admins (Super Admin only)
router.get('/list', protectAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
        const admins = await Admin.find().select('-password');
        res.json({
            success: true,
            data: admins,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch admins',
        });
    }
});

// Create new admin (Super Admin only - No invite code needed)
router.post('/create', protectAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email and password',
            });
        }

        const adminExists = await Admin.findOne({ email: email.toLowerCase() });
        if (adminExists) {
            return res.status(400).json({
                success: false,
                message: 'Admin with this email already exists',
            });
        }

        const admin = await Admin.create({
            name,
            email: email.toLowerCase(),
            password,
        });

        res.status(201).json({
            success: true,
            message: 'Admin created successfully',
            data: {
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
            },
        });
    } catch (error) {
        console.error('Admin creation error:', error);
        res.status(500).json({
            success: false,
            message: (error instanceof Error ? error.message : 'Failed to create admin'),
        });
    }
});

// Deactivate admin
router.patch('/:id/deactivate', protectAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
        const admin = req.admin;
        if (!admin) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }
        const id = req.params.id;
        if (!id || id === admin._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot deactivate yourself',
            });
        }

        const updated = await Admin.findByIdAndUpdate(
            id,
            { isActive: false },
            { returnDocument: 'after' }
        );

        if (!updated) {
            res.status(404).json({
                success: false,
                message: 'Admin not found',
            });
            return;
        }

        res.json({
            success: true,
            message: 'Admin deactivated',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to deactivate admin',
        });
    }
});

// Activate admin
router.patch('/:id/activate', protectAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
        const admin = await Admin.findByIdAndUpdate(
            req.params.id,
            { isActive: true },
            { returnDocument: 'after' }
        );

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found',
            });
        }

        res.json({
            success: true,
            message: 'Admin activated',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to activate admin',
        });
    }
});

// Delete admin with full Cloudinary cleanup (Super Admin only)
router.delete('/:id', protectAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
        // Prevent self-deletion
        const requestingAdmin = (req as any).admin;
        if (requestingAdmin?._id?.toString() === req.params.id) {
            return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
        }

        const { deleted, assetsDeleted } = await deleteAdminWithAssets(req.params.id as string);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }
        res.json({
            success: true,
            message: `Admin deleted with ${assetsDeleted} Cloudinary asset(s) cleaned up`,
        });
    } catch (error) {
        console.error('[Admin Admins] Delete failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete admin',
        });
    }
});

export default router;
