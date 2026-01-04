import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

// Simulation Configuration
const ENDPOINT = 'http://localhost:3000/webhook';
const CONCURRENT_REQUESTS = 20;
const SECRET = process.env.WEBHOOK_SECRET || 'super_secret_signing_key_change_me';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function generateSignature(payload: any): string {
    return crypto
        .createHmac('sha256', SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');
}

async function runSimulation() {
    console.log(`🚀 Starting Concurrency Simulation (Secured): ${CONCURRENT_REQUESTS} requests...`);

    // 1. Generate a single Transaction ID for all requests
    const transactionId = uuidv4();
    console.log(`Target Transaction ID: ${transactionId}`);

    const payload = {
        transaction_id: transactionId,
        status: 'COMPLETED',
        amount: 100.00,
        currency: 'BRL',
        timestamp: new Date().toISOString()
    };

    const signature = generateSignature(payload);

    // 2. Prepare Requests
    const requests = [];
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
        requests.push(
            fetch(ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Signature': signature
                },
                body: JSON.stringify(payload)
            }).then(res => res.json())
        );
    }

    // 3. Fire all at once!
    const start = Date.now();
    const results = await Promise.all(requests);
    const duration = Date.now() - start;

    // 4. Analyze Results
    let successCount = 0;
    let ignoredCount = 0;
    let alreadyProcessedCount = 0;
    let unauthorizedCount = 0;
    let errorCount = 0;

    results.forEach((res: any) => {
        if (res.status === 'success' && res.message === 'Processed successfully') {
            successCount++;
        } else if (res.status === 'ignored') {
            ignoredCount++;
        } else if (res.status === 'success' && res.message === 'Already processed') {
            alreadyProcessedCount++;
        } else if (res.error === 'Unauthorized') {
            unauthorizedCount++;
        } else {
            console.log('Unexpected response:', res);
            errorCount++;
        }
    });

    console.log('\n--- 📊 Simulation Results ---');
    console.log(`Time taken: ${duration}ms`);
    console.log(`Total Requests: ${CONCURRENT_REQUESTS}`);
    console.log(`✅ Successful Processed (Should be 1): ${successCount}`);
    console.log(`🛡️  Blocked by Lock (Ignored):        ${ignoredCount}`);
    console.log(`💾 Blocked by Cache (Already Done):   ${alreadyProcessedCount}`);
    console.log(`🔒 Unauthorized (Bad Sig):            ${unauthorizedCount}`);
    console.log(`❌ Errors:                            ${errorCount}`);

    if (successCount === 1 && (ignoredCount + alreadyProcessedCount) === (CONCURRENT_REQUESTS - 1)) {
        console.log('\n✨ TEST PASSED: Idempotency Guard is working perfectly.');
    } else {
        console.log('\n⚠️ TEST FAILED.');
    }
}

runSimulation();
