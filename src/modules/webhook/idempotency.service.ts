import { Redis } from 'ioredis';

export class IdempotencyService {
    private readonly LOCK_TTL_MS = 10000; // 10 seconds lock
    private readonly PROCESSED_TTL_SEC = 86400; // 24 hours

    constructor(private readonly redisClient: Redis) { }

    private getLockKey(transactionId: string): string {
        return `lock:transaction:${transactionId}`;
    }

    private getProcessedKey(transactionId: string): string {
        return `processed:transaction:${transactionId}`;
    }

    /**
     * Tries to acquire a distributed lock for a specific key.
     * Returns true if lock was acquired, false if it's already locked.
     */
    async acquireLock(transactionId: string): Promise<boolean> {
        const key = this.getLockKey(transactionId);
        const result = await this.redisClient.set(key, '1', 'PX', this.LOCK_TTL_MS, 'NX');
        return result === 'OK';
    }

    /**
     * Checks if the transaction has already been successfully processed.
     */
    async isProcessed(transactionId: string): Promise<boolean> {
        const key = this.getProcessedKey(transactionId);
        const exists = await this.redisClient.exists(key);
        return exists === 1;
    }

    /**
     * Marks a transaction as successfully processed.
     */
    async markAsProcessed(transactionId: string): Promise<void> {
        const key = this.getProcessedKey(transactionId);
        await this.redisClient.set(key, 'COMPLETED', 'EX', this.PROCESSED_TTL_SEC);
    }

    /**
     * Manually releases the lock.
     */
    async releaseLock(transactionId: string): Promise<void> {
        const key = this.getLockKey(transactionId);
        await this.redisClient.del(key);
    }
}
