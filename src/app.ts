import Fastify, { FastifyRequest } from 'fastify';

import dotenv from 'dotenv';
import { ZodError } from 'zod';
import { PrismaClient } from '@prisma/client';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';


import { WebhookController } from './modules/webhook/webhook.controller';
import { WebhookService } from './modules/webhook/webhook.service';
import { IdempotencyService } from './modules/webhook/idempotency.service';
import { webhookRoutes } from './modules/webhook/webhook.routes';

dotenv.config();

// validation guard
const REQUIRED_ENV = ['DATABASE_URL', 'REDIS_URL', 'WEBHOOK_SECRET', 'PORT'];
const missingEnv = REQUIRED_ENV.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`FATAL: Missing Environment Variables: ${missingEnv.join(', ')}`);
    process.exit(1);
}

import { redis } from './shared/redis.client';
const prisma = new PrismaClient();
const idempotencyService = new IdempotencyService(redis); // Injected Redis Client
const webhookService = new WebhookService(idempotencyService, prisma);
const webhookController = new WebhookController(webhookService);

const app = Fastify({
    logger: {
        transport: {
            target: 'pino-pretty',
            options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
            },
        },
    },
});
// Global Error Handler
app.setErrorHandler((error, req, reply) => {
    if (error instanceof ZodError) {
        req.log.warn({ issues: error.issues }, 'Validation Error');
        reply.status(400).send({ error: 'Invalid Payload', details: error.issues });
    } else {
        // Handle generic errors
        req.log.error(error);
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});

// Graceful Shutdown Hook
app.addHook('onClose', async (_instance) => {
    await prisma.$disconnect();
    // Close shared Redis connection
    await redis.quit();
});

// Manual content type parser to ensure we get the raw buffer for HMAC verification
// before any JSON parsing occurs.
app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req: FastifyRequest, body: Buffer, done) => {
    req.rawBody = body;
    try {
        const json = JSON.parse(body.toString());
        done(null, json);
    } catch (err: unknown) {
        (err as any).statusCode = 400;
        done(err as Error, undefined);
    }
});

app.register(fastifySwagger, {
    openapi: {
        info: {
            title: 'Resilient Payment Processor API',
            description: 'Idempotent Webhook Handler with HMAC Security',
            version: '1.0.0',
        },
        servers: [{ url: 'http://localhost:3000' }],
        components: {
            securitySchemes: {
                apiKey: {
                    type: 'apiKey',
                    name: 'X-Signature',
                    in: 'header',
                }
            }
        }
    }
});

app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
        docExpansion: 'full',
        deepLinking: false,
    },
});



app.register(async (api) => {
    api.get('/', async () => {
        return { status: 'ok', service: 'Idempotency Guard' };
    });

    api.get('/health', {
        schema: {
            description: 'Health Check',
            tags: ['health'],
            summary: 'Check API Status',
            response: {
                200: {
                    description: 'Successful Response',
                    type: 'object',
                    properties: {
                        status: { type: 'string' }
                    }
                }
            }
        }
    }, async () => {
        return { status: 'active' };
    });

    // Register Webhook Routes (injected controller)
    api.register(webhookRoutes, { controller: webhookController });
});


const start = async () => {
    try {
        const port = Number(process.env.PORT);
        await app.listen({ port, host: '0.0.0.0' });
        app.log.info(`Server listening on port ${port} (Secure & Optimized)`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

if (require.main === module) {
    start();
}

export { app };
