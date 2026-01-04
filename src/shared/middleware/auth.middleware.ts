import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';

/**
 * Validates the HMAC-SHA256 signature of the webhook request.
 * Uses Constant-Time comparison to prevent timing attacks.
 */
export const verifyWebhookSignature = async (req: FastifyRequest, reply: FastifyReply) => {
    const signature = req.headers['x-signature'] as string;
    const secret = process.env.WEBHOOK_SECRET;

    if (!secret) {
        req.log.error('Security Configuration Error: WEBHOOK_SECRET is missing');
        throw new Error('Internal Server Error');
    }

    if (!signature) {
        req.log.warn('Security Alert: Missing Signature Header');
        return reply.code(401).send({ error: 'Missing Signature', message: 'X-Signature header is required' });
    }

    if (!req.rawBody) {
        req.log.error('Security Configuration Error: rawBody missing');
        throw new Error('Internal Server Error');
    }

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(req.rawBody)
        .digest('hex');

    if (signature.length !== expectedSignature.length) {
        req.log.warn('Security Alert: Invalid Signature');
        // Generic error to prevent length leakage (timing attack mitigation)
        return reply.code(401).send({ error: 'Invalid Signature', message: 'Access Denied' });
    }

    const valid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );

    if (!valid) {
        req.log.warn({ received: signature, expected: expectedSignature }, 'Security Alert: Invalid Signature');
        return reply.code(401).send({ error: 'Invalid Signature', message: 'Access Denied' });
    }
};
