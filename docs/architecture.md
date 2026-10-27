# Architecture

Financial App is a portfolio monorepo containing **two independent frontends** and **one shared
backend**. Every account, card, transaction and transfer is fictional. Nothing here touches a real
payment rail, and there is no authentication beyond a demo-entry screen.

---

## Repository layout

```text
pet-app/
  app/
    angular-web/        Angular 22 SPA  (pre-existing, preserved)
    react-web/          React 19 SPA    (added in this iteration)
  services/
    banking-api/        Spring Boot 3 + PostgreSQL 16 + Flyway
  contracts/
    banking-api.yaml    OpenAPI 3.1 — the authoritative API contract
  docs/
    architecture.md     this document
    api.md              API reference
    media/              generated screenshots
  .github/workflows/
    ci.yml              lint · typecheck · unit · build · e2e · mvn verify
```

> **Deviation from the suggested layout.** The brief proposed `apps/`. The repository already used
> `app/`, and the Angular project already lived at `app/angular-web/`. Moving a working application
> for cosmetic symmetry would have rewritten paths across `angular.json`, both e2e suites and the
> existing README for no functional gain, so the existing directory name was kept and the React
> application was placed beside it at `app/react-web/`.

The two frontends are fully independent npm projects: separate `package.json`, separate lockfile,
separate `node_modules`, separate test and build commands. There is no root workspace, because
neither project shares runtime code with the other. What they *do* share is the OpenAPI contract and
a deterministic seed dataset re-implemented identically on each side.

---

## Layered design (identical in both frontends)

Both SPAs follow the same four-layer shape with a single direction of dependency:

```text
features ──▶ application ──▶ domain
                 │
                 ▼
               data ──▶ (demo adapter | http adapter)
```

| Layer | Angular | React | Responsibility |
|---|---|---|---|
| `domain/` | `src/app/domain/` | `src/domain/` | Framework-free models, `Money`, transfer policy, analytics. No imports from any other layer. |
| `data/` | `src/app/data/` | `src/data/` | `BankingDataSource` implementations: demo (localStorage) and HTTP (Spring Boot). |
| `application/` | `src/app/application/` | `src/application/` | Canonical state + use cases. Angular: NgRx Signal Store. React: a context-backed store with `useSyncExternalStore`-style selectors. |
| `features/` | `src/app/features/` | `src/features/` | Routed pages and feature UI only. No HTTP, no mode branching. |

Shared presentation lives in `shared/ui` (generic: buttons, chips, dialogs, skeletons),
`shared/ledger` (domain-aware: account cards, transaction rows) and `shared/charts` (ECharts
wrappers).

### Why the domain layer is duplicated, not shared

A shared runtime package would force both apps onto one build pipeline and one TypeScript target,
and would make the React app depend on Angular's repository. The brief explicitly forbids that
coupling. Instead the **behaviour** is kept in parity by:

- the same OpenAPI contract (`contracts/banking-api.yaml`),
- the same deterministic seed data (same IDs, amounts, dates and categories),
- the same stable error codes (`SAME_ACCOUNT`, `INSUFFICIENT_FUNDS`, …),
- the same translation key tree, asserted by tests,
- and e2e suites that assert the same user journeys against both apps.

---

## Data access: one interface, two adapters

```text
Angular UI ──▶ Angular Signal Store ──┐
                                      ├── DemoBankingDataSource  ──▶ localStorage
                                      │
React UI ─────▶ React banking store ──┴── HttpBankingDataSource  ──▶ Spring Boot ──▶ PostgreSQL
```

Both apps resolve exactly one `BankingDataSource` at the application boundary, driven by build
configuration:

| | Demo mode | API mode |
|---|---|---|
| Angular | default `ng build` / `ng serve` | `npm run start:api` / `npm run build:api` — `angular.json` `fileReplacements` swaps `environment.ts` for `environment.api.ts` |
| React | default `vite build` | `VITE_DATA_MODE=api`, `VITE_API_BASE_URL=http://localhost:8080/api` |

Feature components never branch on the mode. They call use cases; the use cases call the injected
data source. The only mode-aware UI is cosmetic: the "Connected to the local API" badge, and the
reset-demo button, which is shown when `dataSource.supportsReset` is true.

**There is no automatic fallback.** If the API is unreachable in API mode, both apps render an
explicit failure panel with a retry action. Silently serving local demo data as if it came from the
server would let a user believe a transfer succeeded when it did not.

### Demo mode

