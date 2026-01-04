# 🛡️ Processador de Pagamentos Resiliente (Webhook Guard)

> **Handler de Webhooks Enterprise** focado em garantir **Idempotência**, **Consistência de Dados** e **Alta Segurança** para sistemas de pagamento.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

---

## 🌎 Idioma / Language
- [🇺🇸 English](README.md)
- [🇧🇷 Português (BR)](README.pt-br.md)

---

## 🚀 Visão Geral

Este projeto implementa um Endpoint de API robusto para receber Webhooks de Pagamento (ex: Stripe, PayPal, Pagar.me), resolvendo eficazmente o problema de **Gasto Duplo (Double-Spending)** e **Race Conditions** sob alta concorrência.

Foi projetado com uma arquitetura de **Defesa em Profundidade**, combinando bloqueio distribuído (Redis), transações de banco de dados (Prisma/Postgres) e verificação criptográfica (HMAC).

### Principais Recursos

*   **🔒 Segurança Estrita (HMAC)**: Valida a autenticidade da requisição usando assinaturas SHA-256 sobre o buffer bruto do payload.
*   **⚡ Guarda de Idempotência**: Estratégia de bloqueio distribuído (Redis Mutex) para impedir o processamento simultâneo da mesma transação.
*   **💾 Consistência ACID**: Deduplicação em nível de Banco de Dados usando transações interativas do `@prisma/client`.
*   **🏎️ Alta Performance**: Construído sobre **Fastify** para baixo overhead e alto throughput.
*   **📝 Logs Estruturados**: Observabilidade via `pino`.
*   **📑 OpenAPI / Swagger**: Documentação de API gerada automaticamente.
*   **📦 Arquitetura Singleton**: Injeção de Dependência otimizada para eficiência de recursos.

---

## 🛠️ Arquitetura

O fluxo de processamento segue um pipeline rigoroso:

1.  **Middleware de Segurança**: Intercepta a requisição, captura o `Raw Body`, calcula o HMAC-SHA256 e compara com o header `X-Signature` em tempo constante.
2.  **Controller**: Valida o Schema JSON (Zod) e delega para o Service.
3.  **Idempotency Service (Camada 1)**: Verifica o Cache Redis. Se processado, retorna imediatamente.
4.  **Atomic Lock (Camada 2)**: Adquire um lock `SET NX PX` no Redis. Se falhar, a requisição é ignorada (duplicata concorrente).
5.  **Database Transaction (Camada 3)**: Executa um `findUnique` dentro de uma transação Postgres. Se existir, aborta. Se não, persiste os dados.
6.  **Commit & Release**: Comita a transação, marca a chave como processada no Redis (TTL 24h) e libera o lock.

---

## ⚡ Começando

### Pré-requisitos

*   **Node.js** v18+
*   **Docker** & **Docker Compose**
*   **npm**

### Instalação

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/GersonResplandes/resilient-payment-processor.git
    cd resilient-payment-processor
    ```

2.  **Configure o Ambiente:**
    ```bash
    cp .env.example .env
    # Ajuste as variáveis se necessário (DB, REDIS, SECRET)
    ```

3.  **Inicie a Infraestrutura (Redis & Postgres):**
    ```bash
    docker-compose up -d
    ```

4.  **Instale Dependências & Migre:**
    ```bash
    npm install
    npx prisma migrate dev --name init
    ```

---

## 🏃 Executando a Aplicação

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia servidor em modo desenvolvimento (Hot-reload + Logs Bonitos) |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm run start` | Executa o build de produção |
| `npm run lint` | Executa ESLint para garantir qualidade de código |
| `npm test` | Executa Testes de Unidade/Integração (Jest) |

### 📖 Documentação da API (Swagger)

Com o servidor rodando, acesse a documentação interativa:

👉 **[http://localhost:3000/docs](http://localhost:3000/docs)**

---

## 🧪 Testes

### Unidade & Integração (Jest)
Execute a suíte de testes automatizados para verificar a lógica e segurança.
```bash
npm test
```

### Simulação de Concorrência
Execute o script de stress para simular **20 requisições paralelas** com o mesmo Transaction ID.
```bash
npm run test:concurrency
```
*Resultado Esperado: 1 Sucesso, 19 Ignorados (Seguro).*

---

## 📁 Estrutura do Projeto

```bash
src/
├── modules/
│   └── webhook/
│       ├── webhook.controller.ts  # HTTP Handler
│       ├── webhook.service.ts     # Regra de Negócio & Orquestração
│       ├── idempotency.service.ts # Lógica de Travamento Redis
│       └── webhook.schema.ts      # Validação Zod
├── shared/
│   └── redis.client.ts            # Instância Redis Compartilhada
├── app.ts                         # Ponto de Entrada (App, Middleware, DI)
└── ...
```

---

## 📄 Licença
Este projeto está licenciado sob a Licença ISC.
