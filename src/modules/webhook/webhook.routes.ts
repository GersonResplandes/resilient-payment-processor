import { FastifyInstance } from 'fastify';
import { WebhookController } from './webhook.controller';
import { verifyWebhookSignature } from '../../shared/middleware/auth.middleware';

export async function webhookRoutes(app: FastifyInstance, options: { controller: WebhookController }) {
    const { controller } = options;

    app.post('/webhook', {
        schema: {
            description: 'Process payment webhook idempotently',
            tags: ['webhook'],
            summary: 'Receive Payment Webhook',
            headers: {
                type: 'object',
                properties: {
                    'X-Signature': { type: 'string', description: 'HMAC-SHA256 Signature' }
                }
            },
            body: {
                type: 'object',
                required: ['transaction_id', 'amount', 'currency', 'status'],
                properties: {
                    transaction_id: { type: 'string', format: 'uuid' },
                    amount: { type: 'number' },
                    currency: { type: 'string', minLength: 3, maxLength: 3 },
                    status: { type: 'string' }
                }
            },
            response: {
                200: {
                    description: 'Successful response',
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        message: { type: 'string' }
                    }
                },
                400: {
                    description: 'Validation Error',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'array' }
                    }
                },
                401: {
                    description: 'Unauthorized (Invalid Signature)',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' }
                    }
                }
            }
        },
        preHandler: verifyWebhookSignature
    }, (req, reply) => controller.handle(req, reply));
}
