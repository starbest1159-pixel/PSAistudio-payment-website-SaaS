# PSAiPay

A modular payment platform and SaaS-style dashboard for managing merchants, transactions, deposits, withdrawals, risk checks, ledger entries, and payment flows.

This repository is organized as a Turbo monorepo and includes:

- `artifacts/api-server` — Express + TypeScript API service
- `artifacts/psai-dashboard` — React + Vite dashboard UI
- `artifacts/consolidated` — consolidated app wrapper
- `docs/` — implementation and flow documentation

## Overview

PSAiPay is designed to support a complete payment workflow, including:

- merchant onboarding and account management
- transaction and deposit lifecycle tracking
- withdrawal request handling
- risk and compliance checks
- ledger and audit reporting
- QR and slip-based payment flows
- webhook-driven status updates
- admin dashboard monitoring

## Tech stack

- TypeScript
- Node.js + Express
- React + Vite
- Turbo Repo + pnpm workspaces
- Drizzle ORM + PostgreSQL-ready data layer
- Ant Design for dashboard UI

## Repository structure

```text
.
├── artifacts/
│   ├── api-server/
│   ├── consolidated/
│   └── psai-dashboard/
├── docs/
├── ARCHITECTURE.md
├── PROJECT_OVERVIEW.md
├── USER_GUIDE.md
├── INSTALL_COPILOT.md
├── SECURITY.md
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (for persistence-backed environments)

### Install dependencies

```bash
pnpm install
```

### Run the apps

From the repository root:

```bash
pnpm dev
```

This runs the monorepo scripts defined in the root `package.json`.

To run individual apps directly:

```bash
pnpm --filter @psaipay/api-server dev
pnpm --filter @psaipay/dashboard dev
```

### Build

```bash
pnpm build
```

### Start the API server

```bash
pnpm --filter @psaipay/api-server build
pnpm --filter @psaipay/api-server start
```

## API entry points

The API server mounts a collection of resource routers under `/api`, including:

- `/api/auth`
- `/api/merchants`
- `/api/transactions`
- `/api/deposits`
- `/api/withdrawals`
- `/api/risk`
- `/api/ledger`
- `/api/dashboard`
- `/api/bot`
- `/api/qr`
- `/api/slip`
- `/api/banks`
- `/api/webhooks`
- `/api/settings`
- `/api/integration`

The app exposes a health check at:

```bash
GET /health
```

## Documentation

Useful project documentation is included in the repository:

- `PROJECT_OVERVIEW.md` — system overview and business/technical context
- `ARCHITECTURE.md` — architecture and design decisions
- `USER_GUIDE.md` — user/operator guidance
- `docs/COMPLETE_DOCUMENTATION.md` — end-to-end documentation
- `docs/FLOW_PAYMENT.mmd` — payment flow diagram
- `docs/IMPLEMENTATION_FROM_CODE.md` — implementation notes derived from code

## Development notes

- Use `turbo` to orchestrate the workspace build and run pipeline.
- Keep API, dashboard, and service boundaries explicit to preserve a cleaner monorepo architecture.
- Prefer shared conventions and route-level organization for new payment features.

## License

This project is intended for internal and product-development use unless otherwise noted in repository-specific licensing files.

## Contact

For issues, feature requests, or onboarding questions, open an issue in this repository or use the project’s existing maintainer channels.
