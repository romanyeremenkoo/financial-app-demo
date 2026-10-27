# Banking API

The backend service for the **Financial App** portfolio monorepo. It implements the
authoritative OpenAPI contract at [`contracts/banking-api.yaml`](../../contracts/banking-api.yaml)
exactly — accounts, cards, transactions and money transfers for the fictional
"Elena Vasquez" demo persona shared with the Angular and React frontends.

- **Java:** 17 (Temurin 17.0.6)
- **Framework:** Spring Boot 3.5.16 (Spring Web MVC, Spring Data JPA, Bean Validation, Actuator)
- **Database:** PostgreSQL 16, schema owned by **Flyway** migrations
- **Build:** Maven (via the committed Maven Wrapper `./mvnw`)
- **Docs:** springdoc-openapi (Swagger UI)
- **Base path:** every endpoint is served under **`/api`** (`server.servlet.context-path=/api`)

---

## Table of contents

1. [Prerequisites](#prerequisites)
2. [Start PostgreSQL](#start-postgresql)
3. [Environment variables](#environment-variables)
4. [Run the API](#run-the-api)
5. [Swagger UI](#swagger-ui)
6. [Endpoints with curl examples](#endpoints-with-curl-examples)
7. [Migrations & seed data](#migrations--seed-data)
8. [Reset the database](#reset-the-database)
9. [Concurrency & locking](#concurrency--locking)
10. [Idempotency semantics](#idempotency-semantics)
11. [Testing](#testing)
12. [Project layout](#project-layout)

---

## Prerequisites

- **JDK 17** on `PATH` (`java -version` should report 17.x).
  If `JAVA_HOME` points elsewhere, set it for the current shell:
  ```powershell
  $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.6.10-hotspot"
  ```
- **No Maven install required** — use the committed wrapper `.\mvnw.cmd` (Windows) / `./mvnw` (Unix).
  The wrapper downloads Maven 3.9.9 on first use.
- A **PostgreSQL 16** database (see below). Docker is optional.

> The integration tests do **not** need a running PostgreSQL or Docker — they boot a
> real PostgreSQL 16 binary in-process via `io.zonky.test:embedded-postgres`.

---

## Start PostgreSQL

### Option A — Docker Compose (recommended if you have Docker)

```powershell
cd services\banking-api
docker compose up -d
```

This starts `postgres:16-alpine` with database `financial_app`, user `financial_app`,
port `5432`, and a named volume `banking_pgdata`. The password defaults to
`financial_app` but can be overridden via `POSTGRES_PASSWORD` (see `.env.example`).

Stop it with `docker compose down`, or wipe all data with `docker compose down -v`.

### Option B — Native PostgreSQL install (no Docker)

1. Install PostgreSQL 16 (e.g. the EDB Windows installer, or `choco install postgresql16`).
2. Create the role and database (run in `psql` as a superuser):
   ```sql
   CREATE ROLE financial_app WITH LOGIN PASSWORD 'financial_app';
   CREATE DATABASE financial_app OWNER financial_app;
   ```
3. Ensure the server listens on `localhost:5432` (the default).

Flyway creates all tables and seeds the demo data automatically the first time the app starts —
you do **not** run any SQL by hand beyond creating the empty database.

---

## Environment variables

All have dev defaults, so the app runs out-of-the-box against a local PostgreSQL.
Copy `.env.example` to `.env` and adjust for real deployments. **Never commit real secrets.**

| Variable                    | Default                                                                                   | Purpose                              |
| --------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------ |
| `DB_URL`                    | `jdbc:postgresql://localhost:5432/financial_app`                                          | JDBC URL                             |
| `DB_USERNAME`               | `financial_app`                                                                           | DB user                              |
| `DB_PASSWORD`               | `financial_app`                                                                           | DB password                          |
| `APP_CORS_ALLOWED_ORIGINS`  | `http://localhost:4200,http://localhost:4280,http://localhost:5173,http://localhost:5273` | Comma-separated allowed CORS origins |

To export them for a PowerShell session:

```powershell
$env:DB_URL      = "jdbc:postgresql://localhost:5432/financial_app"
$env:DB_USERNAME = "financial_app"
$env:DB_PASSWORD = "financial_app"
```

---

## Run the API

```powershell
cd services\banking-api
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.6.10-hotspot"
.\mvnw.cmd spring-boot:run
```

The API listens on **`http://localhost:8080/api`**. Verify it:

```powershell
curl.exe http://localhost:8080/api/health
# {"status":"UP","version":"1.0.0","profile":"local"}
```

Build a runnable jar instead:

```powershell
.\mvnw.cmd clean package
java -jar target\banking-api.jar
```

### Run without installing PostgreSQL at all

`src/test/java/com/financialapp/banking/TestBankingApiApplication.java` starts the **real**
application against a throwaway `io.zonky.test:embedded-postgres` instance (a genuine
PostgreSQL 16 binary unpacked into a temp directory — no Docker, no local service):

```powershell
cd services\banking-api
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.6.10-hotspot"
.\mvnw.cmd spring-boot:test-run
```

Flyway migrates and seeds the temporary database on startup, so the API behaves exactly as
above on `http://localhost:8080/api`. The database is discarded when the process exits, which
makes this the quickest way to point a frontend at API mode.

---

## Swagger UI

Interactive API docs (reflecting the `/api` base path):

- **Swagger UI:** <http://localhost:8080/api/swagger-ui.html>
- **OpenAPI JSON:** <http://localhost:8080/api/v3/api-docs>

---

## Endpoints with curl examples

All examples assume the seeded demo data. Money is always
`{ "amountMinor": <integer minor units>, "currency": "EUR" }`; domain enums are lowercase.

> **Note:** transaction history and account balances are seeded relative to the
> current date (see [Migrations & seed data](#migrations--seed-data)), so exact
> amounts/dates in the responses below are illustrative — the *shape* is exact.

### Health — `GET /api/health`

```powershell
curl.exe http://localhost:8080/api/health
```

```json
{ "status": "UP", "version": "1.0.0", "profile": "local" }
```

### List accounts — `GET /api/accounts`

```powershell
curl.exe http://localhost:8080/api/accounts
```

```json
[
  {
    "id": "acc-current",
    "name": "Everyday Current",
    "type": "current",
    "maskedIban": "IE29 •••• •••• 4471",
    "balance": { "amountMinor": 318540, "currency": "EUR" },
    "available": { "amountMinor": 303540, "currency": "EUR" },
    "status": "active"
  },
  {
    "id": "acc-savings",
    "name": "Reserve Savings",
    "type": "savings",
    "maskedIban": "IE64 •••• •••• 1902",
    "balance": { "amountMinor": 1284000, "currency": "EUR" },
    "available": { "amountMinor": 1284000, "currency": "EUR" },
    "status": "active"
  },
  {
    "id": "acc-joint",
    "name": "Household Joint",
    "type": "joint",
    "maskedIban": "IE11 •••• •••• 7765",
    "balance": { "amountMinor": 141880, "currency": "EUR" },
    "available": { "amountMinor": 141880, "currency": "EUR" },
    "status": "active"
  }
]
```

### Get one account — `GET /api/accounts/{accountId}`

```powershell
curl.exe http://localhost:8080/api/accounts/acc-current
```

Unknown id → `404`:

```powershell
curl.exe -i http://localhost:8080/api/accounts/acc-nope
```

```json
{ "code": "ACCOUNT_NOT_FOUND", "message": "No account exists with id 'acc-nope'.", "timestamp": "2026-10-27T09:32:53.113Z" }
```

### List cards — `GET /api/cards` (optional `?accountId=`)

```powershell
curl.exe "http://localhost:8080/api/cards?accountId=acc-current"
```

```json
[
  {
    "id": "card-everyday",
    "accountId": "acc-current",
    "label": "Everyday virtual card",
    "holderName": "Elena Vasquez",
    "maskedNumber": "•••• •••• •••• 4218",
    "expiry": "09/29",
    "network": "visa",
    "status": "active"
  }
]
```

### Get one card — `GET /api/cards/{cardId}`

```powershell
curl.exe http://localhost:8080/api/cards/card-household
```

### Update card status — `PATCH /api/cards/{cardId}/status`

```powershell
curl.exe -X PATCH http://localhost:8080/api/cards/card-household/status `
  -H "Content-Type: application/json" `
  -d '{"status":"active"}'
```

```json
{
  "id": "card-household",
  "accountId": "acc-joint",
  "label": "Household virtual card",
  "holderName": "Elena Vasquez",
  "maskedNumber": "•••• •••• •••• 7703",
  "expiry": "04/28",
  "network": "mastercard",
  "status": "active"
}
```

Missing/invalid body → `400` with `details[]`:

```powershell
curl.exe -i -X PATCH http://localhost:8080/api/cards/card-household/status `
  -H "Content-Type: application/json" -d '{}'
```

```json
{
  "code": "VALIDATION_FAILED",
  "message": "The request could not be validated.",
  "timestamp": "2026-10-27T09:32:53.113Z",
  "details": [ { "field": "status", "code": "VALIDATION_FAILED", "message": "must not be null" } ]
}
```

### List transactions — `GET /api/transactions`

Query params: `accountId`, `category` (lowercase, e.g. `groceries`), `direction`
(`debit`/`credit`), `search`, `sort` (`date-desc` default, `date-asc`, `amount-desc`,
`amount-asc`), `page` (default `0`), `size` (default `500`, max `1000`).
Returns a pagination envelope.

```powershell
curl.exe "http://localhost:8080/api/transactions?accountId=acc-current&category=groceries&page=0&size=2"
```

```json
{
  "items": [
    {
      "id": "txn-2026-10-groceries-carrefour",
      "accountId": "acc-current",
      "counterparty": "Carrefour",
      "category": "groceries",
      "bookedAt": "2026-10-21T14:00:00Z",
      "amount": { "amountMinor": 5480, "currency": "EUR" },
      "direction": "debit",
      "status": "completed",
      "reference": null,
      "transferId": null
    }
  ],
  "page": 0,
  "size": 2,
  "totalItems": 12,
  "totalPages": 6
}
```

### Get one transaction — `GET /api/transactions/{transactionId}`

```powershell
curl.exe http://localhost:8080/api/transactions/txn-pending-car-hire
```

### Create a transfer — `POST /api/transfers`

Requires an `Idempotency-Key` header. Debits the source and credits the destination
atomically, writing two balancing ledger rows.

```powershell
curl.exe -i -X POST http://localhost:8080/api/transfers `
  -H "Content-Type: application/json" `
  -H "Idempotency-Key: 11111111-1111-1111-1111-111111111111" `
  -d '{\"sourceAccountId\":\"acc-current\",\"destinationAccountId\":\"acc-savings\",\"amount\":{\"amountMinor\":5000,\"currency\":\"EUR\"},\"reference\":\"Move to savings\"}'
```

`201 Created`, header `Idempotency-Replayed: false`:

```json
{
  "id": "tr-9f2c...",
  "sourceAccountId": "acc-current",
  "destinationAccountId": "acc-savings",
  "amount": { "amountMinor": 5000, "currency": "EUR" },
  "reference": "Move to savings",
  "createdAt": "2026-10-27T09:40:00Z",
  "status": "completed",
  "debitTransactionId": "txn-...",
  "creditTransactionId": "txn-..."
}
```

Replaying the **same key with the same body** → `200 OK`, header `Idempotency-Replayed: true`,
returns the original transfer (no second pair of ledger rows).
Reusing the **same key with a different body** → `409`:

```json
{ "code": "IDEMPOTENCY_KEY_REUSED", "message": "...", "timestamp": "..." }
```

Missing header → `400 IDEMPOTENCY_KEY_REQUIRED`.
Business violations → `422` with the specific code, e.g.:

```powershell
# Same source and destination
curl.exe -i -X POST http://localhost:8080/api/transfers `
  -H "Content-Type: application/json" -H "Idempotency-Key: k-1" `
  -d '{\"sourceAccountId\":\"acc-current\",\"destinationAccountId\":\"acc-current\",\"amount\":{\"amountMinor\":100,\"currency\":\"EUR\"}}'
```

```json
{ "code": "SAME_ACCOUNT", "message": "Source and destination accounts must differ.", "timestamp": "..." }
```

Other business codes (all `422`): `SOURCE_REQUIRED`, `DESTINATION_REQUIRED`,
`SOURCE_NOT_FOUND`, `DESTINATION_NOT_FOUND`, `SOURCE_INELIGIBLE`, `DESTINATION_INELIGIBLE`,
`AMOUNT_REQUIRED`, `AMOUNT_NOT_POSITIVE`, `AMOUNT_PRECISION`, `CURRENCY_MISMATCH`,
`INSUFFICIENT_FUNDS`.

### Get one transfer — `GET /api/transfers/{transferId}`

```powershell
curl.exe http://localhost:8080/api/transfers/tr-9f2c...
```

### Error body shape

Every error uses the contract envelope:

```json
{ "code": "ERROR_CODE", "message": "Human readable message.", "timestamp": "ISO-8601", "details": [ ... ] }
```

`details` is present only for `VALIDATION_FAILED`. Unexpected errors return
`500 INTERNAL_ERROR` with a generic message — **stack traces and SQL are never leaked**.

---

## Migrations & seed data

Flyway runs automatically on startup (`spring.jpa.hibernate.ddl-auto=validate`, so JPA
never touches the schema — Flyway owns it). Migrations live in
`src/main/resources/db/migration/`:

- **`V1__schema.sql`** — tables `account`, `card`, `transaction`, `transfer`,
  `idempotency_record` with PKs, FKs, NOT NULLs, CHECK constraints (enum value lists,
  `amount_minor > 0`), indexes on `transaction(account_id)`, `transaction(booked_at)`,
  `transaction(transfer_id)`, and a **UNIQUE** constraint on `idempotency_record(idempotency_key)`.
- **`V2__seed_demo_data.sql`** — deterministic fictional data for **Elena Vasquez**:
  three accounts (`acc-current`, `acc-savings`, `acc-joint`), two cards
  (`card-everyday` active visa, `card-household` frozen mastercard), ~6 months of
  recurring transaction history across the contract categories, plus one `pending`
  and one `failed` debit on `acc-current`. Dates are **relative to `CURRENT_DATE`**
  (via `generate_series` + `make_interval`) so the history always looks recent.
  Each account's `balance_minor` equals its opening balance plus the sum of all
  `completed` entries; `available_minor` equals `balance_minor` minus pending debit
  holds. This invariant is asserted by `SeedDataIntegrationTest`.

Because these are **versioned** Flyway migrations, they run exactly once — restarting
the app never duplicates seed rows. There is no `CommandLineRunner` re-seeding.

---

## Reset the database

- **Docker:** `docker compose down -v` then `docker compose up -d` (drops the volume),
  and restart the app to re-migrate and re-seed.
- **Native:** drop and recreate the database, then restart the app:
  ```sql
  DROP DATABASE financial_app;
  CREATE DATABASE financial_app OWNER financial_app;
  ```
- To re-run migrations from scratch while keeping the server, clean + migrate via the
  Flyway lifecycle in tests, or simply recreate the database as above. (Flyway `clean`
  is disabled in the running app for safety.)

---

## Concurrency & locking

`POST /api/transfers` executes inside a single `@Transactional` unit:

1. The two account ids are **sorted**, then each is loaded with
   `@Lock(PESSIMISTIC_WRITE)` (`SELECT … FOR UPDATE`). Acquiring locks in a
   deterministic id order makes deadlocks between concurrent transfers impossible.
2. The source `balanceMinor`/`availableMinor` are debited and the destination credited.
3. Exactly **two** `transaction` rows are written sharing the new `transferId`: a
   `debit` on the source (counterparty = destination name) and a `credit` on the
   destination (counterparty = source name), both `category=transfer`, `status=completed`,
   the same `bookedAt`, and the same positive `amountMinor` (signed amounts sum to zero).
4. A `transfer` row is persisted with `debitTransactionId` / `creditTransactionId`.

Any rejected/failed transfer rolls back entirely — no balance change, no ledger rows,
and no idempotency record is persisted for a business rejection (so the caller can fix
and retry with the same key).

`TransferIntegrationTest` proves this with **8 concurrent threads** each attempting to
spend from the same funded account: only the affordable number succeed, the rest get
`INSUFFICIENT_FUNDS`, and the balance never goes negative or over-spends.

---

## Idempotency semantics

- The `Idempotency-Key` header is **required**; absence → `400 IDEMPOTENCY_KEY_REQUIRED`.
- A **request fingerprint** (SHA-256 of
  `sourceAccountId | destinationAccountId | amountMinor | currency | normalised reference`)
  is stored with the key and the resulting transfer id in `idempotency_record`
  (UNIQUE on the key).
- **First success** → `201 Created`, header `Idempotency-Replayed: false`.
- **Replay, matching fingerprint** → `200 OK`, header `Idempotency-Replayed: true`,
  returns the stored transfer (no new ledger rows).
- **Replay, differing fingerprint** → `409 IDEMPOTENCY_KEY_REUSED`.
- **Concurrent race** (two requests with the same key both pass the initial lookup):
  the unique constraint rejects the second insert; the service catches
  `DataIntegrityViolationException` and resolves by re-reading the stored record,
  returning it as a replay.

---

## Testing

Run the full build (unit + web-layer + real-PostgreSQL integration tests):

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.6.10-hotspot"
.\mvnw.cmd clean verify
```

Run only the fast unit + web tests:

```powershell
.\mvnw.cmd test
```

Test layers:

- **Unit** — `MoneyTest` (arithmetic, precision, currency-mismatch guard),
  `TransferPolicyTest` (every business error code, amount-precision rejection).
- **Web layer** — `ApiWebLayerTest` (`@WebMvcTest` + MockMvc): validation `400` shape
  with `details[]`, `404` bodies, `422` business errors, missing idempotency header,
  card status PATCH happy path + unknown card.
- **Integration (real PostgreSQL)** — `SeedDataIntegrationTest`, `TransferIntegrationTest`,
  `TransferHttpIntegrationTest`: boot a genuine **PostgreSQL 16** binary in-process via
  `io.zonky.test:embedded-postgres` (no Docker). They verify transfer success updates both
  balances and writes exactly two balancing ledger rows, insufficient-funds/same-account/
  unknown-account rejection with no side effects, idempotent replay returning the original
  transfer, concurrent over-spend protection, rollback on failure, the seed-data balance
  invariant, and that Flyway migrations apply cleanly from an empty database.

> Database-level row-locking behaviour **is** verified against a real PostgreSQL 16
> engine (zonky embedded-postgres), not an H2 emulation.

---

## Project layout

```
services/banking-api/
├─ pom.xml
├─ mvnw, mvnw.cmd, .mvn/wrapper/maven-wrapper.properties   # Maven wrapper
├─ docker-compose.yml              # postgres:16-alpine for local dev
├─ .env.example                    # env var template (no real secrets)
├─ .gitignore
├─ README.md
└─ src/
   ├─ main/
   │  ├─ java/com/financialapp/banking/
   │  │  ├─ domain/          # Money, Currency, enums, TransferPolicy, domain exceptions, ErrorCode
   │  │  ├─ persistence/     # JPA entities + Spring Data repositories + enum converters
   │  │  ├─ application/     # AccountService, CardService, TransactionService, TransferService, TransferExecutor
   │  │  ├─ api/             # @RestControllers, record DTOs, DtoMapper, GlobalExceptionHandler
   │  │  ├─ config/          # CorsConfig, OpenApiConfig, WebConfig
   │  │  └─ BankingApiApplication.java
   │  └─ resources/
   │     ├─ application.yml
   │     └─ db/migration/    # V1__schema.sql, V2__seed_demo_data.sql
   └─ test/java/com/financialapp/banking/
      ├─ domain/             # MoneyTest, TransferPolicyTest
      ├─ api/                # ApiWebLayerTest
      └─ integration/        # AbstractPostgresIntegrationTest + Seed/Transfer/HTTP integration tests
```

Layering rule: **JPA entities are never returned from controllers** — the `api` layer
maps every entity to an immutable `record` DTO via `DtoMapper`.
