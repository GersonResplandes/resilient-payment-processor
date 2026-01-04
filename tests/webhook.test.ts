import supertest from 'supertest';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../src/app';

describe('POST /webhook', () => {
    const SECRET = process.env.WEBHOOK_SECRET || 'super_secret_signing_key_change_me';

    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    const payload = {
        transaction_id: uuidv4(),
        amount: 100.50,
        currency: 'USD',
        status: 'COMPLETED'
    };

    test('Should reject request without signature', async () => {
        const response = await supertest(app.server)
            .post('/webhook')
            .send(payload);

        expect(response.status).toBe(401);
    });

    test('Should reject request with invalid signature', async () => {
        const response = await supertest(app.server)
            .post('/webhook')
            .set('X-Signature', 'invalid_signature')
            .send(payload);

        expect(response.status).toBe(401);
    });

    test('Should accept request with valid signature', async () => {
        const payloadString = JSON.stringify(payload);
        const signature = crypto
            .createHmac('sha256', SECRET)
            .update(Buffer.from(payloadString, 'utf8')) // Simulate raw body exactly
            .digest('hex');

        // Note: supertest .send(object) serializes JSON.
        // We rely on our parser to capture the buffer.

        const response = await supertest(app.server)
            .post('/webhook')
            .set('X-Signature', signature)
            .send(payload);

        // It depends on Redisf/DB state, mock might be needed for full isolation.
        // But as an integration test against a running Docker env, this is valid.
        // Expect 200 or 200 (Already processed)
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status');
    });
});
