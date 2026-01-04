# 🛡️ Resilient Payment Processor (Webhook Guard)

> **Enterprise-Grade Webhook Handler** aimed at ensuring **Idempotency**, **Data Consistency**, and **High Security** for payment processing systems.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

---

## 🌎 Language / Idioma
- [🇺🇸 English](README.md)
- [🇧🇷 Português (BR)](README.pt-br.md)

---

## 🚀 Overview

This project implements a robust API Endpoint to receive Payment Webhooks (e.g., from Stripe, PayPal, Pagar.me) effectively addressing the **Double-Spending** problem and **Race Conditions** under high concurrency.

It is designed with a **Defense-in-Depth** architecture, combining distributed blocking (Redis), database transactions (Prisma/Postgres), and cryptographic verification (HMAC).

### Key Features

*   **🔒 Strict Security (HMAC)**: Validates the authenticity of the request using SHA-256 signatures over the raw payload buffer.
*   **⚡ Idempotency Guard**: Distributed locking strategy (Redis Mutex) to prevent simultaneous processing of the same transaction.
*   **💾 ACID Consistency**: Deduplication at the Database level using `@prisma/client` interactive transactions.
*   **🏎️ High Performance**: Built on **Fastify** for low overhead and high throughput.
*   **📝 Structured Logging**: Observable logs via `pino`.
*   **📑 OpenAPI / Swagger**: Auto-generated API Documentation.
*   **📦 Singleton Architecture**: Optimized Dependency Injection for resource efficiency.

---

## 🛠️ Architecture

The processing flow follows a strict pipeline:

1.  **Security Middleware**: Intercepts the request, captures the `Raw Body`, calculates the HMAC-SHA256, and compares it with the `X-Signature` header in constant time.
2.  **Controller**: Validates the JSON Schema (Zod) and delegates to the Service.
3.  **Idempotency Service (Layer 1)**: Checks the Redis Cache. If processed, returns immediately.
4.  **Atomic Lock (Layer 2)**: Acquires a `SET NX PX` lock in Redis. If failed, the request is ignored (concurrent duplicate).
5.  **Database Transaction (Layer 3)**: Performs a `findUnique` check inside a Postgres transaction. If it exists, aborts. If not, persists the data.
6.  **Commit & Release**: Commits the transaction, marks the key as processed in Redis (TTL 24h), and releases the lock.

---

## ⚡ Getting Started

### Prerequisites

*   **Node.js** v18+
*   **Docker** & **Docker Compose**
*   **npm**

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/GersonResplandes/resilient-payment-processor.git
    cd resilient-payment-processor
    ```

2.  **Setup Environment:**
    ```bash
    cp .env.example .env
    # Adjust variables if necessary (DB, REDIS, SECRET)
    ```

3.  **Start Infrastructure (Redis & Postgres):**
    ```bash
    docker-compose up -d
    ```

4.  **Install Dependencies & Migrate:**
    ```bash
    npm install
    npx prisma migrate dev --name init
    ```

---

## 🏃 Running the Application

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts server in development mode (Hot-reload + Pretty Logs) |
| `npm run build` | Compiles TypeScript to `dist/` |
| `npm run start` | Runs the production build |
| `npm run lint` | Runs ESLint to ensure code quality |
| `npm test` | Runs Unit/Integration Tests (Jest) |

### 📖 API Documentation (Swagger)

Once the server is running, access the interactive documentation:

👉 **[http://localhost:3000/docs](http://localhost:3000/docs)**

---

## 🧪 Testing

### Unit & Integration (Jest)
Run the automated test suite to verify logic and security.
```bash
npm test
```

### Concurrency Simulation
Run the stress script to simulate **20 parallel requests** with the same Transaction ID.
```bash
npm run test:concurrency
```
*Expected Result: 1 Success, 19 Ignored (Safe).*

---

## 📁 Project Structure

```bash
src/
├── modules/
│   └── webhook/
│       ├── webhook.controller.ts  # HTTP Handler
│       ├── webhook.service.ts     # Business Logic & Orchestration
│       ├── idempotency.service.ts # Redis Locking Logic
│       └── webhook.schema.ts      # Zod Validation
├── shared/
│   └── redis.client.ts            # Shared Redis Instance
├── app.ts                         # Entry Point (App, Middleware, DI)
└── ...
```

---

## 📄 License
This project is licensed under the ISC License.