- Deterministic seed: 3 accounts, 2 virtual cards, ~97 transactions across 6 months.
- Mutations (transfers, card freeze/unfreeze) are applied by the same domain policy the backend
  enforces, then written to `localStorage` under a versioned key.
- Malformed or outdated stored state is discarded and the seed is restored rather than throwing.
- A reset action restores the seed.
- `localStorage` is a convenience, never a security boundary.

### API mode

The backend is authoritative and re-validates everything. The HTTP adapter maps the contract's
error codes onto the same typed domain errors the demo adapter raises, so the UI renders identical
messages in both modes.

---

## Money model

```ts
type Money = { amountMinor: number; currency: string };
```

Money is integer minor units plus an explicit ISO currency code, everywhere: TypeScript domain,
JSON payloads, and `BIGINT` columns in PostgreSQL. Floating point never holds an authoritative
value. User input is parsed and validated before conversion to minor units, and formatting happens
only at the presentation boundary via `Intl.NumberFormat` (`en-IE` / `uk-UA`). Currency mismatches
are rejected rather than coerced.

### Double-entry transfers

One successful transfer always produces exactly **two** transactions sharing a `transferId`: a
`debit` on the source account and a `credit` on the destination. `amountMinor` stays positive; the
`direction` field carries the sign. The pair nets to zero, so account balances and the ledger stay
consistent. Analytics exclude entries carrying a `transferId`, so moving money between your own
accounts does not inflate income or spending.

### Idempotency

The frontend generates a transfer request ID when the user reaches the **review** step and sends it
as `Idempotency-Key`. Replaying the same key with the same payload returns the original transfer
(`Idempotency-Replayed: true`). Replaying it with a different payload fails with
`IDEMPOTENCY_KEY_REUSED` instead of silently executing a different transfer. The demo adapter
implements the same rule locally, so double submission cannot duplicate a transfer in either mode.

---

## Backend

Spring Boot 3.5 / Java 17 / Spring Web MVC / Spring Data JPA / Bean Validation / Flyway /
springdoc-openapi, served under the `/api` context path.

- Typed request and response DTOs; JPA entities are never exposed.
- Flyway owns the schema and the deterministic seed, so a clean database produces a working app and
  restarting never duplicates seed rows.
- Transfers run in a single database transaction. Both account rows are selected with a pessimistic
  write lock in a deterministic order (by account ID) to avoid deadlocks, so concurrent requests
  cannot spend the same balance twice. Debit and credit entries are committed together or not at
  all.
- `@RestControllerAdvice` converts domain and validation failures into a consistent error body with
  a stable machine-readable code and a safe message — no stack traces or internals leak.
- CORS is restricted to the configured local frontend origins (4200, 4280, 5173, 5273).
- Credentials come from environment variables; `.env.example` is a template with no real values.

See [`services/banking-api/README.md`](../services/banking-api/README.md) for the full backend
guide and [`docs/api.md`](api.md) for the endpoint reference.

---

## Internationalisation

English (`en`) and Ukrainian (`ua`), switched at runtime with no page reload, persisted in
`localStorage`, with the `<html lang>` attribute kept in sync. Angular uses its existing signal-based
translation service and a `TitleStrategy` that resolves route titles as translation keys; React uses
`react-i18next`. Both dictionaries are typed and share the same key tree, which a test asserts.

The application's own code for Ukrainian is `ua`. The registered ISO-639-1 subtag is `uk`, which is
what browsers, screen readers and `Intl` recognise, so the app code is mapped rather than reused:
`LANGUAGE_HTML_TAG` resolves `ua → uk` for the `<html lang>` attribute and `LANGUAGE_LOCALE`
resolves `ua → uk-UA` for every `Intl` formatter. Both maps exist in each frontend's `i18n`
module.

---

## Quality gates

| | Angular | React |
|---|---|---|
| Lint | `npm run lint` | `npm run lint` + `npm run lint:styles` |
| Types | `npm run typecheck` (4 tsconfigs) | `npm run typecheck` |
| Format | `npm run format:check` | `npm run format:check` |
| Unit / component | Vitest + Spectator — 96 tests | Vitest + Testing Library — 118 tests |
| E2E | Playwright (7) + Cypress (6) | Playwright (7) |
| Backend | `./mvnw clean verify` — 47 tests against embedded PostgreSQL | |

`npm run lint:styles` is React-specific and deliberate. Angular's component styles are encapsulated;
React's are not, so a class name declared in two feature stylesheets silently overrides across the
whole app depending on bundle order. `app/react-web/tools/class-collisions.mjs` fails the build if
any class is declared in more than one SCSS file.
