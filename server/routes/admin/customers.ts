import express, { type Request, Response } from 'express';
import Customer from '../../models/customer.js';
import Order from '../../models/order.js';
import { createNotification } from '../../utils/createNotification.js';
import { protectAdmin, requireSuperAdmin } from '../../middleware/adminAuth.js';
import { deleteCustomerWithAssets } from '../../utils/deleteHandlers.js';

const router = express.Router();

// Get all customers (admin only)
router.get('/customers', protectAdmin, async (req: Request, res: Response) => {
    try {
        const { search, limit = 50, page = 1 } = req.query;

        let query = {};
        if (search) {
            query = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } },
                ],
            };
        }

        const customers = await Customer.find(query)
            .select('-savedDesigns -savedMeasurements')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));

        const total = await Customer.countDocuments(query);

        // Enrich with order counts
        const enrichedCustomers = await Promise.all(customers.map(async (c) => {
            const orderCount = await Order.countDocuments({ 'customer.email': c.email });
            return { ...c.toObject(), orderCount };
        }));

        res.json({
            success: true,
            count: customers.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            data: enrichedCustomers,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customers',
        });
    }
});

// Get single customer details
router.get('/customers/:id', protectAdmin, async (req: Request, res: Response) => {
    try {
        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found',
            });
        }

        // Get Order Stats for this customer
        const orders = await Order.find({ 'customer.email': customer.email }).sort({ createdAt: -1 });

        const stats = {
            total: orders.length,
            delivered: orders.filter(o => o.status === 'delivered').length,
            cancelled: orders.filter(o => o.status === 'cancelled').length,
            active: orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length,
            totalSpent: orders.filter(o => o.status !== 'cancelled').reduce((acc, curr) => acc + (curr.total || 0), 0)
        };

        res.json({
            success: true,
            data: {
                ...customer.toObject(),
                stats,
                recentOrders: orders.slice(0, 10) // Send last 10 orders
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customer',
        });
    }
});

// Admin reset of customer password
router.post('/customers/:id/reset-password', protectAdmin, async (req: Request, res: Response) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters',
            });
        }

        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found',
            });
        }

        customer.password = newPassword;
        await customer.save();

        await createNotification({
            customerId: customer._id,
            type: 'password_reset',
            title: 'Password reset by admin',
            message: 'An administrator has reset your password. Please log in with your new password.',
            link: { path: '/login' },
        });

        res.json({
            success: true,
            message: `Password reset for ${customer.email}`,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to reset password',
        });
    }
});

// Update customer info
router.patch('/customers/:id', protectAdmin, async (req: Request, res: Response) => {
    try {
        const { name, phone, address } = req.body;

        const customer = await Customer.findByIdAndUpdate(
            req.params.id,
            { name, phone, address, updatedAt: Date.now() },
            { returnDocument: 'after', runValidators: true }
        );

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found',
            });
        }

        await createNotification({
            customerId: customer._id,
            type: 'profile_update',
            title: 'Profile updated by admin',
            message: 'Your profile information was updated by our team.',
            link: { path: '/account' },
        });

        res.json({
            success: true,
            message: 'Customer updated',
            data: customer,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update customer',
        });
    }
});

// Delete customer with full Cloudinary cleanup (Super Admin only)
router.delete('/customers/:id', protectAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
        const { deleted, assetsDeleted } = await deleteCustomerWithAssets(req.params.id as string);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        res.json({
            success: true,
            message: `Customer deleted with ${assetsDeleted} Cloudinary asset(s) cleaned up`,
        });
    } catch (error) {
        console.error('[Admin Customers] Delete failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete customer',
        });
    }
});

export default router;
