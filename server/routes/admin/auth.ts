import express, { type Request, Response } from 'express';
import Admin from '../../models/admin.js';
import { generateToken, protectAdmin } from '../../middleware/adminAuth.js';
import { deleteFromCloudinaryByUrl, isCloudinaryUrl, extractPublicIdFromUrl } from '../../utils/cloudinaryDelete.js';

const router = express.Router();

// Admin invite code (used for registering new admins)
// In production, this should be in environment variables
const ADMIN_INVITE_CODE = process.env.ADMIN_INVITE_CODE || 'TAILORFIT-ADMIN-2026';

// Register new admin (requires invite code)
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { name, email, password, inviteCode } = req.body;

        // Verify invite code
        if (inviteCode !== ADMIN_INVITE_CODE) {
            return res.status(400).json({
                success: false,
                message: 'Invalid invite code',
            });
        }

        const adminExists = await Admin.findOne({ email: email.toLowerCase() });
        if (adminExists) {
            return res.status(400).json({
                success: false,
                message: 'Admin already exists',
            });
        }

        const admin = await Admin.create({
            name,
            email: email.toLowerCase(),
            password,
        });

        if (admin) {
            const token = generateToken(admin._id.toString());
            res.status(201).json({
                success: true,
                message: 'Admin account created successfully',
                data: {
                    _id: admin._id,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role,
                    token,
                },
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid admin data',
            });
        }
    } catch (error) {
        console.error('Admin registration error:', error);
        res.status(500).json({
            success: false,
            message: (error instanceof Error ? error.message : 'Failed to create admin account'),
        });
    }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password',
            });
        }

        const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');

        if (admin && (await admin.comparePassword(password))) {
            if (!admin.isActive) {
                return res.status(401).json({
                    success: false,
                    message: 'Account is deactivated. Please contact super admin.',
                });
            }

            // Update last login
            admin.lastLogin = new Date();
            await admin.save({ validateBeforeSave: false });

            const token = generateToken(admin._id.toString());

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    _id: admin._id,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role,
                    profileImage: admin.profileImage,
                    token,
                },
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
        });
    }
});

// Get current admin
router.get('/me', protectAdmin, async (req: Request, res: Response) => {
    const admin = req.admin;
    if (!admin) {
        res.status(401).json({ success: false, message: 'Not authorized' });
        return;
    }
    res.json({
        success: true,
        data: {
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            profileImage: admin.profileImage,
            lastLogin: admin.lastLogin,
        },
    });
});

// Update current admin profile (including image)
router.patch('/me', protectAdmin, async (req: Request, res: Response) => {
    try {
        const { name, profileImage } = req.body;
        const admin = req.admin;
        if (!admin) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (name) updates.name = name;
        if (profileImage !== undefined) {
            // Delete old profile image from Cloudinary before saving new one
            const oldAdmin = await Admin.findById(admin._id).select('profileImage').lean();
            const oldUrl = (oldAdmin as any)?.profileImage;
            // Also compare public_ids because Cloudinary versions (v123... urls) change on overwrite
            const oldPublicId = (oldUrl && isCloudinaryUrl(oldUrl)) ? extractPublicIdFromUrl(oldUrl) : null;
            const newPublicId = (profileImage && isCloudinaryUrl(profileImage)) ? extractPublicIdFromUrl(profileImage) : null;

            if (oldUrl && isCloudinaryUrl(oldUrl) && oldUrl !== profileImage && oldPublicId !== newPublicId) {
                // Fire and forget deletion to avoid UI blocking
                deleteFromCloudinaryByUrl(oldUrl).catch(err => {
                    console.error('[Admin] Failed to delete old profile image in background:', err);
                });
            }
            updates.profileImage = profileImage;
        }

        const updated = await Admin.findByIdAndUpdate(
            admin._id,
            updates,
            { returnDocument: 'after', runValidators: true }
        );

        if (!updated) {
            res.status(404).json({ success: false, message: 'Admin not found' });
            return;
        }

        res.json({
            success: true,
            message: 'Profile updated',
            data: {
                _id: updated._id,
                name: updated.name,
                email: updated.email,
                role: updated.role,
                profileImage: updated.profileImage,
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// Request password reset
router.post('/forgot-password', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        const admin = await Admin.findOne({ email: email.toLowerCase() });
        if (!admin) {
            // Don't reveal if email exists
            return res.json({
                success: true,
                message: 'If an account exists, a reset token has been generated',
            });
        }

        const resetToken = admin.createPasswordResetToken();
        await admin.save({ validateBeforeSave: false });

        // In production, send this via email
        // For now, we'll return it (only for development)
        res.json({
            success: true,
            message: 'Password reset token generated',
            resetToken, // Remove this in production - send via email instead
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to process request',
        });
    }
});

// Reset password
router.post('/reset-password', async (req: Request, res: Response) => {
    try {
        const { resetToken, newPassword } = req.body;

        const admin = await Admin.findOne({
            passwordResetToken: resetToken,
            passwordResetExpires: { $gt: Date.now() },
        });

        if (!admin) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token',
            });
        }

        admin.password = newPassword;
        admin.passwordResetToken = undefined;
        admin.passwordResetExpires = undefined;
        await admin.save();

        res.json({
            success: true,
            message: 'Password reset successful',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to reset password',
        });
    }
});

// Change password (logged in admin)
router.patch('/change-password', protectAdmin, async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const currentAdmin = req.admin;
        if (!currentAdmin) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        const admin = await Admin.findById(currentAdmin._id).select('+password');

        if (!admin || !(await admin.comparePassword(currentPassword))) {
            res.status(401).json({
                success: false,
                message: 'Current password is incorrect',
            });
            return;
        }

        admin.password = newPassword;
        await admin.save();

        res.json({
            success: true,
            message: 'Password changed successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to change password',
        });
    }
});

export default router;
