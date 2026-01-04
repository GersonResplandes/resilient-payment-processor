import { FastifyRequest, FastifyReply } from 'fastify';

import { WebhookPayloadSchema } from './webhook.schema';
import { WebhookService } from './webhook.service';

export class WebhookController {

    constructor(private readonly webhookService: WebhookService) { }

    // Method bound to the controller instance
    async handle(req: FastifyRequest, reply: FastifyReply) {
        // Validation (throws ZodError on failure, caught by global handler)
        const payload = WebhookPayloadSchema.parse(req.body);

        const result = await this.webhookService.processWebhook(payload, req.log);

        return reply.status(200).send(result);
    }
}
