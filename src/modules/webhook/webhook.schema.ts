import { z } from 'zod';

export const WebhookPayloadSchema = z.object({
    transaction_id: z.string().uuid(),
    status: z.enum(['COMPLETED', 'FAILED', 'PENDING']),
    amount: z.number().positive(),
    currency: z.string().length(3),
    timestamp: z.string().datetime().optional(),
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
