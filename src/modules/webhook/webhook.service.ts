import { PrismaClient } from '@prisma/client';
import { FastifyBaseLogger } from 'fastify';
import { IdempotencyService } from './idempotency.service';
import { WebhookPayload } from './webhook.schema';

export class WebhookService {
    constructor(
        private readonly idempotency: IdempotencyService,
        private readonly prisma: PrismaClient
    ) { }

    async processWebhook(payload: WebhookPayload, log: FastifyBaseLogger): Promise<{ status: string; message: string }> {
        const { transaction_id } = payload;
        const childLog = log.child({ module: 'WebhookService', transaction_id });

        // Check processing state (Idempotency)
        const isProcessed = await this.idempotency.isProcessed(transaction_id);
        if (isProcessed) {
            childLog.info('Transaction already processed. Returning success.');
            return { status: 'success', message: 'Already processed' };
        }

        // Acquire distributed lock
        const locked = await this.idempotency.acquireLock(transaction_id);
        if (!locked) {
            childLog.warn('Race Condition: Lock failed. Request ignored.');
            return { status: 'ignored', message: 'Concurrent request in progress' };
        }

        try {
            await this.prisma.$transaction(async (tx) => {
                // Double-check DB inside transaction to prevent race conditions
                const existing = await tx.transaction.findUnique({
                    where: { transactionId: transaction_id },
                });

                if (existing) {
                    childLog.info('Transaction found in DB during transaction check. Msg lost in Redis?');
                    return;
                }


                await tx.transaction.create({
                    data: {
                        transactionId: transaction_id,
                        amount: payload.amount,
                        currency: payload.currency,
                        status: payload.status,
                    },
                });

                childLog.info('Transaction saved to DB via Prisma.');
            });

            // Mark as Processed in Redis
            await this.idempotency.markAsProcessed(transaction_id);

            return { status: 'success', message: 'Processed successfully' };

        } catch (error) {
            childLog.error({ err: error }, 'Error processing transaction');
            throw error;
        } finally {
            await this.idempotency.releaseLock(transaction_id);
        }
    }
}
