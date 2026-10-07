import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../app.js';
import Customer from '../../models/customer.js';

describe('Auth Integration', () => {
    beforeEach(async () => {
        await Customer.deleteMany({});
    });

    describe('POST /api/customers/register', () => {
        it('should register a new customer', async () => {
            const res = await request(app)
                .post('/api/customers/register')
                .send({
                    name: 'Integration Test User',
                    email: 'integration@example.com',
                    password: 'password123',
                    phone: '1234567890',
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('token');
            expect(res.body.data.email).toBe('integration@example.com');

            const customer = await Customer.findOne({ email: 'integration@example.com' });
            expect(customer).not.toBeNull();
        });

        it('should fail if email already exists', async () => {
            await Customer.create({
                name: 'Existing User',
                email: 'existing@example.com',
                password: 'password123',
            });

            const res = await request(app)
                .post('/api/customers/register')
                .send({
                    name: 'New User',
                    email: 'existing@example.com',
                    password: 'password456',
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/customers/login', () => {
        it('should login with correct credentials', async () => {
            await Customer.create({
                name: 'Login User',
                email: 'login@example.com',
                password: 'password123',
            });

            const res = await request(app)
                .post('/api/customers/login')
                .send({
                    email: 'login@example.com',
                    password: 'password123',
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.token).toBeDefined();
        });

        it('should fail with incorrect password', async () => {
            await Customer.create({
                name: 'Login User',
                email: 'login@example.com',
                password: 'password123',
            });

            const res = await request(app)
                .post('/api/customers/login')
                .send({
                    email: 'login@example.com',
                    password: 'wrongpassword',
                });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });
});
