# API reference

Base URL (local development): **`http://localhost:8080/api`**

The authoritative machine-readable definition is [`contracts/banking-api.yaml`](../contracts/banking-api.yaml)
(OpenAPI 3.1). When the service is running, the same contract is browsable at:

- Swagger UI — <http://localhost:8080/api/swagger-ui.html>
- OpenAPI JSON — <http://localhost:8080/api/v3/api-docs>

This service is a **fictional simulation** for a portfolio project. It holds no real accounts,
cards or payment credentials, processes no payments and makes no claim to meet banking security or
regulatory requirements.

---

## Money

Every monetary value is an object with an **integer amount in the currency's minor unit** and an
explicit ISO-4217 code:

```json
{ "amountMinor": 1234, "currency": "EUR" }
```

`1234` EUR minor units is €12.34. Floating point is never authoritative. `amountMinor` is signed for
balances and always **positive** for transactions and transfers — the `direction` field
(`debit` / `credit`) carries the sign. Supported currencies and precision: `EUR` (2), `GBP` (2).

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness and build info |
| `GET` | `/accounts` | List the demo persona's accounts |
| `GET` | `/accounts/{accountId}` | One account |
| `GET` | `/cards` | List cards, optional `?accountId=` |
| `GET` | `/cards/{cardId}` | One card |
| `PATCH` | `/cards/{cardId}/status` | Freeze / unfreeze a card |
| `GET` | `/transactions` | Search, filter, sort and page the ledger |
| `GET` | `/transactions/{transactionId}` | One ledger entry |
| `POST` | `/transfers` | Execute an internal transfer (idempotent) |
| `GET` | `/transfers/{transferId}` | One transfer |

### `GET /health`

```bash
curl http://localhost:8080/api/health
```

```json
{ "status": "UP", "version": "1.0.0", "profile": "local" }
```

`profile` reports the active Spring profile, so it reads `local` when you run with the local
profile and `default` when you run `./mvnw spring-boot:test-run`.

### `GET /accounts`

```bash
curl http://localhost:8080/api/accounts
```

```json
[
  {
    "id": "acc-current",
    "name": "Everyday Current",
    "type": "current",
    "maskedIban": "IE29 •••• •••• 4471",
    "balance": { "amountMinor": 1348341, "currency": "EUR" },
    "available": { "amountMinor": 1333341, "currency": "EUR" },
    "status": "active"
  }
]
```

`type` is one of `current`, `savings`, `joint`. `status` is `active` or `closed`; only `active`
accounts are eligible for transfers. `balance` is the booked balance; `available` is the booked
balance minus pending debit holds, and it is what a transfer spends from.

### `GET /cards`

```bash
curl "http://localhost:8080/api/cards?accountId=acc-current"
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

Card numbers are masked, fictional and deliberately not usable as payment credentials.

### `PATCH /cards/{cardId}/status`

```bash
curl -X PATCH http://localhost:8080/api/cards/card-everyday/status \
  -H "Content-Type: application/json" \
  -d '{"status":"frozen"}'
```

Valid transitions are `active → frozen` and `frozen → active`. The response is the updated card.
An unknown ID returns `404 CARD_NOT_FOUND`; an unknown status value returns
`400 VALIDATION_FAILED`.

### `GET /transactions`

Filters combine with AND. `search` matches the counterparty or the reference, case-insensitively.
Ordering is deterministic: the chosen sort key, then transaction ID as a tie-breaker.

| Query parameter | Values | Default |
|---|---|---|
| `accountId` | account ID | all accounts |
| `category` | `groceries`, `transport`, `dining`, … | all |
| `direction` | `debit`, `credit` | both |
| `search` | free text, ≤ 120 chars | — |
| `sort` | `date-desc`, `date-asc`, `amount-desc`, `amount-asc` | `date-desc` |
| `page` | integer ≥ 0 | `0` |
| `size` | 1–1000 | `500` |

```bash
curl "http://localhost:8080/api/transactions?direction=debit&category=groceries&sort=amount-desc&size=20"
```

```json
{
  "items": [
    {
      "id": "txn-2026-07-groceries-ah",
      "accountId": "acc-current",
      "counterparty": "Albert Heijn",
      "category": "groceries",
      "bookedAt": "2026-07-05T08:00:00Z",
      "amount": { "amountMinor": 7308, "currency": "EUR" },
      "direction": "debit",
      "status": "completed"
    }
  ],
  "page": 0,
  "size": 20,
  "totalItems": 18,
  "totalPages": 1
}
```

Entries created by an internal transfer also carry `transferId`. Both frontends exclude those from
income and spending analytics so that moving money between your own accounts does not inflate
totals.

### `POST /transfers`

Transfers are allowed **between the demo persona's own accounts only**. The `Idempotency-Key`
header is required.

```bash
curl -X POST http://localhost:8080/api/transfers \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 6f1c2b84-5f0d-4a4b-9f1a-5a1d2c3e4f50" \
  -d '{
        "sourceAccountId": "acc-current",
        "destinationAccountId": "acc-savings",
        "amount": { "amountMinor": 25000, "currency": "EUR" },
        "reference": "Monthly saving"
      }'
