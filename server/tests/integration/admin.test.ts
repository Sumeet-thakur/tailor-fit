import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../app.js';
import Admin from '../../models/admin.js';
import Product from '../../models/product.js';
import Fabric from '../../models/fabric.js';

describe('Admin Integration', () => {
    let token: string;

    beforeEach(async () => {
        await Admin.deleteMany({});
        await Product.deleteMany({});
        await Fabric.deleteMany({});

        // Create a super admin
        const admin = await Admin.create({
            name: 'Super Admin',
            email: 'admin@example.com',
            password: 'password123',
            role: 'super_admin',
        });

        const loginRes = await request(app)
            .post('/api/admin/login')
            .send({
                email: 'admin@example.com',
                password: 'password123',
            });

        token = loginRes.body.data.token;
    });

    it('should create a new product', async () => {
        const productData = {
            name: 'New Suit',
            description: 'A fancy suit',
            category: 'suit',
            basePrice: 200,
            images: {
                baseImage: 'http://example.com/suit.jpg',
            },
        };

        const res = await request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${token}`)
            .send(productData);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('New Suit');
    });

    it('should create a new fabric', async () => {
        const fabricData = {
            name: 'Silk Blue',
            category: 'silk',
            colorMapUrl: 'http://example.com/silk.jpg',
            price: 20,
        };

        const res = await request(app)
            .post('/api/fabrics')
            .set('Authorization', `Bearer ${token}`)
            .send(fabricData);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Silk Blue');
    });

    it('should fail to create product without auth', async () => {
        const productData = {
            name: 'Unauthorized Suit',
            basePrice: 100,
        };

        const res = await request(app)
            .post('/api/products')
            .send(productData);

        expect(res.status).toBe(401);
    });
});
