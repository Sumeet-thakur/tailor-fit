import { type Request, Response, NextFunction } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import Admin from '../models/admin.js';
import type { AdminDoc } from '../types/express.js'; // Ensure the type matches the global declaration

// Extend Express Request to include admin
declare global {
    namespace Express {
        interface Request {
            admin?: AdminDoc;
        }
    }
}

// Admin JWT Secret (different from customer)
// Admin JWT Secret managed lazily to support ESM hoisting
export const getJwtSecret = () => {
    return process.env.ADMIN_JWT_SECRET || 'tailor-fit-admin-secret-key-change-this';
};

// Generate JWT token
export const generateToken = (id: string): string => {
    return jwt.sign({ id }, getJwtSecret(), {
        expiresIn: '24h',
    });
};

// Admin auth middleware
export const protectAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;

            const admin = await Admin.findById(decoded.id).select('-password');
            if (!admin) {
                res.status(401).json({ success: false, message: 'Not authorized, admin not found' });
                return;
            }

            if (!admin.isActive) {
                res.status(401).json({ success: false, message: 'Admin account is deactivated' });
                return;
            }

            req.admin = admin;
            next();
        } catch (error) {
            console.error('Admin auth error:', error);
            res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
};

// Super admin middleware
export const requireSuperAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.admin && req.admin.role === 'super_admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Not authorized as super admin' });
    }
};