```

`201 Created`:

```json
{
  "id": "transfer-732dd6f1-3dc3-4f2d-a303-dd04fc5d351e",
  "sourceAccountId": "acc-current",
  "destinationAccountId": "acc-savings",
  "amount": { "amountMinor": 25000, "currency": "EUR" },
  "reference": "Monthly saving",
  "createdAt": "2026-10-27T10:57:45.639Z",
  "status": "completed",
  "debitTransactionId": "txn-8fcea47b-62e2-4ca1-94be-fa9aba605a3e",
  "creditTransactionId": "txn-50624be2-0b80-43f3-a225-2adcfff66e73"
}
```

Server-side validation, in the order the codes are reported:

| Rule | Error code | Status |
|---|---|---|
| Malformed body, unknown enum value, field constraint violated | `VALIDATION_FAILED` | 400 |
| `Idempotency-Key` header missing | `IDEMPOTENCY_KEY_REQUIRED` | 400 |
| Source missing / unknown | `SOURCE_REQUIRED` / `SOURCE_NOT_FOUND` | 422 |
| Destination missing / unknown | `DESTINATION_REQUIRED` / `DESTINATION_NOT_FOUND` | 422 |
| Source equals destination | `SAME_ACCOUNT` | 422 |
| Account not eligible (e.g. closed) | `SOURCE_INELIGIBLE` / `DESTINATION_INELIGIBLE` | 422 |
| Amount missing or not positive | `AMOUNT_REQUIRED` / `AMOUNT_NOT_POSITIVE` | 422 |
| Amount has more precision than the currency allows | `AMOUNT_PRECISION` | 422 |
| Currency differs from either account | `CURRENCY_MISMATCH` | 422 |
| Available balance too low | `INSUFFICIENT_FUNDS` | 422 |
| Key replayed with a different payload | `IDEMPOTENCY_KEY_REUSED` | 409 |

`400` is reserved for requests that are malformed as HTTP payloads; a syntactically valid request
that breaks a business rule is `422 Unprocessable Content`, including unknown account references,
which are a property of the submitted transfer rather than of the requested URL. Direct resource
lookups such as `GET /accounts/{id}` do return `404`.

The whole operation runs in one database transaction. Both account rows are locked with a
pessimistic write lock in a deterministic order, so concurrent requests cannot spend the same
balance twice. The debit and credit entries are committed together or not at all; a rejected
transfer leaves balances and the ledger untouched.

#### Idempotency semantics

- The client generates the key when the user reaches the transfer **review** step, so a double
  submit of the same reviewed transfer reuses one key.
- Scope: global per key value, retained for the lifetime of the stored row.
- First use → `201 Created`.
- Replay with an **equivalent** payload → `200 OK` plus `Idempotency-Replayed: true`, returning the
  original transfer. No second pair of ledger entries and no balance change.
- Replay with a **different** payload → `409 IDEMPOTENCY_KEY_REUSED`. The API never silently
  executes a different transfer under a reused key.

Demo mode applies the same rule locally, so double submission cannot duplicate a transfer in either
operating mode.

---

## Error format

Every non-2xx response shares one shape:

```json
{
  "code": "VALIDATION_FAILED",
  "message": "The request could not be validated.",
  "timestamp": "2026-10-27T11:00:50.486Z",
  "details": [
    { "field": "reference", "code": "VALIDATION_FAILED", "message": "The reference is too long." }
  ]
}
```

`code` is stable and machine-readable; the frontends map it to a translated message. `message` is a
safe English fallback and never contains stack traces or implementation details. `details` is
present only for field-level validation failures, each entry carrying `field`, `code` and an
optional `message`; it is omitted entirely otherwise:

```json
{
  "code": "INSUFFICIENT_FUNDS",
  "message": "Not enough available funds in the source account.",
  "timestamp": "2026-10-27T10:58:01.457Z"
}
```

Full code list: `VALIDATION_FAILED`, `ACCOUNT_NOT_FOUND`, `CARD_NOT_FOUND`,
`TRANSACTION_NOT_FOUND`, `TRANSFER_NOT_FOUND`, `IDEMPOTENCY_KEY_REQUIRED`,
`IDEMPOTENCY_KEY_REUSED`, `SOURCE_REQUIRED`, `DESTINATION_REQUIRED`, `SAME_ACCOUNT`,
`SOURCE_NOT_FOUND`, `DESTINATION_NOT_FOUND`, `SOURCE_INELIGIBLE`, `DESTINATION_INELIGIBLE`,
`AMOUNT_REQUIRED`, `AMOUNT_NOT_POSITIVE`, `AMOUNT_PRECISION`, `CURRENCY_MISMATCH`,
`INSUFFICIENT_FUNDS`, `INTERNAL_ERROR`.

The transfer-specific codes are identical to the codes each frontend's local demo policy produces,
which is what lets the UI render the same translated message in demo mode and in API mode.

---

## CORS

The service accepts browser requests only from the configured local frontend origins:
`http://localhost:4200` and `http://localhost:4280` (Angular dev and e2e) and
`http://localhost:5173` and `http://localhost:5273` (React dev and e2e). Add origins through
configuration rather than widening the default.
