import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../app.js';
import Customer from '../../models/customer.js';
import Order from '../../models/order.js';
import Product from '../../models/product.js';

describe('Orders Integration', () => {
    let token: string;
    let productId: string;

    beforeEach(async () => {
        await Order.deleteMany({});
        await Customer.deleteMany({});
        await Product.deleteMany({});

        // Create a customer and login
        await Customer.create({
            name: 'Order User',
            email: 'order@example.com',
            password: 'password123',
        });

        const loginRes = await request(app)
            .post('/api/customers/login')
            .send({
                email: 'order@example.com',
                password: 'password123',
            });

        token = loginRes.body.data.token;

        // Create a product
        const product = await Product.create({
            name: 'Test Shirt',
            basePrice: 50,
            category: 'shirt',
            description: 'A nice test shirt',
            images: { baseImage: 'http://example.com/shirt.jpg' },
        });
        productId = String((product as any)._id);
    });

    it('should place a new order', async () => {
        const orderData = {
            customer: {
                name: 'Order User',
                email: 'order@example.com',
                phone: '1234567890',
                address: {
                    street: '123 Test St',
                    city: 'Test City',
                    postalCode: '12345',
                    country: 'Pakistan'
                },
            },
            items: [
                {
                    productId,
                    productName: 'Test Shirt',
                    productCategory: 'shirt',
                    price: 50,
                    basePrice: 50,
                    totalPrice: 50,
                    quantity: 1,
                    image: 'http://example.com/shirt.jpg',
                }
            ],
            subtotal: 50,
            total: 50,
            paymentMethod: 'cod',
        };

        const res = await request(app)
            .post('/api/orders')
            .send(orderData);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('orderNumber');
        expect(res.body.data.total).toBe(50);
    });

    it('should fail to place order without items', async () => {
        const orderData = {
            customer: {
                name: 'Order User',
                email: 'order@example.com',
            },
            items: [],
            total: 0,
        };

        const res = await request(app)
            .post('/api/orders')
            .send(orderData);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
});
