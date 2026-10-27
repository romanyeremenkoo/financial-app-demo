# Financial App — React frontend

The React implementation of **Financial App**, a fictional personal-banking SPA. It is an
independent application: it shares no runtime code with the Angular implementation in
[`../angular-web`](../angular-web), but ships the same five feature areas, the same design tokens,
the same business rules and the same EN/UA copy.

See the [root README](../../README.md) for the product overview, screenshots and deployment, and
[docs/architecture.md](../../docs/architecture.md) for the full design.

**[▶ Live demo](https://financial-app-demo-react.roman-yeremenko-o.workers.dev/)** — the Angular
build of the same product is at
**[financial-app-demo](https://financial-app-demo.roman-yeremenko-o.workers.dev/)**.

## Stack

React 19 · TypeScript (strict) · Vite · React Router 8 · React Hook Form + Zod · ECharts ·
`react-i18next` · SCSS with shared design tokens · Vitest + Testing Library · Playwright.

## Run it

```bash
npm install
npm start          # http://localhost:5173 — demo mode, no backend required
```

Click **Enter demo** on the welcome screen; there is nothing to sign up for.

To run against the shared [Banking API](../../services/banking-api), start the backend and create
`.env.local`:

```ini
VITE_DATA_MODE=api
VITE_API_BASE_URL=http://localhost:8080/api
```

Never put secrets in `VITE_*` variables — Vite inlines them into the client bundle. If the API is
unreachable the app says so and offers a retry; it never falls back to demo data silently.

## Commands

| Command                 | Purpose                                                  |
| ----------------------- | -------------------------------------------------------- |
| `npm start`             | Dev server on port 5173                                  |
| `npm run build`         | Typecheck and production build into `dist/`              |
| `npm run preview`       | Serve the production build locally                       |
| `npm test`              | Unit and component tests (Vitest), single run            |
| `npm run test:watch`    | Tests in watch mode                                      |
| `npm run test:coverage` | Tests with coverage                                      |
| `npm run lint`          | ESLint over TypeScript, JSX and a11y rules               |
| `npm run lint:styles`   | Fail if any SCSS class is declared in more than one file |
| `npm run typecheck`     | `tsc -b --noEmit`                                        |
| `npm run format`        | Prettier write (`format:check` to verify)                |
| `npm run e2e`           | Playwright suite (boots its own server on port 5273)     |
| `npm run e2e:install`   | One-off Playwright browser download                      |

## Why `lint:styles`

Angular encapsulates component styles; React does not. A class name declared in two feature
stylesheets silently overrides across the whole application depending on bundle order — which is
exactly how an unrelated dialog's `.amount` rule once resized every monetary value on the dashboard.
`tools/class-collisions.mjs` scans every SCSS file and fails if a class is declared more than once,
so that class of bug cannot come back.

## Layout

```text
src/
  app/          router, providers, runtime config
  domain/       framework-free models, money, transfer policy, analytics
  data/         demo (localStorage) and HTTP adapters behind one interface
  application/  canonical state, hooks and use cases
  features/     routed pages: dashboard, accounts, cards, transactions, transfers, analytics
  shared/       ui, ledger, charts, layout, utilities
  i18n/         typed EN/UA dictionaries
  styles/       design tokens and global styles
```

Dependencies flow one way: `features → application → domain`. Feature components never issue HTTP
requests and never branch on the operating mode.

## Deployment

Deployed to **Cloudflare Workers** static assets at
**<https://financial-app-demo-react.roman-yeremenko-o.workers.dev/>**, redeploying automatically on
every push to `main`. `npm run build` emits `dist/`, and the SPA history fallback comes from
`not_found_handling: "single-page-application"` in [`wrangler.jsonc`](wrangler.jsonc).

> Do not add a `_redirects` file here. On Workers static assets a `/* /index.html 200` rule collides
> with the built-in HTML handling, and the deploy is rejected with an
> `Invalid _redirects configuration` error about an infinite redirect loop. The `postbuild` hook
> ([`tools/strip-cf-asset-config.mjs`](tools/strip-cf-asset-config.mjs)) strips `_redirects` and
> `_headers` from the build output for that reason. On hosts other than Workers, configure the
> equivalent rewrite to `index.html`.
